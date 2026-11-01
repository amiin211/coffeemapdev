// Greening simulator for the Riyadh Urban Heat dashboard. Everything runs in
// the browser on the same ~70 m grid as src/lib/urbanHeat.ts:
//
//   1. Cooling model: ordinary least squares fitted to the loaded city,
//        LST ≈ b0 + b1·canopy(cell) + b2·canopy(300 m) + b3·built density + b4·elevation
//      so the cooling a tree buys is learned from Riyadh's own Landsat data.
//   2. Interventions: street-tree planting and pocket parks raise canopy in a
//      circle; cool roofs & pavements lower built-up surface temperature.
//   3. Auto-planner: places a tree budget on the built-up cells with the
//      highest heat risk × (1 − vegetation access).
//   4. Re-scoring: new canopy -> new access, heat and risk -> equity and
//      priority before/after, trees, water, indicative cost, and progress
//      against Green Riyadh targets.
//
// Screening-level estimates for planning conversations, not a design.

import { Grid, boxBlur, clamp01, distanceTransform, rasterizePolygon, toDataUrl, rampColor, toGridPx, cellLon } from '@/lib/geoRaster';
import { DISTRICTS, Layers, ParkCollection, Results, Weights, accessAt, heatAt } from '@/lib/urbanHeat';

// ----------------------------------------------------------------- targets --
// Green Riyadh (Royal Commission for Riyadh City), by 2030.
export const GREEN_RIYADH = {
  trees: 7_500_000,
  greenCoverPct: 9, // of the city's area (from about 1.5%)
  greenCoverStartPct: 1.5,
  perCapitaM2: 28, // green space per resident (from 1.7 m²)
};

// Indicative planning assumptions (shown in the UI).
export const TREE_CROWN_M2 = 50; // mature shade tree, ~8 m crown
export const TREE_WATER_L_DAY: [number, number] = [25, 75]; // drip-irrigated native species
export const TREE_COST_SAR: [number, number] = [600, 1500]; // supply, plant, drip line, 2-yr establishment
export const PARK_COST_SAR_M2: [number, number] = [250, 600];
export const COOL_ROOF_COST_SAR_M2: [number, number] = [40, 90];
export const COOL_ROOF_DLST = -2.0; // °C on a fully built cell (screening value)
export const PARK_CANOPY = 0.8;
const CANOPY_RADIUS = 300; // m, matches urbanHeat.ts
const ACCESS_CANOPY_FULL = 0.25;
const TREE_SCALE = 200;
const PARK_SCALE = 500;
// Fallback when the city's own data shows no canopy cooling: −0.4 °C per +10% canopy.
const FALLBACK_COOLING = -4;

// ------------------------------------------------------------ cooling model --
export interface CoolingModel {
  coef: { intercept: number; canopy: number; canopyNearby: number; built: number; elevation: number };
  r2: number;
  rmse: number;
  n: number;
  /** °C change of a cell when its own and its neighbourhood canopy rise by +10 points. */
  per10: number;
  fallback: boolean;
  elevMean: number;
}

// Solves the normal equations (XᵀX) b = Xᵀy by Gaussian elimination.
function solve(A: number[][], b: number[]) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    if (Math.abs(M[c][c]) < 1e-12) return null;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / M[i][i]);
}

export function fitCoolingModel(L: Layers): CoolingModel {
  const n = L.lst.length;
  const hasDem = !!L.dem;
  let elevSum = 0, elevN = 0;
  if (L.dem) for (let k = 0; k < n; k += 7) if (L.urban[k] && Number.isFinite(L.dem[k])) { elevSum += L.dem[k]; elevN++; }
  const elevMean = elevN ? elevSum / elevN : 0;
  const p = hasDem ? 5 : 4;
  const XtX = Array.from({ length: p }, () => new Array(p).fill(0));
  const Xty = new Array(p).fill(0);
  const rows: { x: number[]; y: number }[] = [];
  for (let k = 0; k < n; k += 2) {
    if (!L.urban[k] || !Number.isFinite(L.lst[k])) continue;
    const x = [1, L.canopy[k], L.canopyNearby[k], L.builtDensity[k]];
    if (hasDem) x.push(Number.isFinite(L.dem![k]) ? (L.dem![k] - elevMean) / 100 : 0);
    const y = L.lst[k];
    for (let i = 0; i < p; i++) {
      Xty[i] += x[i] * y;
      for (let j = 0; j < p; j++) XtX[i][j] += x[i] * x[j];
    }
    if (rows.length < 200_000) rows.push({ x, y });
  }
  const b = rows.length > 50 ? solve(XtX, Xty) : null;
  const coefArr = b ?? [rows.reduce((s, r) => s + r.y, 0) / Math.max(1, rows.length), 0, 0, 0, 0];
  const my = rows.reduce((s, r) => s + r.y, 0) / Math.max(1, rows.length);
  let ssr = 0, sst = 0;
  for (const r of rows) {
    const pred = r.x.reduce((s, v, i) => s + v * coefArr[i], 0);
    ssr += (r.y - pred) ** 2;
    sst += (r.y - my) ** 2;
  }
  const coef = { intercept: coefArr[0], canopy: coefArr[1], canopyNearby: coefArr[2], built: coefArr[3], elevation: hasDem ? coefArr[4] : 0 };
  const raw10 = 0.1 * (coef.canopy + coef.canopyNearby);
  const fallback = !(raw10 < -0.02);
  return {
    coef,
    r2: sst > 0 ? 1 - ssr / sst : 0,
    rmse: rows.length ? Math.sqrt(ssr / rows.length) : NaN,
    n: rows.length,
    per10: fallback ? 0.1 * FALLBACK_COOLING : raw10,
    fallback,
    elevMean,
  };
}

// Cooling coefficients actually applied (never warming).
function coolingCoefs(m: CoolingModel) {
  if (m.fallback) return { cell: FALLBACK_COOLING * 0.4, nearby: FALLBACK_COOLING * 0.6 };
  return { cell: Math.min(0, m.coef.canopy), nearby: Math.min(0, m.coef.canopyNearby) };
}

// ------------------------------------------------------------ interventions --
export type InterventionKind = 'trees' | 'park' | 'coolroof';

export interface Intervention {
  id: number;
  kind: InterventionKind;
  lon: number;
  lat: number;
  radius: number; // m
  boost: number; // trees: canopy points added (0..1); coolroof: share of roofs treated
}

export const KIND_COLOR: Record<InterventionKind, string> = { trees: '#2E7D32', park: '#00897B', coolroof: '#1E88E5' };

// Cells (k) within `radius` metres of a point.
function cellsInCircle(g: Grid, lon: number, lat: number, radius: number, visit: (k: number, w: number) => void) {
  const [cx, cy] = toGridPx(g, lon, lat);
  const j0 = Math.max(0, Math.min(g.height - 1, Math.floor(cy)));
  const r = radius / g.rowCellSize[j0];
  for (let j = Math.max(0, Math.floor(cy - r)); j <= Math.min(g.height - 1, Math.ceil(cy + r)); j++) {
    for (let i = Math.max(0, Math.floor(cx - r)); i <= Math.min(g.width - 1, Math.ceil(cx + r)); i++) {
      const d = Math.hypot(i + 0.5 - cx, j + 0.5 - cy);
      if (d <= r) visit(j * g.width + i, d / r);
    }
  }
}

export interface Plan {
  dCanopy: Float32Array; // canopy added per cell (0..1)
  roof: Float32Array; // share of built surface treated with cool roofs / pavements
  parkSeeds: Uint8Array | null; // new park cells
  parkM2: number;
  roofM2: number;
}

const cellArea = (g: Grid, k: number) => g.rowCellSize[Math.floor(k / g.width)] ** 2;

export function planFromInterventions(g: Grid, L: Layers, list: Intervention[], base?: Plan): Plan {
  const n = L.lst.length;
  const plan: Plan = base
    ? { dCanopy: Float32Array.from(base.dCanopy), roof: Float32Array.from(base.roof), parkSeeds: base.parkSeeds ? Uint8Array.from(base.parkSeeds) : null, parkM2: base.parkM2, roofM2: base.roofM2 }
    : { dCanopy: new Float32Array(n), roof: new Float32Array(n), parkSeeds: null, parkM2: 0, roofM2: 0 };
  for (const iv of list) {
    cellsInCircle(g, iv.lon, iv.lat, iv.radius, (k) => {
      if (L.landCover[k] === 80) return; // open water
      const c = L.canopy[k] + plan.dCanopy[k];
      if (iv.kind === 'trees') {
        // Street trees: only where people live (built-up neighbourhoods), up to 60% canopy.
        if (!L.urban[k]) return;
        plan.dCanopy[k] += Math.max(0, Math.min(0.6, c + iv.boost) - c);
      } else if (iv.kind === 'park') {
        plan.dCanopy[k] += Math.max(0, PARK_CANOPY - c);
        plan.parkSeeds ??= new Uint8Array(n);
        if (!plan.parkSeeds[k]) { plan.parkSeeds[k] = 1; plan.parkM2 += cellArea(g, k); }
      } else if (L.urban[k]) {
        const add = Math.max(0, Math.min(1, plan.roof[k] + iv.boost) - plan.roof[k]);
        plan.roof[k] += add;
        plan.roofM2 += add * L.builtDensity[k] * cellArea(g, k);
      }
    });
  }
  return plan;
}

// ------------------------------------------------------------ auto-planner --
export interface Site {
  lon: number;
  lat: number;
  trees: number;
  cells: number;
  district: string;
  districtAr: string;
}

const AUTO_TARGET_CANOPY = 0.35; // street-tree canopy a planted cell is brought up to

// Places `trees` on the built-up cells ranked by risk × (1 − access), each
// brought up to AUTO_TARGET_CANOPY, and groups them into sites.
export function autoPlan(g: Grid, L: Layers, R: Results, trees: number): { plan: Plan; sites: Site[] } {
  const n = L.lst.length;
  const cand: { k: number; s: number }[] = [];
  for (let k = 0; k < n; k++) {
    if (!L.urban[k] || !Number.isFinite(R.equity[k]) || L.canopy[k] >= AUTO_TARGET_CANOPY) continue;
    cand.push({ k, s: R.risk[k] * (1 - accessAt(L, k)) });
  }
  cand.sort((a, b) => b.s - a.s);
  const dCanopy = new Float32Array(n);
  let left = trees;
  const chosen = new Uint8Array(n);
  for (const { k } of cand) {
    if (left <= 0) break;
    const add = AUTO_TARGET_CANOPY - L.canopy[k];
    const capacity = (add * cellArea(g, k)) / TREE_CROWN_M2;
    const use = Math.min(capacity, left);
    dCanopy[k] = (use * TREE_CROWN_M2) / cellArea(g, k);
    left -= use;
    chosen[k] = 1;
  }
  // Group chosen cells into sites (8-connected components).
  const seen = new Uint8Array(n);
  const sites: Site[] = [];
  const stack: number[] = [];
  for (let k0 = 0; k0 < n; k0++) {
    if (!chosen[k0] || seen[k0]) continue;
    let cells = 0, sx = 0, sy = 0, tr = 0;
    stack.push(k0);
    seen[k0] = 1;
    while (stack.length) {
      const k = stack.pop()!;
      const i = k % g.width, j = (k / g.width) | 0;
      cells++; sx += i + 0.5; sy += j + 0.5;
      tr += (dCanopy[k] * cellArea(g, k)) / TREE_CROWN_M2;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= g.width || jj >= g.height) continue;
        const kk = jj * g.width + ii;
        if (chosen[kk] && !seen[kk]) { seen[kk] = 1; stack.push(kk); }
      }
    }
    const ci = sx / cells, cj = sy / cells;
    const lon = cellLon(g, ci - 0.5);
    const lat = g.rowLat[Math.min(g.height - 1, Math.max(0, Math.round(cj - 0.5)))];
    const near = DISTRICTS.reduce((best, d) => (Math.hypot(d.lon - lon, d.lat - lat) < Math.hypot(best.lon - lon, best.lat - lat) ? d : best), DISTRICTS[0]);
    const close = Math.hypot((near.lon - lon) * 101, (near.lat - lat) * 111) < 3; // km
    sites.push({ lon, lat, trees: Math.round(tr), cells, district: close ? near.name : '', districtAr: close ? near.nameAr : '' });
  }
  sites.sort((a, b) => b.trees - a.trees);
  return { plan: { dCanopy, roof: new Float32Array(n), parkSeeds: null, parkM2: 0, roofM2: 0 }, sites };
}

export function mergePlans(a: Plan, b: Plan, L: Layers): Plan {
  const n = a.dCanopy.length;
  const dCanopy = new Float32Array(n);
  for (let k = 0; k < n; k++) dCanopy[k] = Math.min(1 - L.canopy[k], a.dCanopy[k] + b.dCanopy[k]);
  let parkSeeds: Uint8Array | null = null;
  if (a.parkSeeds || b.parkSeeds) {
    parkSeeds = new Uint8Array(n);
    for (let k = 0; k < n; k++) parkSeeds[k] = (a.parkSeeds?.[k] ?? 0) | (b.parkSeeds?.[k] ?? 0);
  }
  const roof = new Float32Array(n);
  for (let k = 0; k < n; k++) roof[k] = Math.min(1, a.roof[k] + b.roof[k]);
  return { dCanopy, roof, parkSeeds, parkM2: a.parkM2 + b.parkM2, roofM2: a.roofM2 + b.roofM2 };
}

// --------------------------------------------------------------- simulation --
export interface Simulation {
  dLst: Float32Array; // °C, ≤ 0
  trees: number;
  canopyHa: number;
  parkHa: number;
  roofHa: number;
  cooledKm2: number; // cells ≥ 0.5 °C cooler
  peakCooling: number; // °C (most negative)
  meanCoolingAffected: number; // °C over cells cooled ≥ 0.1 °C
  urbanLstBefore: number;
  urbanLstAfter: number;
  urbanCanopyPctBefore: number;
  urbanCanopyPctAfter: number;
  priorityKm2Before: number;
  priorityKm2After: number;
  equityBefore: number;
  equityAfter: number;
  waterM3Day: [number, number];
  costSar: [number, number];
  shareOfGreenRiyadh: number; // trees / 7.5 M
}

export function simulate(g: Grid, L: Layers, R: Results, w: Weights, model: CoolingModel, plan: Plan, parks: ParkCollection): Simulation {
  const n = L.lst.length;
  const { cell, nearby } = coolingCoefs(model);
  // Neighbourhood canopy change, same 300 m window as the access layer.
  const dNear = Float32Array.from(plan.dCanopy);
  boxBlur(dNear, g.width, g.height, Math.max(1, Math.round(CANOPY_RADIUS / g.rowCellSize[g.height >> 1])));
  const dLst = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    dLst[k] = cell * plan.dCanopy[k] + nearby * dNear[k] + COOL_ROOF_DLST * plan.roof[k] * L.builtDensity[k];
  }

  // New distances to tree canopy and parks.
  const treeSeeds = new Uint8Array(n);
  for (let k = 0; k < n; k++) treeSeeds[k] = L.canopy[k] + plan.dCanopy[k] >= 0.5 ? 1 : 0;
  const distTree = distanceTransform(g, treeSeeds).distance;
  let distPark = L.distPark;
  if (plan.parkSeeds) {
    const seeds = Uint8Array.from(plan.parkSeeds);
    for (const f of parks.features) rasterizePolygon(g, f.geometry.coordinates[0], seeds);
    distPark = distanceTransform(g, seeds).distance;
  }

  const total = w.heat + w.density + w.vegetation || 1;
  let urbanArea = 0, canopyB = 0, canopyA = 0, lstB = 0, lstA = 0, lstN = 0;
  let cooled = 0, peak = 0, affSum = 0, affN = 0, prioB = 0, prioA = 0, eqB = 0, eqA = 0, eqN = 0, trees = 0, canopyM2 = 0;
  // Priority cut-off from the baseline: lowest score among priority cells.
  let cutoff = Infinity;
  for (let k = 0; k < n; k++) if (R.priority[k]) cutoff = Math.min(cutoff, R.risk[k] * (1 - accessAt(L, k)));

  for (let k = 0; k < n; k++) {
    const area = cellArea(g, k);
    const added = plan.dCanopy[k] * area;
    canopyM2 += added;
    if (dLst[k] <= -0.5) cooled += area;
    if (dLst[k] < peak) peak = dLst[k];
    if (dLst[k] <= -0.1) { affSum += dLst[k]; affN++; }
    if (!L.urban[k]) continue;
    urbanArea += area;
    canopyB += L.canopy[k] * area;
    canopyA += Math.min(1, L.canopy[k] + plan.dCanopy[k]) * area;
    if (!Number.isFinite(L.lst[k])) continue;
    lstB += L.lst[k]; lstA += L.lst[k] + dLst[k]; lstN++;
    const heatB = heatAt(L, k);
    if (!Number.isFinite(heatB)) continue;
    const heatA = clamp01((L.lst[k] + dLst[k] - L.lstRange[0]) / (L.lstRange[1] - L.lstRange[0]));
    const nearA = L.canopyNearby[k] + dNear[k];
    const accessA = (clamp01(nearA / ACCESS_CANOPY_FULL) + Math.exp(-distTree[k] / TREE_SCALE) + Math.exp(-distPark[k] / PARK_SCALE)) / 3;
    const accessB = accessAt(L, k);
    const ndvi = Number.isFinite(L.ndvi[k]) ? L.ndvi[k] : 0;
    const vegA = clamp01((ndvi + plan.dCanopy[k] * 0.4 - 0.1) / 0.4);
    const riskA = (w.heat * heatA + w.density * L.builtDensity[k] + w.vegetation * (1 - vegA)) / total;
    if (R.priority[k]) prioB += area;
    if (R.priority[k] && riskA * (1 - accessA) >= cutoff) prioA += area;
    eqB += accessB - heatB; eqA += accessA - heatA; eqN++;
  }
  trees = canopyM2 / TREE_CROWN_M2;
  // Trees from street planting only; parks priced per m², roofs per m².
  let parkCanopyM2 = 0;
  if (plan.parkSeeds) for (let k = 0; k < n; k++) if (plan.parkSeeds[k]) parkCanopyM2 += plan.dCanopy[k] * cellArea(g, k);
  const streetTrees = Math.max(0, (canopyM2 - parkCanopyM2) / TREE_CROWN_M2);
  const allTrees = Math.round(trees);
  const cost: [number, number] = [
    streetTrees * TREE_COST_SAR[0] + plan.parkM2 * PARK_COST_SAR_M2[0] + plan.roofM2 * COOL_ROOF_COST_SAR_M2[0],
    streetTrees * TREE_COST_SAR[1] + plan.parkM2 * PARK_COST_SAR_M2[1] + plan.roofM2 * COOL_ROOF_COST_SAR_M2[1],
  ];
  return {
    dLst,
    trees: allTrees,
    canopyHa: canopyM2 / 1e4,
    parkHa: plan.parkM2 / 1e4,
    roofHa: plan.roofM2 / 1e4,
    cooledKm2: cooled / 1e6,
    peakCooling: peak,
    meanCoolingAffected: affN ? affSum / affN : 0,
    urbanLstBefore: lstN ? lstB / lstN : NaN,
    urbanLstAfter: lstN ? lstA / lstN : NaN,
    urbanCanopyPctBefore: urbanArea ? (canopyB / urbanArea) * 100 : 0,
    urbanCanopyPctAfter: urbanArea ? (canopyA / urbanArea) * 100 : 0,
    priorityKm2Before: prioB / 1e6,
    priorityKm2After: prioA / 1e6,
    equityBefore: eqN ? eqB / eqN : NaN,
    equityAfter: eqN ? eqA / eqN : NaN,
    waterM3Day: [(allTrees * TREE_WATER_L_DAY[0]) / 1000, (allTrees * TREE_WATER_L_DAY[1]) / 1000],
    costSar: cost,
    shareOfGreenRiyadh: allTrees / GREEN_RIYADH.trees,
  };
}

// -------------------------------------------------------------- rendering --
export const COOLING_RAMP = [[222, 235, 247], [158, 202, 225], [66, 146, 198], [33, 102, 172], [8, 48, 107]];
export const COOLING_MAX = 3; // °C at the dark end

export function renderCooling(g: Grid, dLst: Float32Array) {
  return toDataUrl(g, (k, out, o) => {
    const c = -dLst[k];
    if (c < 0.1) return;
    rampColor(COOLING_RAMP, Math.min(1, c / COOLING_MAX), out, o);
    out[o + 3] = Math.round(120 + 110 * Math.min(1, c / COOLING_MAX));
  });
}

// ------------------------------------------------------------------- brief --
export interface CityBriefItem {
  tone: 'good' | 'warn' | 'bad' | 'info';
  en: string;
  ar: string;
  focus?: { lon: number; lat: number };
}

export function cityBrief(
  stats: { meanUrbanLst: number; suhi: number; urbanCanopyPct: number; hotspotKm2: number; priorityKm2: number; urbanKm2: number },
  districts: { name: string; nameAr: string; lon: number; lat: number; lst: number; canopyPct: number; equity: number; priorityPct: number }[],
  model: CoolingModel,
): CityBriefItem[] {
  const items: CityBriefItem[] = [];
  const f1 = (v: number) => v.toFixed(1);
  if (Number.isFinite(stats.meanUrbanLst)) {
    const warmer = stats.suhi >= 0;
    items.push({
      tone: 'info',
      en: `The built-up city averages ${f1(stats.meanUrbanLst)} °C at the surface, ${f1(Math.abs(stats.suhi))} °C ${warmer ? 'warmer' : 'cooler'} than its bare surroundings${warmer ? '' : ' — by day the desert heats faster than the city'}.`,
      ar: `متوسط حرارة سطح المدينة المبنية ${f1(stats.meanUrbanLst)} °م، ${warmer ? 'أدفأ' : 'أبرد'} بـ ${f1(Math.abs(stats.suhi))} °م من محيطها الجرد${warmer ? '' : ' — فالصحراء تسخن نهارًا أسرع من المدينة'}.`,
    });
  }
  const valid = districts.filter((d) => Number.isFinite(d.lst));
  if (valid.length) {
    const hot = [...valid].sort((a, b) => b.lst - a.lst)[0];
    const cool = [...valid].sort((a, b) => a.lst - b.lst)[0];
    items.push({
      tone: 'bad',
      en: `Hottest focus district: ${hot.name} at ${f1(hot.lst)} °C with ${f1(hot.canopyPct)}% canopy — ${f1(hot.lst - cool.lst)} °C hotter than ${cool.name}.`,
      ar: `أشد الأحياء المختارة حرارة: ${hot.nameAr} عند ${f1(hot.lst)} °م ومظلة أشجار ${f1(hot.canopyPct)}% — أدفأ بـ ${f1(hot.lst - cool.lst)} °م من ${cool.nameAr}.`,
      focus: { lon: hot.lon, lat: hot.lat },
    });
    const worst = [...valid].filter((d) => Number.isFinite(d.equity)).sort((a, b) => a.equity - b.equity)[0];
    if (worst) {
      items.push({
        tone: 'warn',
        en: `Largest canopy-equity deficit: ${worst.name} (equity ${worst.equity.toFixed(2)}; ${Math.round(worst.priorityPct)}% of it is priority planting zone).`,
        ar: `أكبر عجز في عدالة مظلة الأشجار: ${worst.nameAr} (العدالة ${worst.equity.toFixed(2)}؛ ${Math.round(worst.priorityPct)}% منه منطقة أولوية للتشجير).`,
        focus: { lon: worst.lon, lat: worst.lat },
      });
    }
  }
  items.push({
    tone: model.fallback ? 'warn' : 'good',
    en: model.fallback
      ? `The loaded imagery shows no clear canopy cooling (R² ${model.r2.toFixed(2)}), so the simulator uses an assumed −0.4 °C per +10% canopy.`
      : `Learned from this city's own pixels (OLS, n = ${model.n.toLocaleString('en-US')}, R² ${model.r2.toFixed(2)}): +10% tree canopy ≈ ${model.per10.toFixed(2)} °C at the surface.`,
    ar: model.fallback
      ? `لا تُظهر الصور المحمّلة تبريدًا واضحًا من المظلة (R² ${model.r2.toFixed(2)})، لذا يستخدم المحاكي قيمة مفترضة −0.4 °م لكل +10% مظلة.`
      : `مُتعلَّم من بكسلات المدينة نفسها (OLS، n = ${model.n.toLocaleString('en-US')}، R² ${model.r2.toFixed(2)}): +10% من مظلة الأشجار ≈ ${model.per10.toFixed(2)} °م على السطح.`,
  });
  items.push({
    tone: stats.urbanCanopyPct >= GREEN_RIYADH.greenCoverPct ? 'good' : 'warn',
    en: `Urban green canopy reads ${f1(stats.urbanCanopyPct)}% against Green Riyadh's ${GREEN_RIYADH.greenCoverPct}% green-cover target for 2030.`,
    ar: `تبلغ المظلة الخضراء الحضرية ${f1(stats.urbanCanopyPct)}% مقابل هدف الرياض الخضراء لتغطية خضراء ${GREEN_RIYADH.greenCoverPct}% بحلول 2030.`,
  });
  items.push({
    tone: 'info',
    en: `${Math.round(stats.priorityKm2)} km² of the ${Math.round(stats.urbanKm2)} km² built-up city are priority planting zones. Open the Plan tab to green them and see the cooling.`,
    ar: `${Math.round(stats.priorityKm2)} كم² من أصل ${Math.round(stats.urbanKm2)} كم² من المدينة المبنية مناطق أولوية للتشجير. افتح تبويب «الخطة» لتشجيرها ورؤية أثر التبريد.`,
  });
  return items;
}
