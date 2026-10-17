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
  rows: [number, number, number, number][]; // [monthIndex, localityIndex, events, fatalities]
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

export function totals(data: AcledData, filters: AcledFilters): Totals {
  return filterRows(data, filters).reduce((t, r) => ({ events: t.events + r[2], fatalities: t.fatalities + r[3] }), {
    events: 0,
    fatalities: 0,
  });
}

// Full timeline regardless of the selected range, so the charts can show
// where the selection sits within the war.
export function monthlySeries(data: AcledData, filters: AcledFilters): MonthlyPoint[] {
  const series = data.months.map((month) => ({ month, events: 0, fatalities: 0 }));
  filterRows(data, filters, 'time').forEach(([mi, , e, f]) => {
    series[mi].events += e;
    series[mi].fatalities += f;
  });
  return series;
}

// Per-state totals within the time range, ignoring the place filters so the
// choropleth and "top states" chart always cover the whole country.
export function byState(data: AcledData, filters: AcledFilters): Map<string, NamedTotals> {
  const out = new Map(data.states.map((s) => [s, { name: s, events: 0, fatalities: 0 }]));
  filterRows(data, filters, 'place').forEach(([, li, e, f]) => {
    const entry = out.get(data.localities[li].state)!;
    entry.events += e;
    entry.fatalities += f;
  });
  return out;
}

// Per-locality totals within the time range (and the selected state, if any).
export function byLocality(data: AcledData, filters: AcledFilters): LocalityTotals[] {
  const out = data.localities.map((locality) => ({ locality, events: 0, fatalities: 0 }));
  filterRows(data, { ...filters, locality: null }).forEach(([, li, e, f]) => {
    out[li].events += e;
    out[li].fatalities += f;
  });
  return out;
}
