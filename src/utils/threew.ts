export interface ThreeWOrg {
  name: string;
  acronym: string;
  type: string;
}

export interface ThreeWLocality {
  name: string;
  state: string;
  lat: number | null;
  lon: number | null;
}

export interface ThreeWData {
  months: string[];
  states: string[];
  clusters: string[];
  orgs: ThreeWOrg[];
  localities: ThreeWLocality[];
  rows: [monthIdx: number, stateIdx: number, localityIdx: number, clusterIdx: number, orgIdx: number][];
}

export interface ThreeWFilters {
  month?: string | null;
  cluster?: string | null;
  state?: string | null;
  org?: string | null;
  orgType?: string | null;
}

function matches(data: ThreeWData, row: ThreeWData['rows'][number], filters: ThreeWFilters, ignore?: keyof ThreeWFilters) {
  const [monthIdx, stateIdx, , clusterIdx, orgIdx] = row;
  if (ignore !== 'month' && filters.month && data.months[monthIdx] !== filters.month) return false;
  if (ignore !== 'cluster' && filters.cluster && data.clusters[clusterIdx] !== filters.cluster) return false;
  if (ignore !== 'state' && filters.state && data.states[stateIdx] !== filters.state) return false;
  if (ignore !== 'org' && filters.org && data.orgs[orgIdx].acronym !== filters.org) return false;
  if (ignore !== 'orgType' && filters.orgType && data.orgs[orgIdx].type !== filters.orgType) return false;
  return true;
}

export function filterRows(data: ThreeWData, filters: ThreeWFilters, ignore?: keyof ThreeWFilters) {
  return data.rows.filter((row) => matches(data, row, filters, ignore));
}

export interface StateAggregate {
  state: string;
  activities: number;
  orgs: number;
  clusters: number;
}

export function aggregateByState(data: ThreeWData, filters: ThreeWFilters): StateAggregate[] {
  const rows = filterRows(data, filters, 'state');
  const byState = new Map<number, { activities: number; orgs: Set<number>; clusters: Set<number> }>();
  for (const [, stateIdx, , clusterIdx, orgIdx] of rows) {
    if (!byState.has(stateIdx)) byState.set(stateIdx, { activities: 0, orgs: new Set(), clusters: new Set() });
    const entry = byState.get(stateIdx)!;
    entry.activities += 1;
    entry.orgs.add(orgIdx);
    entry.clusters.add(clusterIdx);
  }
  return data.states.map((state, idx) => {
    const entry = byState.get(idx);
    return {
      state,
      activities: entry?.activities ?? 0,
      orgs: entry?.orgs.size ?? 0,
      clusters: entry?.clusters.size ?? 0,
    };
  });
}

export interface ClusterAggregate {
  cluster: string;
  activities: number;
  orgs: number;
}

export function aggregateByCluster(data: ThreeWData, filters: ThreeWFilters): ClusterAggregate[] {
  const rows = filterRows(data, filters, 'cluster');
  const byCluster = new Map<number, { activities: number; orgs: Set<number> }>();
  for (const [, , , clusterIdx, orgIdx] of rows) {
    if (!byCluster.has(clusterIdx)) byCluster.set(clusterIdx, { activities: 0, orgs: new Set() });
    const entry = byCluster.get(clusterIdx)!;
    entry.activities += 1;
    entry.orgs.add(orgIdx);
  }
  return data.clusters
    .map((cluster, idx) => ({
      cluster,
      activities: byCluster.get(idx)?.activities ?? 0,
      orgs: byCluster.get(idx)?.orgs.size ?? 0,
    }))
    .filter((c) => c.activities > 0)
    .sort((a, b) => b.activities - a.activities);
}

export interface OrgAggregate {
  org: ThreeWOrg;
  activities: number;
  states: number;
}

export function aggregateByOrg(data: ThreeWData, filters: ThreeWFilters, topN = 10): OrgAggregate[] {
  const rows = filterRows(data, filters, 'org');
  const byOrg = new Map<number, { activities: number; states: Set<number> }>();
  for (const [, stateIdx, , , orgIdx] of rows) {
    if (!byOrg.has(orgIdx)) byOrg.set(orgIdx, { activities: 0, states: new Set() });
    const entry = byOrg.get(orgIdx)!;
    entry.activities += 1;
    entry.states.add(stateIdx);
  }
  return Array.from(byOrg.entries())
    .map(([orgIdx, entry]) => ({ org: data.orgs[orgIdx], activities: entry.activities, states: entry.states.size }))
    .sort((a, b) => b.activities - a.activities)
    .slice(0, topN);
}

export interface OrgTypeAggregate {
  type: string;
  activities: number;
  orgs: number;
}

export function aggregateByOrgType(data: ThreeWData, filters: ThreeWFilters): OrgTypeAggregate[] {
  const rows = filterRows(data, filters, 'orgType');
  const byType = new Map<string, { activities: number; orgs: Set<number> }>();
  for (const [, , , , orgIdx] of rows) {
    const type = data.orgs[orgIdx].type;
    if (!byType.has(type)) byType.set(type, { activities: 0, orgs: new Set() });
    const entry = byType.get(type)!;
    entry.activities += 1;
    entry.orgs.add(orgIdx);
  }
  return Array.from(byType.entries())
    .map(([type, entry]) => ({ type, activities: entry.activities, orgs: entry.orgs.size }))
    .sort((a, b) => b.activities - a.activities);
}

export interface MonthlyTrendPoint {
  month: string;
  activities: number;
}

export function monthlyTrend(data: ThreeWData, filters: ThreeWFilters): MonthlyTrendPoint[] {
  const rows = filterRows(data, filters, 'month');
  const byMonth = new Map<number, number>();
  for (const [monthIdx] of rows) {
    byMonth.set(monthIdx, (byMonth.get(monthIdx) ?? 0) + 1);
  }
  return data.months.map((month, idx) => ({ month, activities: byMonth.get(idx) ?? 0 }));
}

export interface LocalityAggregate {
  locality: ThreeWLocality;
  activities: number;
}

export function aggregateByLocality(data: ThreeWData, filters: ThreeWFilters): LocalityAggregate[] {
  const rows = filterRows(data, filters);
  const byLocality = new Map<number, number>();
  for (const [, , localityIdx] of rows) {
    byLocality.set(localityIdx, (byLocality.get(localityIdx) ?? 0) + 1);
  }
  return Array.from(byLocality.entries())
    .map(([localityIdx, activities]) => ({ locality: data.localities[localityIdx], activities }))
    .filter((l) => l.locality.lat !== null);
}
