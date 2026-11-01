// Analytics behind the 3W "Response Gap Explorer", computed in the browser.
// It joins the 3W partner activity data (who does what where) to ACLED
// conflict events for the same months, per locality, and powers three tools:
//
//  - Priority index: a weighted score the viewer tunes with sliders
//    (conflict intensity, partner scarcity, missing core clusters, declining presence).
//  - Partner exit simulator: what coverage would be lost if one organization left.
//  - Coverage matrix: partners per core cluster in the most conflict-affected localities.
//
// No AI and no API: every number comes from the two public datasets.

import type { AcledData } from './acled';
import type { ThreeWData, ThreeWFilters } from './threew';

export const CORE_CLUSTERS = ['Health', 'WASH', 'Food Security and Livelihoods', 'Protection', 'Nutrition'] as const;
export const MIN_ACTIVITIES_FOR_TREND = 6;

/** Join key shared by 3W, ACLED and the admin 2 boundaries. 3W adds a state
 *  suffix to the two localities called Ar Rahad; the others use the plain name. */
export const localityKey = (state: string, name: string) => `${state}|${name.replace(/-(GD|NK)$/, '')}`;

export interface LocalityProfile {
  key: string;
  name: string;
  state: string;
  events: number; // ACLED events over the 3W months
  fatalities: number;
  activities: number;
  orgActivities: Map<number, number>; // org index → activities
  clusterOrgs: Map<string, Set<number>>; // cluster → org indices
  monthly: number[]; // activities per 3W month
}

export interface ProfileSet {
  months: string[];
  profiles: Map<string, LocalityProfile>;
}

/** One profile per locality that has conflict events or reported activities.
 *  The month and state filters are ignored (the tools need the whole period and
 *  the whole country); cluster and organization type narrow the activities. */
export function buildProfiles(data: ThreeWData, acled: AcledData | null, filters: ThreeWFilters): ProfileSet {
  const profiles = new Map<string, LocalityProfile>();
  const get = (state: string, name: string) => {
    const key = localityKey(state, name);
    let p = profiles.get(key);
    if (!p)
      profiles.set(
        key,
        (p = {
          key,
          name: name.replace(/-(GD|NK)$/, ''),
          state,
          events: 0,
          fatalities: 0,
          activities: 0,
          orgActivities: new Map(),
          clusterOrgs: new Map(),
          monthly: data.months.map(() => 0),
        }),
      );
    return p;
  };

  if (acled) {
    const wanted = new Set(data.months.map((m) => acled.months.indexOf(m)).filter((i) => i >= 0));
    for (const [mi, li, e, f] of acled.rows) {
      if (!wanted.has(mi)) continue;
      const l = acled.localities[li];
      const p = get(l.state, l.name);
      p.events += e;
      p.fatalities += f;
    }
  }

  for (const [mi, si, li, ci, oi] of data.rows) {
    const loc = data.localities[li];
    const p = get(data.states[si] ?? loc.state, loc.name);
    if (filters.cluster && data.clusters[ci] !== filters.cluster) continue;
    if (filters.orgType && data.orgs[oi].type !== filters.orgType) continue;
    p.activities += 1;
    p.monthly[mi] += 1;
    p.orgActivities.set(oi, (p.orgActivities.get(oi) ?? 0) + 1);
    const cluster = data.clusters[ci];
    let orgs = p.clusterOrgs.get(cluster);
    if (!orgs) p.clusterOrgs.set(cluster, (orgs = new Set()));
    orgs.add(oi);
  }
  return { months: data.months, profiles };
}

export const partnerCount = (p: LocalityProfile) => p.orgActivities.size;
export const missingCore = (p: LocalityProfile) => CORE_CLUSTERS.filter((c) => !p.clusterOrgs.get(c)?.size);

/** Relative change in activities between the first and second half of the period. */
export function presenceChange(p: LocalityProfile): number | null {
  const half = Math.floor(p.monthly.length / 2);
  const first = p.monthly.slice(0, half).reduce((a, b) => a + b, 0);
  const second = p.monthly.slice(half).reduce((a, b) => a + b, 0);
  return first >= MIN_ACTIVITIES_FOR_TREND ? second / first - 1 : null;
}

// ---------------------------------------------------------------- Priority index

export const FACTORS = ['conflict', 'scarcity', 'missing', 'decline'] as const;
export type Factor = (typeof FACTORS)[number];
export type Weights = Record<Factor, number>;
export const DEFAULT_WEIGHTS: Weights = { conflict: 3, scarcity: 2, missing: 2, decline: 1 };

export interface PriorityItem {
  profile: LocalityProfile;
  score: number; // 0–1
  parts: Record<Factor, number>; // each factor 0–1, before weighting
  rank: number;
}

/** Share of values strictly below v, plus half the ties (mid-rank percentile). */
function percentileRank(sorted: number[], v: number) {
  let below = 0;
  let equal = 0;
  for (const x of sorted) {
    if (x < v) below++;
    else if (x === v) equal++;
  }
  return sorted.length ? (below + equal / 2) / sorted.length : 0;
}

export function priorityIndex(set: ProfileSet, weights: Weights, state: string | null): PriorityItem[] {
  const all = Array.from(set.profiles.values());
  const events = all.map((p) => p.events).sort((a, b) => a - b);
  const partners = all.map(partnerCount).sort((a, b) => a - b);
  const total = FACTORS.reduce((s, f) => s + weights[f], 0) || 1;
  return all
    .filter((p) => !state || p.state === state)
    .map((profile) => {
      const change = presenceChange(profile);
      const parts: Record<Factor, number> = {
        conflict: profile.events > 0 ? percentileRank(events, profile.events) : 0,
        scarcity: 1 - percentileRank(partners, partnerCount(profile)),
        missing: missingCore(profile).length / CORE_CLUSTERS.length,
        decline: change === null ? 0 : Math.min(1, Math.max(0, -change)),
      };
      const score = FACTORS.reduce((s, f) => s + weights[f] * parts[f], 0) / total;
      return { profile, score, parts, rank: 0 };
    })
    .sort((a, b) => b.score - a.score)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}

export const PRIORITY_RAMP = ['#FFF3E0', '#FFCC80', '#FF9800', '#E65100', '#8C2D04'];
export const PRIORITY_BREAKS = [0.2, 0.35, 0.5, 0.65]; // score class boundaries
export const priorityColor = (score: number) => PRIORITY_RAMP[PRIORITY_BREAKS.filter((b) => score >= b).length];

// ---------------------------------------------------------------- Partner exit

export type ExitImpact = 'uncovered' | 'cluster-lost' | 'reduced';
export const EXIT_COLORS: Record<ExitImpact, string> = { uncovered: '#B71C1C', 'cluster-lost': '#F57C00', reduced: '#FFD54F' };

export interface ExitItem {
  profile: LocalityProfile;
  impact: ExitImpact;
  orgActivities: number; // what the leaving organization reports there
  lostClusters: string[]; // core clusters left with no partner
  remainingPartners: number;
}

export function simulateExit(set: ProfileSet, orgIndex: number, state: string | null): ExitItem[] {
  const order: Record<ExitImpact, number> = { uncovered: 0, 'cluster-lost': 1, reduced: 2 };
  return Array.from(set.profiles.values())
    .filter((p) => p.orgActivities.has(orgIndex) && (!state || p.state === state))
    .map((profile) => {
      // Only the core clusters count: losing Logistics or a coordination forum is not a gap in services.
      const lostClusters = CORE_CLUSTERS.filter((c) => {
        const orgs = profile.clusterOrgs.get(c);
        return !!orgs && orgs.size === 1 && orgs.has(orgIndex);
      });
      const remainingPartners = partnerCount(profile) - 1;
      const impact: ExitImpact = remainingPartners === 0 ? 'uncovered' : lostClusters.length ? 'cluster-lost' : 'reduced';
      return { profile, impact, orgActivities: profile.orgActivities.get(orgIndex) ?? 0, lostClusters, remainingPartners };
    })
    .sort((a, b) => order[a.impact] - order[b.impact] || b.lostClusters.length - a.lostClusters.length || b.profile.events - a.profile.events);
}

// ---------------------------------------------------------------- Coverage matrix

export function coverageRows(set: ProfileSet, state: string | null, limit = 12) {
  return Array.from(set.profiles.values())
    .filter((p) => p.events > 0 && (!state || p.state === state))
    .sort((a, b) => b.events - a.events)
    .slice(0, limit)
    .map((profile) => ({ profile, cells: CORE_CLUSTERS.map((c) => profile.clusterOrgs.get(c)?.size ?? 0) }));
}
