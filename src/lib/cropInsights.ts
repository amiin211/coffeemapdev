// Client-side crop intelligence for the GeoAI Crop Monitoring dashboard,
// computed from the per-field Sentinel-2 NDVI series in timeseries.json:
//   - health vs peers: each field against the median of the fields growing
//     the same crop on the same date (robust z-score with the MAD),
//   - harvest / cutting events: sharp NDVI drops from a green canopy, so a
//     cut alfalfa pivot or a harvested wheat field is not flagged as stress,
//   - phenology per season: green-up, peak, senescence, season length and a
//     season-integrated NDVI "vigour" ranked against the same crop,
//   - irrigation water demand: FAO-56 style ETc = Kc(NDVI) × ET0, with ET0
//     from NASA POWER (Hargreaves) or an Al Jouf monthly climatology,
//   - similar fields: Pearson correlation of NDVI profiles,
//   - change between two dates and a plain-language farm brief.
// All of it is model output for screening, not agronomic ground truth.

import type { CropTimeSeries, FieldProperties } from '@/utils/crop';
import { cropOn, valueAt } from '@/utils/crop';

const DAY = 86_400_000;
const t = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

// ------------------------------------------------------------ health vs peers --
export type Health = 'thriving' | 'normal' | 'watch' | 'stressed' | 'harvested' | 'dormant' | 'idle' | 'nodata';

export const HEALTH_ORDER: Health[] = ['thriving', 'normal', 'watch', 'stressed', 'harvested', 'dormant', 'idle', 'nodata'];

export const HEALTH_COLORS: Record<Health, string> = {
  thriving: '#1B5E20',
  normal: '#66BB6A',
  watch: '#FBC02D',
  stressed: '#D50000',
  harvested: '#8D6E63',
  dormant: '#B0BEC5',
  idle: '#E0E0E0',
  nodata: '#FFFFFF',
};

export const HEALTH_LABEL: Record<Health, [string, string]> = {
  thriving: ['Thriving', 'مزدهر'],
  normal: ['Normal', 'طبيعي'],
  watch: ['Watch', 'تحت المراقبة'],
  stressed: ['Stressed', 'مُجهَد'],
  harvested: ['Harvested / cut', 'محصود / محشوش'],
  dormant: ['Off-season', 'خارج الموسم'],
  idle: ['Fallow / idle', 'بور / غير مستغل'],
  nodata: ['No clear view', 'لا رؤية صافية'],
};

export interface FieldHealth {
  id: string;
  crop: string; // crop class of the season containing the date
  value: number | null; // NDVI at (or shortly before) the date
  peerMedian: number | null;
  ratio: number | null; // value / peer median
  z: number | null; // robust z-score against peers
  trend: number | null; // NDVI change per 10 days over the last 30 days
  health: Health;
  harvestedOn: string | null; // recent harvest / cut date
}

const median = (v: number[]) => {
  if (!v.length) return NaN;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// NDVI slope (per 10 days) of the clear readings in the `days` before `index`.
export function trendAt(values: (number | null)[], dates: string[], index: number, days = 30): number | null {
  const end = t(dates[index]);
  const xs: number[] = [], ys: number[] = [];
  for (let i = index; i >= 0; i--) {
    const dt = (end - t(dates[i])) / DAY;
    if (dt > days) break;
    const v = values[i];
    if (v !== null) { xs.push(-dt); ys.push(v); }
  }
  if (xs.length < 3) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den > 0 ? (num / den) * 10 : null;
}

// ------------------------------------------------------------ cut / harvest --
export interface CutEvent {
  index: number; // first low reading after the drop
  date: string;
  from: number;
  to: number;
}

// Sharp drops from a green canopy (≥ 0.45) to bare-ish ground (≤ 0.30)
// within 25 days: alfalfa cuttings and cereal harvests.
export function detectCuts(values: (number | null)[], dates: string[]): CutEvent[] {
  const events: CutEvent[] = [];
  let lastGreen: { i: number; v: number } | null = null;
  let armed = true;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v === null) continue;
    if (v >= 0.45) {
      if (!lastGreen || v >= lastGreen.v || (t(dates[i]) - t(dates[lastGreen.i])) / DAY > 10) lastGreen = { i, v };
      armed = true;
    } else if (v <= 0.3 && lastGreen && armed && (t(dates[i]) - t(dates[lastGreen.i])) / DAY <= 25) {
      events.push({ index: i, date: dates[i], from: lastGreen.v, to: v });
      armed = false;
      lastGreen = null;
    }
  }
  return events;
}

const CUT_MEMORY_DAYS = 35; // a field stays "harvested / cut" this long after the drop

export function computeHealth(fields: FieldProperties[], series: CropTimeSeries, index: number, cuts: Map<string, CutEvent[]>): Map<string, FieldHealth> {
  const { dates } = series;
  const date = dates[index];
  const readings = fields.map((f) => {
    const s = series.fields[f.id];
    const r = valueAt(s.ndvi, dates, index);
    const crop = cropOn(f, date)?.crop ?? f.crop;
    return { f, crop, value: r?.value ?? null };
  });
  // Peer statistics per crop class on this date.
  const peers = new Map<string, { med: number; mad: number }>();
  const byCrop = new Map<string, number[]>();
  readings.forEach((r) => { if (r.value !== null) (byCrop.get(r.crop) ?? byCrop.set(r.crop, []).get(r.crop)!).push(r.value); });
  byCrop.forEach((v, crop) => {
    const med = median(v);
    const mad = median(v.map((x) => Math.abs(x - med))) * 1.4826;
    peers.set(crop, { med, mad: Math.max(mad, 0.03) });
  });

  const out = new Map<string, FieldHealth>();
  for (const r of readings) {
    const s = series.fields[r.f.id];
    const p = peers.get(r.crop);
    const peerMedian = p && byCrop.get(r.crop)!.length >= 3 ? p.med : null;
    const ratio = r.value !== null && peerMedian ? r.value / peerMedian : null;
    const z = r.value !== null && p && peerMedian !== null ? (r.value - p.med) / p.mad : null;
    const trend = trendAt(s.ndvi, dates, index);
    const recentCut = (cuts.get(r.f.id) ?? []).filter((c) => c.index <= index && (t(date) - t(c.date)) / DAY <= CUT_MEMORY_DAYS).pop() ?? null;
    let health: Health;
    if (r.value === null) health = 'nodata';
    else if (r.crop === 'Fallow' || r.crop === 'Unclassified') health = r.value >= 0.35 ? 'normal' : 'idle';
    else if (recentCut && r.value < 0.45) health = 'harvested';
    else if (peerMedian !== null && peerMedian < 0.25 && r.value < 0.3) health = 'dormant';
    else if (z === null || ratio === null) health = 'normal';
    else if (ratio < 0.7 && z < -1.5) health = 'stressed';
    else if ((ratio < 0.8 && z < -1) || (trend !== null && trend < -0.06 && r.value < 0.5)) health = 'watch';
    else if (ratio > 1.1 && z > 1) health = 'thriving';
    else health = 'normal';
    out.set(r.f.id, { id: r.f.id, crop: r.crop, value: r.value, peerMedian, ratio, z, trend, health, harvestedOn: recentCut?.date ?? null });
  }
  return out;
}

// --------------------------------------------------------------- phenology --
export interface Phenology {
  season: string;
  crop: string;
  base: number;
  peak: number;
  peakDate: string | null;
  greenUp: string | null;
  senescence: string | null;
  lengthDays: number | null;
  vigour: number; // ∫ max(0, NDVI - 0.15) dt, NDVI·days
  cycles: number; // green cycles (alfalfa cuttings, double crops)
  vigourPct: number | null; // percentile among the same crop that season
}

// Season (Sep–Aug) label of a date, e.g. "2024-25".
export const seasonOf = (iso: string) => {
  const y = Number(iso.slice(0, 4));
  const start = Number(iso.slice(5, 7)) >= 9 ? y : y - 1;
  return `${start}-${String(start + 1).slice(2)}`;
};

function seasonPhenology(values: (number | null)[], dates: string[], season: string, crop: string): Omit<Phenology, 'vigourPct'> {
  const idx: number[] = [];
  for (let i = 0; i < dates.length; i++) if (seasonOf(dates[i]) === season && values[i] !== null) idx.push(i);
  // 3-point running median to knock out residual cloud and haze.
  const raw = idx.map((i) => values[i] as number);
  const sm = raw.map((_, k) => median(raw.slice(Math.max(0, k - 1), k + 2)));
  const empty = { season, crop, base: NaN, peak: NaN, peakDate: null, greenUp: null, senescence: null, lengthDays: null, vigour: 0, cycles: 0 };
  if (sm.length < 6) return empty;
  let pk = 0;
  sm.forEach((v, k) => { if (v > sm[pk]) pk = k; });
  const base = Math.min(...sm);
  const peak = sm[pk];
  const half = base + 0.5 * (peak - base);
  let gu: number | null = null, se: number | null = null;
  if (peak - base > 0.15) {
    for (let k = pk; k > 0; k--) if (sm[k - 1] < half) { gu = k; break; }
    for (let k = pk; k < sm.length - 1; k++) if (sm[k + 1] < half) { se = k; break; }
  }
  let vigour = 0;
  for (let k = 1; k < sm.length; k++) {
    const dt = (t(dates[idx[k]]) - t(dates[idx[k - 1]])) / DAY;
    vigour += ((Math.max(0, sm[k] - 0.15) + Math.max(0, sm[k - 1] - 0.15)) / 2) * Math.min(dt, 20);
  }
  let cycles = 0, up = false;
  for (const v of sm) {
    if (!up && v >= 0.45) { cycles++; up = true; } else if (up && v <= 0.3) up = false;
  }
  const d = (k: number | null) => (k === null ? null : dates[idx[k]]);
  const greenUp = d(gu), senescence = d(se);
  return {
    season, crop, base, peak, peakDate: dates[idx[pk]], greenUp, senescence,
    lengthDays: greenUp && senescence ? Math.round((t(senescence) - t(greenUp)) / DAY) : null,
    vigour: Math.round(vigour), cycles,
  };
}

export function computePhenology(fields: FieldProperties[], series: CropTimeSeries): Map<string, Phenology[]> {
  const seasons = Array.from(new Set(series.dates.map(seasonOf))).sort();
  const out = new Map<string, Phenology[]>();
  for (const f of fields) {
    const list = seasons.map((s) => {
      const crop = f.seasons.find((c) => c.season === s)?.crop ?? f.crop;
      return { ...seasonPhenology(series.fields[f.id].ndvi, series.dates, s, crop), vigourPct: null as number | null };
    });
    out.set(f.id, list);
  }
  // Vigour percentile within the same crop and season.
  for (const s of seasons) {
    const groups = new Map<string, Phenology[]>();
    out.forEach((list) => {
      const p = list.find((x) => x.season === s);
      if (p && p.vigour > 0 && p.crop !== 'Fallow') (groups.get(p.crop) ?? groups.set(p.crop, []).get(p.crop)!).push(p);
    });
    groups.forEach((g) => {
      if (g.length < 3) return;
      const sorted = g.map((p) => p.vigour).sort((a, b) => a - b);
      g.forEach((p) => { p.vigourPct = Math.round((sorted.filter((v) => v < p.vigour).length / (sorted.length - 1)) * 100); });
    });
  }
  return out;
}

// ------------------------------------------------------------------- water --
// Reference evapotranspiration ET0 (mm/day) per date.
export interface Et0Source {
  daily: Map<string, number>; // ISO date -> ET0 mm/day
  source: 'nasa-power' | 'climatology';
}

// Approximate monthly mean ET0 for Al Jouf (mm/day), arid northern Saudi
// Arabia, used when NASA POWER cannot be reached.
const AL_JOUF_ET0 = [2.6, 3.6, 5.0, 6.6, 8.4, 10.2, 10.6, 9.8, 8.0, 5.6, 3.5, 2.4];
export const climatologyEt0 = (iso: string) => AL_JOUF_ET0[Number(iso.slice(5, 7)) - 1];

// Hargreaves-Samani: ET0 = 0.0023 · Ra · (Tmean + 17.8) · √(Tmax − Tmin), Ra in mm/day.
function extraterrestrial(latDeg: number, doy: number) {
  const phi = (latDeg * Math.PI) / 180;
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI * doy) / 365);
  const delta = 0.409 * Math.sin((2 * Math.PI * doy) / 365 - 1.39);
  const ws = Math.acos(-Math.tan(phi) * Math.tan(delta));
  const ra = ((24 * 60) / Math.PI) * 0.082 * dr * (ws * Math.sin(phi) * Math.sin(delta) + Math.cos(phi) * Math.cos(delta) * Math.sin(ws)); // MJ/m²/day
  return ra * 0.408; // mm/day equivalent
}

export async function fetchEt0(start: string, end: string, lon: number, lat: number): Promise<Et0Source> {
  try {
    const params = new URLSearchParams({
      parameters: 'T2M_MAX,T2M_MIN',
      community: 'AG',
      longitude: lon.toFixed(3),
      latitude: lat.toFixed(3),
      start: start.replace(/-/g, ''),
      end: end.replace(/-/g, ''),
      format: 'JSON',
    });
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15_000);
    const res = await fetch(`https://power.larc.nasa.gov/api/temporal/daily/point?${params}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(String(res.status));
    const json: { properties: { parameter: Record<string, Record<string, number>> } } = await res.json();
    const tmax = json.properties.parameter.T2M_MAX, tmin = json.properties.parameter.T2M_MIN;
    const daily = new Map<string, number>();
    Object.keys(tmax).forEach((k) => {
      const hi = tmax[k], lo = tmin[k];
      if (hi < -900 || lo < -900) return;
      const iso = `${k.slice(0, 4)}-${k.slice(4, 6)}-${k.slice(6, 8)}`;
      const doy = Math.floor((t(iso) - Date.UTC(Number(k.slice(0, 4)), 0, 0)) / DAY);
      daily.set(iso, Math.max(0, 0.0023 * extraterrestrial(lat, doy) * ((hi + lo) / 2 + 17.8) * Math.sqrt(Math.max(0, hi - lo))));
    });
    if (daily.size < 30) throw new Error('too few days');
    return { daily, source: 'nasa-power' };
  } catch {
    return { daily: new Map(), source: 'climatology' };
  }
}

// Crop coefficient from NDVI (linear Kc–NDVI relation, bounded).
export const kcFromNdvi = (ndvi: number) => Math.min(1.2, Math.max(0.15, 1.25 * ndvi + 0.1));
export const IRRIGATION_EFFICIENCY = 0.85; // centre pivot application efficiency

export interface WaterUse {
  etcMm: number; // crop evapotranspiration over the period, mm
  grossM3: number; // gross irrigation, m³ (ETc / efficiency × area)
  perHa: number; // m³/ha
  days: number;
}

// Crop water use of one field between two date indices (daily ETc with Kc
// interpolated between clear NDVI readings).
export function waterUse(values: (number | null)[], dates: string[], from: number, to: number, areaHa: number, et0: Et0Source): WaterUse {
  const pts: { tm: number; v: number }[] = [];
  for (let i = from; i <= to; i++) if (values[i] !== null) pts.push({ tm: t(dates[i]), v: values[i] as number });
  if (!pts.length) return { etcMm: 0, grossM3: 0, perHa: 0, days: 0 };
  let etc = 0, k = 0;
  const t0 = t(dates[from]), t1 = t(dates[to]);
  for (let tm = t0; tm <= t1; tm += DAY) {
    while (k < pts.length - 1 && pts[k + 1].tm <= tm) k++;
    const a = pts[k], b = pts[Math.min(k + 1, pts.length - 1)];
    const v = b.tm > a.tm && tm > a.tm ? a.v + ((b.v - a.v) * (tm - a.tm)) / (b.tm - a.tm) : a.v;
    const iso = new Date(tm).toISOString().slice(0, 10);
    etc += kcFromNdvi(v) * (et0.daily.get(iso) ?? climatologyEt0(iso));
  }
  const days = Math.round((t1 - t0) / DAY) + 1;
  // Bare, unirrigated soil (NDVI < 0.2 throughout) uses no irrigation water.
  const irrigated = pts.some((p) => p.v >= 0.2);
  const gross = irrigated ? (etc * 10 * areaHa) / IRRIGATION_EFFICIENCY : 0; // 1 mm over 1 ha = 10 m³
  return { etcMm: Math.round(etc), grossM3: Math.round(gross), perHa: areaHa ? Math.round(gross / areaHa) : 0, days };
}

// First date index of the agricultural season (Sep–Aug) containing `index`.
export function seasonStartIndex(dates: string[], index: number) {
  const s = seasonOf(dates[index]);
  let i = index;
  while (i > 0 && seasonOf(dates[i - 1]) === s) i--;
  return i;
}

// ---------------------------------------------------------------- similar --
// Fields whose NDVI profile over the year before `index` correlates best.
export function similarFields(id: string, series: CropTimeSeries, index: number, k = 5): { id: string; r: number }[] {
  const { dates } = series;
  const from = Math.max(0, dates.findIndex((d) => t(d) >= t(dates[index]) - 365 * DAY));
  const a = series.fields[id].ndvi;
  const out: { id: string; r: number }[] = [];
  for (const [other, s] of Object.entries(series.fields)) {
    if (other === id) continue;
    let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
    for (let i = from; i <= index; i++) {
      const x = a[i], y = s.ndvi[i];
      if (x === null || y === null) continue;
      n++; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y;
    }
    if (n < 15) continue;
    const cov = sab - (sa * sb) / n, va = saa - (sa * sa) / n, vb = sbb - (sb * sb) / n;
    if (va <= 1e-6 || vb <= 1e-6) continue;
    out.push({ id: other, r: cov / Math.sqrt(va * vb) });
  }
  return out.sort((x, y) => y.r - x.r).slice(0, k);
}

// ------------------------------------------------------------------ change --
export function changeBetween(series: CropTimeSeries, id: string, from: number, to: number): number | null {
  const a = valueAt(series.fields[id].ndvi, series.dates, from, 25);
  const b = valueAt(series.fields[id].ndvi, series.dates, to, 25);
  return a && b ? b.value - a.value : null;
}

// Date index about `days` before `index`.
export function indexDaysBefore(dates: string[], index: number, days: number) {
  const target = t(dates[index]) - days * DAY;
  let i = index;
  while (i > 0 && t(dates[i]) > target) i--;
  return i;
}

// ------------------------------------------------------------------- brief --
export interface BriefItem {
  tone: 'good' | 'warn' | 'bad' | 'info';
  en: string;
  ar: string;
  fieldId?: string; // click to select
  health?: Health; // click to filter
}

const pct = (v: number) => `${Math.round(v * 100)}%`;
const n0 = (v: number) => Math.round(v).toLocaleString('en-US');

export interface BriefInput {
  fields: FieldProperties[];
  health: Map<string, FieldHealth>;
  dateLabel: [string, string];
  compareLabel: [string, string];
  meanChange: number | null; // area-weighted mean NDVI change since the compare date
  gainers: { id: string; d: number }[];
  losers: { id: string; d: number }[];
  yearWaterM3: number;
  et0Source: Et0Source['source'];
  label: (id: string, ar: boolean) => string;
  crop: (c: string, ar: boolean) => string;
}

export function buildFarmBrief(b: BriefInput): BriefItem[] {
  const items: BriefItem[] = [];
  const all = b.fields.map((f) => ({ f, h: b.health.get(f.id)! })).filter((x) => x.h);
  const area = (list: typeof all) => list.reduce((s, x) => s + x.f.area_ha, 0);
  const of = (h: Health) => all.filter((x) => x.h.health === h);

  const growing = all.filter((x) => x.h.value !== null && x.h.value >= 0.4);
  items.push({
    tone: 'info',
    en: `On ${b.dateLabel[0]}, ${growing.length} of ${all.length} fields (${n0(area(growing))} ha) carry an active green canopy (NDVI ≥ 0.4).`,
    ar: `في ${b.dateLabel[1]}، يحمل ${growing.length} من ${all.length} حقلًا (${n0(area(growing))} هكتار) غطاءً أخضر نشطًا (NDVI ≥ 0.4).`,
  });

  const stressed = of('stressed').sort((a, c) => (a.h.ratio ?? 1) - (c.h.ratio ?? 1));
  if (stressed.length) {
    const worst = stressed[0];
    const crops = new Map<string, number>();
    stressed.forEach((x) => crops.set(x.h.crop, (crops.get(x.h.crop) ?? 0) + 1));
    const top = [...crops.entries()].sort((a, c) => c[1] - a[1])[0][0];
    items.push({
      tone: 'bad',
      health: 'stressed',
      en: `${stressed.length} fields (${n0(area(stressed))} ha) are stressed against their peers, mostly ${b.crop(top, false).toLowerCase()}. Worst: ${b.label(worst.f.id, false)} at ${pct(worst.h.ratio ?? 0)} of the peer median.`,
      ar: `${stressed.length} حقلًا (${n0(area(stressed))} هكتار) في حالة إجهاد مقارنة بنظيراتها، معظمها ${b.crop(top, true)}. الأسوأ: ${b.label(worst.f.id, true)} عند ${pct(worst.h.ratio ?? 0)} من وسيط النظراء.`,
      fieldId: worst.f.id,
    });
  } else {
    items.push({ tone: 'good', en: 'No field is stressed against its peers on this date.', ar: 'لا يوجد حقل مُجهَد مقارنة بنظرائه في هذا التاريخ.' });
  }

  const watch = of('watch');
  if (watch.length) {
    const falling = watch.filter((x) => (x.h.trend ?? 0) < -0.05).length;
    items.push({
      tone: 'warn',
      health: 'watch',
      en: `${watch.length} fields are on watch (below 80% of peers or falling)${falling ? `; ${falling} lost more than 0.05 NDVI per 10 days over the last month` : ''}.`,
      ar: `${watch.length} حقلًا تحت المراقبة (أقل من 80% من النظراء أو في تراجع)${falling ? `؛ فقد ${falling} منها أكثر من 0.05 من NDVI كل 10 أيام خلال الشهر الأخير` : ''}.`,
    });
  }

  const cut = of('harvested');
  if (cut.length) {
    items.push({
      tone: 'info',
      health: 'harvested',
      en: `${cut.length} fields were harvested or cut in the last 5 weeks — sharp NDVI drops read as harvest, not stress.`,
      ar: `حُصد أو حُشّ ${cut.length} حقلًا خلال الأسابيع الخمسة الماضية — يُقرأ الانخفاض الحاد في NDVI على أنه حصاد لا إجهاد.`,
    });
  }

  const thriving = of('thriving');
  if (thriving.length) {
    items.push({
      tone: 'good',
      health: 'thriving',
      en: `${thriving.length} fields are outperforming their crop's median by more than 10%.`,
      ar: `${thriving.length} حقلًا يتفوق على وسيط محصوله بأكثر من 10%.`,
    });
  }

  if (b.meanChange !== null) {
    const up = b.meanChange >= 0;
    items.push({
      tone: Math.abs(b.meanChange) < 0.02 ? 'info' : up ? 'good' : 'warn',
      en: `Since ${b.compareLabel[0]} mean NDVI ${up ? 'rose' : 'fell'} by ${Math.abs(b.meanChange).toFixed(2)}.${b.losers[0] && b.losers[0].d < -0.15 ? ` Biggest drop: ${b.label(b.losers[0].id, false)} (${b.losers[0].d.toFixed(2)}).` : ''}${b.gainers[0] && b.gainers[0].d > 0.15 ? ` Biggest gain: ${b.label(b.gainers[0].id, false)} (+${b.gainers[0].d.toFixed(2)}).` : ''}`,
      ar: `منذ ${b.compareLabel[1]} ${up ? 'ارتفع' : 'انخفض'} متوسط NDVI بمقدار ${Math.abs(b.meanChange).toFixed(2)}.${b.losers[0] && b.losers[0].d < -0.15 ? ` أكبر انخفاض: ${b.label(b.losers[0].id, true)} (${b.losers[0].d.toFixed(2)}).` : ''}${b.gainers[0] && b.gainers[0].d > 0.15 ? ` أكبر ارتفاع: ${b.label(b.gainers[0].id, true)} (+${b.gainers[0].d.toFixed(2)}).` : ''}`,
      fieldId: b.losers[0] && b.losers[0].d < -0.15 ? b.losers[0].id : undefined,
    });
  }

  if (b.yearWaterM3 > 0) {
    const mcm = b.yearWaterM3 / 1e6;
    items.push({
      tone: 'info',
      en: `Estimated irrigation demand over the last 12 months: ${mcm.toFixed(1)} million m³ (≈ ${n0(b.yearWaterM3 / 2500)} Olympic pools), from NDVI-based crop coefficients and ${b.et0Source === 'nasa-power' ? 'NASA POWER weather' : 'an Al Jouf ET₀ climatology'}.`,
      ar: `الطلب التقديري على مياه الري خلال آخر 12 شهرًا: ${mcm.toFixed(1)} مليون م³ (≈ ${n0(b.yearWaterM3 / 2500)} مسبحًا أولمبيًا)، من معاملات محصول مبنية على NDVI و${b.et0Source === 'nasa-power' ? 'بيانات طقس NASA POWER' : 'مناخيات التبخر-نتح المرجعي للجوف'}.`,
    });
  }

  const idle = of('idle');
  if (idle.length) {
    items.push({
      tone: 'info',
      health: 'idle',
      en: `${idle.length} fields (${n0(area(idle))} ha) are fallow or idle — capacity that is not drawing water.`,
      ar: `${idle.length} حقلًا (${n0(area(idle))} هكتار) بور أو غير مستغل — طاقة لا تستهلك مياهًا.`,
    });
  }
  return items;
}
