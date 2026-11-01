// Types + aggregation helpers for the Sudan Conflicts dashboard, built on
// public/data/acled_data.json (see scripts/build-acled-data.mjs): ACLED
// political violence events and fatalities per locality (admin2) per month.

export interface AcledLocality {
  pcode: string;
  name: string;
  state: string;
  lat: number;
  lon: number;
}

export interface AcledData {
  asOf: string | null;
  months: string[]; // YYYY-MM
  states: string[];
  localities: AcledLocality[];
  rows: AcledRow[];
}

export type AcledRow = [number, number, number, number]; // [monthIndex, localityIndex, events, fatalities]

export const MEASURES = ['events', 'fatalities'] as const;
export type Measure = (typeof MEASURES)[number];

/** A place on the map: a state, or a locality (by pcode) within it. */
export interface AreaRef {
  state: string;
  pcode: string | null;
}

export interface AcledFilters {
  monthRange: [number, number]; // inclusive indices into data.months
  state: string | null;
  locality: string | null;
}

export interface Totals {
  events: number;
  fatalities: number;
}

export interface NamedTotals extends Totals {
  name: string;
}

export interface LocalityTotals extends Totals {
  locality: AcledLocality;
}

export interface MonthlyPoint extends Totals {
  month: string;
}

export function formatMonth(month: string, ar = false): string {
  const [y, m] = month.split('-');
  const names = ar
    ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${names[parseInt(m, 10) - 1]} ${y}`;
}

const emptyTotals = (): Totals => ({ events: 0, fatalities: 0 });

function addRow(t: Totals, row: AcledRow) {
  t.events += row[2];
  t.fatalities += row[3];
}

// Rows passing the filters. `ignore` drops one dimension so a chart can show
// every option in that dimension while still honouring the others.
function filterRows(data: AcledData, filters: AcledFilters, ignore?: 'time' | 'place') {
  const [from, to] = filters.monthRange;
  return data.rows.filter(([mi, li]) => {
    if (ignore !== 'time' && (mi < from || mi > to)) return false;
    if (ignore === 'place') return true;
    const loc = data.localities[li];
    if (filters.state && loc.state !== filters.state) return false;
    if (filters.locality && loc.name !== filters.locality) return false;
    return true;
  });
}

/** Sum the measures of the rows per key — the one building block behind every
 *  breakdown (state, locality, month; a future event-type column is just
 *  another `keyOf`). `null` keys are skipped. */
export function groupTotals<K>(rows: AcledRow[], keyOf: (row: AcledRow) => K | null, seed: K[] = []): Map<K, Totals> {
  const out = new Map<K, Totals>(seed.map((k) => [k, emptyTotals()]));
  for (const row of rows) {
    const key = keyOf(row);
    if (key === null) continue;
    let t = out.get(key);
    if (!t) out.set(key, (t = emptyTotals()));
    addRow(t, row);
  }
  return out;
}

export function totals(data: AcledData, filters: AcledFilters): Totals {
  return groupTotals(filterRows(data, filters), () => 0).get(0) ?? emptyTotals();
}

// Full timeline regardless of the selected range, so the charts can show
// where the selection sits within the war.
export function monthlySeries(data: AcledData, filters: AcledFilters): MonthlyPoint[] {
  const byMonth = groupTotals(filterRows(data, filters, 'time'), (r) => r[0], data.months.map((_, i) => i));
  return data.months.map((month, i) => ({ month, ...byMonth.get(i)! }));
}

// Per-state totals within the time range, ignoring the place filters so the
// choropleth and "top states" chart always cover the whole country.
export function byState(data: AcledData, filters: AcledFilters): Map<string, NamedTotals> {
  const grouped = groupTotals(filterRows(data, filters, 'place'), (r) => data.localities[r[1]].state, data.states);
  return new Map(data.states.map((name) => [name, { name, ...grouped.get(name)! }]));
}

// Per-locality totals within the time range (and the selected state, if any).
export function byLocality(data: AcledData, filters: AcledFilters): LocalityTotals[] {
  const grouped = groupTotals(filterRows(data, { ...filters, locality: null }), (r) => r[1]);
  return data.localities.map((locality, i) => ({ locality, ...(grouped.get(i) ?? emptyTotals()) }));
}

/** Largest single-month value of `measure` within the time range, per state,
 *  per locality (within the selected state) and per locality nationwide, so
 *  month-by-month playback keeps one colour/height scale for every month. */
export function monthlyMax(data: AcledData, filters: AcledFilters, measure: Measure) {
  const all = filterRows(data, { ...filters, state: null, locality: null });
  const max = (groups: Map<string, Totals>) => Math.max(0, ...Array.from(groups.values(), (t) => t[measure]));
  return {
    state: max(groupTotals(all, (r) => `${r[0]}|${data.localities[r[1]].state}`)),
    locality: max(groupTotals(all, (r) => (!filters.state || data.localities[r[1]].state === filters.state ? `${r[0]}|${r[1]}` : null))),
    national: max(groupTotals(all, (r) => `${r[0]}|${r[1]}`)),
  };
}
