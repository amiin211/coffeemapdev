// Blue Nile Flood Twin: every tunable constant in one place.
//
// World frame: x = east, y = up, z = south (three.js is right-handed, so
// north is -z). Units are metres; y = (elevation - terrain minimum) x
// VERTICAL_EXAGGERATION, applied to terrain, water and buildings alike so
// water depths against walls stay true to scale.

export const DATA_URL = '/data/flood-twin';

export const VERTICAL_EXAGGERATION = 2;

// ------------------------------------------------------------------ timing --
// The animation is a pure function of t in [0, DURATION] seconds.
export const TIMING = {
  DURATION: 40,
  INTRO_END: 6, //        0–6 s   camera sweeps down along the river
  FLOOD_START: 6, //      6–30 s  day-by-day flood
  FLOOD_END: 30,
  PEAK_END: 36, //        30–36 s water fades, ML flood extent fades in
  // 36–40 s wide shot and title card
};

// Video export
export const RECORD_FPS = 30;

// ------------------------------------------------------------------ camera --
// Keyframes at timeline times t (s). Positions and targets are AOI-relative:
// [east, up, north] in units of half the AOI width (1 = the AOI edge, about
// 1.5 km for the 3 x 3 km AOI), so the same path fits any AOI size. The path
// is a CatmullRomCurve3 through the positions (and one through the targets),
// with progress eased so it starts and ends at rest and never stops between.
export interface CameraKey {
  t: number;
  pos: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_KEYS: CameraKey[] = [
  { t: 0, pos: [1.1, 1.1, -1.4], target: [0.1, 0, -0.1] }, //       high over the river, upstream (south-east)
  { t: 3, pos: [0.45, 0.6, -0.95], target: [-0.05, 0, 0.05] }, //   sweeping down along the river
  { t: 6, pos: [-0.2, 0.36, -0.55], target: [0.3, 0, 0.35] }, //    far bank, facing the town across the river
  { t: 18, pos: [-0.55, 0.38, -0.3], target: [0.35, 0, 0.45] }, //  slow drift along the far bank
  { t: 30, pos: [-0.7, 0.42, 0.2], target: [0.35, 0, 0.5] }, //     the town from downstream-west
  { t: 36, pos: [-0.85, 0.8, 0.6], target: [0.2, 0, 0.25] }, //     rising to see the flood extent
  { t: 40, pos: [-1.25, 1.55, 1.6], target: [0.05, 0, 0.05] }, //   wide shot
];

export const CAMERA_FOV = 45;

// ------------------------------------------------------------------- water --
export const WATER = {
  SHALLOW: '#4f9cc4',
  DEEP: '#0b3d63',
  DEEP_AT_M: 4, //          depth (m, true scale) that reaches the deep colour
  OPACITY: 0.82,
  SHORE_FADE_M: 0.35, //    fade-in over the first metres of depth (true scale)
  RIPPLE_SCALE: 0.045, //   ripples per metre
  RIPPLE_SPEED: 0.6,
};

// Building colour by water depth at the building (true metres).
export const DEPTH_CLASSES = [
  { max: 0, color: '#c4beb4', label: 'Dry', labelAr: 'جاف' },
  { max: 0.5, color: '#fdd835', label: '< 0.5 m', labelAr: 'أقل من 0.5 م' },
  { max: 1.5, color: '#fb8c00', label: '0.5–1.5 m', labelAr: '0.5–1.5 م' },
  { max: Infinity, color: '#e53935', label: '> 1.5 m', labelAr: 'أكثر من 1.5 م' },
] as const;

// Buildings are extruded this far (true metres) below their base elevation so
// they never float above sloping ground.
export const BUILDING_FOOTING_M = 1.5;

// -------------------------------------------------------------------- rain --
export const RAIN = {
  FULL_AT_MM: 40, //        daily rainfall that gives full intensity
  COUNT: 24000,
  COUNT_MOBILE: 8000,
  BOX: 520, //              drops fill a box this wide around the camera (world m)
  HEIGHT: 300,
  SPEED: 160, //            world m/s (exaggerated, for visibility)
  STREAK: 9,
};

// -------------------------------------------------------------- flood extent --
export const FLOOD_EXTENT_COLOR = '#29b6f6';
export const FLOOD_EXTENT_OPACITY = 0.55;

// ------------------------------------------------------------------- scene --
export const SKY = { CLEAR: '#a9c9de', STORM: '#5f6f7c' };
export const FOG = { NEAR: 2500, FAR: 9000 };
export const MAX_PIXEL_RATIO = 2;
export const MAX_PIXEL_RATIO_MOBILE = 1.5;

export const SITE_URL = 'coffeemap.dev';

/** Depth class index, matching the building shader: dry at depth <= 0. */
export const depthClass = (depth: number) =>
  depth <= DEPTH_CLASSES[0].max ? 0 : depth < DEPTH_CLASSES[1].max ? 1 : depth < DEPTH_CLASSES[2].max ? 2 : 3;
