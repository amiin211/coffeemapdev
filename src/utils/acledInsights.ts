// "Smart" analytics for the Sudan Conflicts dashboard, computed in the browser
// from public/data/acled_data.json. Every number the AI assistant talks about
// comes from here — the model only explains and routes, it never counts.
//
//  - Surges / declines: each locality's last 3 months against its own
//    baseline (the 6 months before), scored as a Poisson z-score.
//  - Newly affected: localities quiet for the whole baseline that now report events.
//  - Hotspots: Getis-Ord Gi* over locality centroids (150 km distance band,
//    log-transformed totals for the selected period).
//  - State trends: the same recent-vs-baseline comparison per state.

import type { AcledData, AcledFilters, AcledLocality, Measure } from './acled';

export const RECENT_MONTHS = 3;
export const BASELINE_MONTHS = 6;
export const MIN_BASELINE_MONTHS = 3;
export const SURGE_Z = 3;
export const MIN_SURGE_COUNT = 10; // recent total needed before a locality can be a surge
export const MIN_NEW_COUNT = 3;
export const HOTSPOT_BAND_KM = 150;

export type InsightOverlay = 'surges' | 'new' | 'hotspots';
export type Confidence = 90 | 95 | 99;

export interface InsightWindow {
  recent: [number, number]; // inclusive month indices
  baseline: [number, number];
  partialSkipped: boolean; // the last (partial) month was left out
}

export interface LocalityChange {
  locality: AcledLocality;
  recent: number; // total over the recent window
  expected: number; // baseline monthly mean × recent window length
  z: number;
}

export interface StateTrend {
  state: string;
  recent: number;
  expected: number;
  change: number | null; // relative change, null when nothing was expected
}

export interface Hotspot {
  locality: AcledLocality;
  z: number;
  confidence: Confidence;
}

export interface AcledInsights {
  measure: Measure;
  window: InsightWindow | null; // null when there isn't enough history before the period
  surges: LocalityChange[];
  declines: LocalityChange[];
  newlyAffected: LocalityChange[];
  stateTrends: StateTrend[];
  hotspots: Hotspot[]; // over the selected period, nationwide
}

/** Locality × month totals, built once per dataset. */
export interface AcledMatrix {
  months: number;
  events: Float64Array; // [locality * months + month]
  fatalities: Float64Array;
  neighbours: number[][]; // locality indices within the hotspot band (self included)
}

function distanceKm(a: AcledLocality, b: AcledLocality) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function buildMatrix(data: AcledData): AcledMatrix {
  const M = data.months.length;
  const L = data.localities.length;
  const events = new Float64Array(L * M);
  const fatalities = new Float64Array(L * M);
  for (const [mi, li, e, f] of data.rows) {
    events[li * M + mi] += e;
    fatalities[li * M + mi] += f;
  }
  const neighbours = data.localities.map((a) =>
    data.localities.flatMap((b, j) => (distanceKm(a, b) <= HOTSPOT_BAND_KM ? [j] : [])),
  );
  return { months: M, events, fatalities, neighbours };
}

/** Recent and baseline windows ending at the end of the period. The last month
 *  of the dataset is partial, so a period ending there is moved back a month. */
export function insightWindow(data: AcledData, filters: AcledFilters): InsightWindow | null {
  let end = filters.monthRange[1];
  const partialSkipped = !!data.asOf && end === data.months.length - 1 && end > 0;
  if (partialSkipped) end -= 1;
  const recentStart = end - RECENT_MONTHS + 1;
  const baselineEnd = recentStart - 1;
  const baselineStart = Math.max(0, baselineEnd - BASELINE_MONTHS + 1);
  if (recentStart < 0 || baselineEnd - baselineStart + 1 < MIN_BASELINE_MONTHS) return null;
  return { recent: [recentStart, end], baseline: [baselineStart, baselineEnd], partialSkipped };
}

const sumRange = (values: Float64Array, offset: number, [from, to]: [number, number]) => {
  let s = 0;
  for (let m = from; m <= to; m++) s += values[offset + m];
  return s;
};

// Poisson z-score of `recent` against its expectation (variance = mean, floored
// at 1 so a quiet baseline doesn't turn a couple of events into a huge score).
const poissonZ = (recent: number, expected: number) => (recent - expected) / Math.sqrt(Math.max(expected, 1));

function changeFor(recent: number, baselineTotal: number, window: InsightWindow) {
  const baselineLength = window.baseline[1] - window.baseline[0] + 1;
  const expected = (baselineTotal / baselineLength) * RECENT_MONTHS;
  return { recent, expected, z: poissonZ(recent, expected) };
}

function hotspots(data: AcledData, matrix: AcledMatrix, values: Float64Array, range: [number, number]): Hotspot[] {
  const n = data.localities.length;
  const x = data.localities.map((_, i) => Math.log1p(sumRange(values, i * matrix.months, range)));
  const mean = x.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(x.reduce((a, b) => a + b * b, 0) / n - mean * mean);
  if (!(sd > 0)) return [];
  const out: Hotspot[] = [];
  matrix.neighbours.forEach((nb, i) => {
    const w = nb.length; // binary weights: Σw = Σw² = neighbour count
    const denominator = sd * Math.sqrt((n * w - w * w) / (n - 1));
    if (!(denominator > 0)) return;
    const z = (nb.reduce((s, j) => s + x[j], 0) - mean * w) / denominator;
    const confidence: Confidence | null = z >= 2.576 ? 99 : z >= 1.96 ? 95 : z >= 1.645 ? 90 : null;
    if (confidence) out.push({ locality: data.localities[i], z, confidence });
  });
  return out.sort((a, b) => b.z - a.z);
}

/** Everything the insights panel, the map overlay and the AI brief use.
 *  `filters.state` narrows the lists; hotspots are always computed nationwide
 *  (a spatial statistic needs every neighbour) and then narrowed for display. */
export function computeInsights(data: AcledData, matrix: AcledMatrix, filters: AcledFilters, measure: Measure): AcledInsights {
  const values = matrix[measure];
  const M = matrix.months;
  const window = insightWindow(data, filters);
  const inState = (l: AcledLocality) => !filters.state || l.state === filters.state;

  const surges: LocalityChange[] = [];
  const declines: LocalityChange[] = [];
  const newlyAffected: LocalityChange[] = [];
  const byState = new Map<string, { recent: number; baseline: number }>(data.states.map((s) => [s, { recent: 0, baseline: 0 }]));

  if (window) {
    data.localities.forEach((locality, i) => {
      const recent = sumRange(values, i * M, window.recent);
      const baseline = sumRange(values, i * M, window.baseline);
      const s = byState.get(locality.state);
      if (s) {
        s.recent += recent;
        s.baseline += baseline;
      }
      if (!inState(locality)) return;
      const change = { locality, ...changeFor(recent, baseline, window) };
      if (baseline === 0 && recent >= MIN_NEW_COUNT) newlyAffected.push(change);
      else if (change.z >= SURGE_Z && recent >= MIN_SURGE_COUNT) surges.push(change);
      else if (change.z <= -SURGE_Z && change.expected >= MIN_SURGE_COUNT) declines.push(change);
    });
  }

  const stateTrends: StateTrend[] = window
    ? Array.from(byState, ([state, t]) => {
        const { recent, expected } = changeFor(t.recent, t.baseline, window);
        return { state, recent, expected, change: expected > 0 ? recent / expected - 1 : null };
      })
        .filter((t) => (t.recent > 0 || t.expected > 0) && (!filters.state || t.state === filters.state))
        .sort((a, b) => b.recent - b.expected - (a.recent - a.expected))
    : [];

  return {
    measure,
    window,
    surges: surges.sort((a, b) => b.z - a.z),
    declines: declines.sort((a, b) => a.z - b.z),
    newlyAffected: newlyAffected.sort((a, b) => b.recent - a.recent),
    stateTrends,
    hotspots: hotspots(data, matrix, values, filters.monthRange).filter((h) => inState(h.locality)),
  };
}

export const OVERLAY_COLORS: Record<InsightOverlay, string> = {
  surges: '#7B1FA2',
  new: '#00897B',
  hotspots: '#E65100',
};
export const HOTSPOT_COLORS: Record<Confidence, string> = { 99: '#BF360C', 95: '#F4511E', 90: '#FFAB91' };

/** pcode → fill colour for the selected overlay. */
export function overlayColors(insights: AcledInsights, overlay: InsightOverlay | null): Map<string, string> {
  if (overlay === 'hotspots') return new Map(insights.hotspots.map((h) => [h.locality.pcode, HOTSPOT_COLORS[h.confidence]]));
  const list = overlay === 'surges' ? insights.surges : overlay === 'new' ? insights.newlyAffected : [];
  return new Map(list.map((c) => [c.locality.pcode, OVERLAY_COLORS[overlay!]]));
}

/** Compact, number-only summary of the current view for the AI brief. */
export function briefData(
  data: AcledData,
  insights: AcledInsights,
  context: { period: string; area: string; totals: { events: number; fatalities: number }; topStates: { name: string; events: number; fatalities: number }[] },
) {
  const m = (i: number) => data.months[i];
  const round = (v: number) => Math.round(v * 10) / 10;
  const change = (c: LocalityChange) => ({ locality: c.locality.name, state: c.locality.state, recent: c.recent, expected: round(c.expected) });
  return {
    source: `ACLED Sudan HRP political violence events and fatalities by month${data.asOf ? `, as of ${data.asOf}` : ''}`,
    area: context.area,
    period: context.period,
    totals: context.totals,
    topStates: context.topStates.slice(0, 6),
    measureUsedForChangeDetection: insights.measure,
    comparison: insights.window && {
      recentMonths: `${m(insights.window.recent[0])} to ${m(insights.window.recent[1])}`,
      baselineMonths: `${m(insights.window.baseline[0])} to ${m(insights.window.baseline[1])}`,
      lastPartialMonthExcluded: insights.window.partialSkipped,
      method: 'Recent 3-month total vs expected from the baseline monthly mean; flagged when the Poisson z-score is 3 or more',
    },
    surges: insights.surges.slice(0, 8).map(change),
    declines: insights.declines.slice(0, 5).map(change),
    newlyAffected: insights.newlyAffected.slice(0, 8).map(change),
    stateTrends: insights.stateTrends.slice(0, 8).map((t) => ({ state: t.state, recent: t.recent, expected: round(t.expected) })),
    hotspots: {
      method: `Getis-Ord Gi* on log totals for the period, ${HOTSPOT_BAND_KM} km distance band`,
      count: insights.hotspots.length,
      byState: Object.entries(
        insights.hotspots.reduce<Record<string, number>>((acc, h) => ((acc[h.locality.state] = (acc[h.locality.state] ?? 0) + 1), acc), {}),
      ).sort((a, b) => b[1] - a[1]),
    },
  };
}
