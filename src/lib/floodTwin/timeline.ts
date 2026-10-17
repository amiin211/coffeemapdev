// The animation as a pure, deterministic function of timeline time:
// sceneState = evaluate(context, t). Nothing here reads a clock or depends on
// the frame rate, so the interactive view, scrubbing and the frame-by-frame
// video export all show exactly the same frame for the same t.

import { CatmullRomCurve3, Vector3 } from 'three';
import { CAMERA_KEYS, RAIN, TIMING } from './config';
import type { BuildingCollection, Timeline } from './data';

export type Vec3 = [number, number, number];

export interface SceneState {
  t: number;
  /** Fractional day index into the timeline (0 = first date). */
  day: number;
  date: string;
  waterLevel: number; //       water-surface elevation (m, DEM datum)
  rainfall: number; //         mm/day
  rainIntensity: number; //    0..1
  buildingsAffected: number;
  peopleAffected: number;
  waterOpacity: number; //     0..1 multiplier on the 3D water
  extentOpacity: number; //    0..1 multiplier on the ML flood extent layer
  storm: number; //            0..1 sky darkening
  introAlpha: number; //       place caption, 0–6 s
  titleAlpha: number; //       closing title card, 36–40 s
  camera: { position: Vec3; target: Vec3 };
}

/** Everything evaluate() needs, built once from the data. Immutable. */
export interface TimelineContext {
  timeline: Timeline;
  level: (day: number) => number;
  rain: (day: number) => number;
  /** Building base elevations sorted ascending, and people summed in that order. */
  sortedBase: Float64Array;
  peopleBelow: Float64Array;
  hasExtent: boolean;
  cameraPos: CatmullRomCurve3;
  cameraTarget: CatmullRomCurve3;
  cameraProgress: (t: number) => number;
}

const clamp01 = (x: number) => Math.min(Math.max(x, 0), 1);
export const smoothstep = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};

/**
 * Monotone cubic (Fritsch–Carlson) interpolation through (xs, ys): smooth,
 * and never overshoots, so levels and rainfall stay within the data. With
 * restEnds the slope is zero at both ends (eased start and stop).
 */
export function monotoneCubic(xs: number[], ys: number[], restEnds = false): (x: number) => number {
  const n = xs.length;
  if (n === 1) return () => ys[0];
  const delta = xs.slice(0, -1).map((x, i) => (ys[i + 1] - ys[i]) / (xs[i + 1] - x));
  const m = xs.map((_, i) => (i === 0 ? delta[0] : i === n - 1 ? delta[n - 2] : delta[i - 1] * delta[i] <= 0 ? 0 : (delta[i - 1] + delta[i]) / 2));
  if (restEnds) m[0] = m[n - 1] = 0;
  for (let i = 0; i < n - 1; i++) {
    if (delta[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / delta[i], b = m[i + 1] / delta[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      m[i] = k * a * delta[i];
      m[i + 1] = k * b * delta[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const u = (x - xs[i]) / h;
    const u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
  };
}

/** AOI-relative [east, up, north] -> world [x, y, z] (z = south). */
export const keyToWorld = ([e, u, n]: Vec3, half: number) => new Vector3(e * half, u * half, -n * half);

export function createTimelineContext(timeline: Timeline, buildings: BuildingCollection, aoiHalfWidth: number, hasExtent: boolean): TimelineContext {
  const days = timeline.dates.map((_, i) => i);
  const order = buildings.features.map((f) => f.properties).sort((a, b) => a.base_elev_m - b.base_elev_m);
  const sortedBase = Float64Array.from(order, (p) => p.base_elev_m);
  const peopleBelow = new Float64Array(order.length + 1);
  order.forEach((p, i) => (peopleBelow[i + 1] = peopleBelow[i] + (p.people ?? 0)));

  // Eased camera progress: the curve parameter passes through key i at key
  // time t_i, starts and ends at rest, and keeps moving in between.
  const n = CAMERA_KEYS.length;
  const cameraProgress = monotoneCubic(CAMERA_KEYS.map((k) => k.t), CAMERA_KEYS.map((_, i) => i / (n - 1)), true);

  return {
    timeline,
    level: monotoneCubic(days, timeline.water_level_m),
    rain: monotoneCubic(days, timeline.rainfall_mm),
    sortedBase,
    peopleBelow,
    hasExtent,
    cameraPos: new CatmullRomCurve3(CAMERA_KEYS.map((k) => keyToWorld(k.pos, aoiHalfWidth)), false, 'centripetal'),
    cameraTarget: new CatmullRomCurve3(CAMERA_KEYS.map((k) => keyToWorld(k.target, aoiHalfWidth)), false, 'centripetal'),
    cameraProgress,
  };
}

/** Number of sorted values strictly below x. */
function countBelow(sorted: Float64Array, x: number) {
  let lo = 0, hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export function evaluate(ctx: TimelineContext, tRaw: number): SceneState {
  const { DURATION, FLOOD_START, FLOOD_END, PEAK_END } = TIMING;
  const t = Math.min(Math.max(tRaw, 0), DURATION);
  const lastDay = ctx.timeline.dates.length - 1;
  const day = clamp01((t - FLOOD_START) / (FLOOD_END - FLOOD_START)) * lastDay;

  const waterLevel = ctx.level(day);
  const rainfall = Math.max(ctx.rain(day), 0);
  // Rain starts as the camera arrives and clears for the peak and title.
  const rainIntensity = clamp01(rainfall / RAIN.FULL_AT_MM) * smoothstep(FLOOD_START - 2, FLOOD_START, t) * (1 - smoothstep(FLOOD_END, FLOOD_END + 3, t));

  const affected = countBelow(ctx.sortedBase, waterLevel);
  const fade = smoothstep(FLOOD_END, PEAK_END, t);

  const u = ctx.cameraProgress(t);
  const p = ctx.cameraPos.getPoint(u);
  const q = ctx.cameraTarget.getPoint(u);

  return {
    t,
    day,
    date: ctx.timeline.dates[Math.round(day)],
    waterLevel,
    rainfall,
    rainIntensity,
    buildingsAffected: affected,
    peopleAffected: Math.round(ctx.peopleBelow[affected]),
    // Without an ML flood extent to show instead, the 3D water stays.
    waterOpacity: ctx.hasExtent ? 1 - fade : 1,
    extentOpacity: ctx.hasExtent ? fade : 0,
    storm: rainIntensity * 0.75,
    introAlpha: smoothstep(0.4, 1.4, t) * (1 - smoothstep(4.4, 5.6, t)),
    titleAlpha: smoothstep(PEAK_END, PEAK_END + 1.4, t),
    camera: { position: [p.x, p.y, p.z], target: [q.x, q.y, q.z] },
  };
}
