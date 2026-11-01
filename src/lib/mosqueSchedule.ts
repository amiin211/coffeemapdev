// Indicative 4D construction schedule for the Aseer mosque, generated from the
// BIM model itself rather than from the illustrative install dates in
// bim.json (those are scattered at random inside each category's window).
//
// It follows how a building like this is actually built:
//   1. Drone survey and setting out      2. Earthworks (clearing, cut & fill)
//   3. Access road to the existing road  4. Foundations and ground slab
//   5. Structure: walls rise with their real heights, level by level, each
//      roof slab cast only once the walls below it are up; the minaret climbs
//      section by section and the domes follow their supporting slab
//   6. Envelope: windows and doors once the shell is up
//   7. Finishes: cornices and trims, top-down as the scaffold comes down
//   8. External works: boundary walls, paving, parking shades, stairs,
//      railings, lighting, then landscaping   9. Handover
//
// Durations are typical rates for a masonry/RC mosque of this size, so the
// result is an indicative programme, not the project's real record.

export const PROJECT_START = '2023-04-01';

export type PhaseId = 'survey' | 'earthworks' | 'road' | 'foundations' | 'structure' | 'envelope' | 'finishes' | 'external' | 'handover';

export interface Phase {
  id: PhaseId;
  name: string;
  nameAr: string;
  start: number; // days from PROJECT_START
  end: number;
}

export interface ScheduleElement {
  key: string;
  category: string;
  zone: string;
  bottom: number; // m above the site level
  top: number;
  x: number; // plan centre, m
  z: number;
}

export interface Task {
  start: number;
  end: number;
  phase: PhaseId;
  grows: boolean; // rises from its base while in progress (walls, domes)
}

export interface Schedule {
  phases: Phase[];
  tasks: Map<string, Task>;
  finish: number; // handover day
  /** Height the structure has reached on a day (for the scaffold). */
  structureHeight: (day: number) => number;
  building: { minX: number; maxX: number; minZ: number; maxZ: number; top: number };
}

const PHASE_NAMES: Record<PhaseId, [string, string]> = {
  survey: ['Drone survey & setting out', 'المسح بالطائرة المسيّرة والتوقيع'],
  earthworks: ['Earthworks', 'أعمال الحفر والردم'],
  road: ['Access road', 'طريق الوصول'],
  foundations: ['Foundations & ground slab', 'الأساسات والبلاطة الأرضية'],
  structure: ['Structure, roofs & domes', 'الهيكل والأسقف والقباب'],
  envelope: ['Windows & doors', 'النوافذ والأبواب'],
  finishes: ['Finishes', 'التشطيبات'],
  external: ['External works', 'الأعمال الخارجية'],
  handover: ['Handover', 'التسليم'],
};

// Fixed early phases (days from the start).
const SURVEY: [number, number] = [0, 14];
const EARTHWORKS: [number, number] = [14, 49];
const ROAD: [number, number] = [35, 77];
const FOUNDATIONS: [number, number] = [49, 91];
const STRUCTURE_START = 91;
const STRUCTURE_DAYS = 130; // to climb the full height, excluding slab pauses
const SLAB_PAUSE = 12; // days to cast and cure each roof slab before building on it
const CREW_STAGGER = 8; // crews work round the building: up to this many days offset by position
const MIN_WALL_DAYS = 8;

const round = (v: number) => Math.round(v);

export function buildSchedule(elements: ScheduleElement[]): Schedule {
  const building = elements.filter((e) => e.zone !== 'External Works');
  const structural = building.filter((e) => e.category === 'Walls' || e.category === 'Roofs' || e.category === 'Domes');
  const minX = Math.min(...building.map((e) => e.x)), maxX = Math.max(...building.map((e) => e.x));
  const minZ = Math.min(...building.map((e) => e.z)), maxZ = Math.max(...building.map((e) => e.z));
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  const hMax = Math.max(1, ...structural.filter((e) => e.category !== 'Domes').map((e) => e.top));

  // Roof slab levels; each one pauses the climb while it is cast.
  const slabs = Array.from(new Set(structural.filter((e) => e.category === 'Roofs').map((e) => Math.round(e.top * 4) / 4))).sort((a, b) => a - b);
  const k = STRUCTURE_DAYS / hMax;
  // Day the structure reaches height h everywhere: steady climb plus a pause
  // for every slab below h.
  const T = (h: number) => STRUCTURE_START + h * k + SLAB_PAUSE * slabs.filter((s) => s - 0.2 < h).length;
  const stagger = (e: ScheduleElement) => ((Math.atan2(e.z - cz, e.x - cx) + Math.PI) / (2 * Math.PI)) * CREW_STAGGER;

  const tasks = new Map<string, Task>();
  const set = (e: ScheduleElement, start: number, end: number, phase: PhaseId, grows = false) =>
    tasks.set(e.key, { start: round(start), end: round(Math.max(end, start + 1)), phase, grows });

  // 5. Structure
  for (const e of structural) {
    if (e.category === 'Walls') {
      const start = T(e.bottom) + stagger(e);
      set(e, start, Math.max(T(e.top - 0.25) + stagger(e), start + MIN_WALL_DAYS), 'structure', true);
    } else if (e.category === 'Roofs') {
      const start = T(e.top - 0.25) + CREW_STAGGER;
      set(e, start, start + SLAB_PAUSE - 2, 'structure');
    } else {
      // Domes: the main dome is a long job (formwork, shell, cladding); finials are quick.
      const start = T(e.bottom) + CREW_STAGGER;
      set(e, start, start + (e.top - e.bottom > 8 ? 35 : 12), 'structure', true);
    }
  }
  const structureEnd = Math.max(STRUCTURE_START + 1, ...Array.from(tasks.values(), (t) => t.end));

  // 6. Envelope: once the walls around the opening are up.
  const envelope = building.filter((e) => e.category === 'Windows' || e.category === 'Doors');
  for (const e of envelope) {
    const start = Math.max(T(e.top) + 20, structureEnd - 40) + stagger(e);
    set(e, start, start + (e.category === 'Doors' ? 5 : 7), 'envelope');
  }

  // 7. Finishes: cornices and trims, top-down as the scaffold is struck.
  const finishStart = structureEnd + 5;
  const finishes = building.filter((e) => !['Walls', 'Roofs', 'Domes', 'Windows', 'Doors'].includes(e.category));
  for (const e of finishes) {
    const start = finishStart + (1 - Math.min(1, e.top / hMax)) * 45 + stagger(e) / 2;
    set(e, start, start + 10, 'finishes');
  }
  const finishesEnd = Math.max(finishStart + 1, ...finishes.map((e) => tasks.get(e.key)!.end));

  // 8. External works, in site order.
  const ext0 = structureEnd + 20;
  const external = elements.filter((e) => e.zone === 'External Works');
  const extWindows: Record<string, [number, number]> = {
    Walls: [0, 40],
    Floors: [30, 30],
    'Site Structures': [40, 45],
    Stairs: [50, 20],
    Railings: [62, 16],
    Lighting: [72, 32],
    Landscape: [98, 30],
  };
  const extByCategory = new Map<string, ScheduleElement[]>();
  for (const e of external) (extByCategory.get(e.category) ?? extByCategory.set(e.category, []).get(e.category)!).push(e);
  extByCategory.forEach((list, category) => {
    const [offset, span] = extWindows[category] ?? [60, 30];
    // Work moves across the site from west to east.
    const xs = list.map((e) => e.x);
    const x0 = Math.min(...xs), x1 = Math.max(...xs);
    for (const e of list) {
      const f = x1 > x0 ? (e.x - x0) / (x1 - x0) : 0;
      const dur = category === 'Floors' ? span : Math.max(4, span * 0.3);
      const start = ext0 + offset + f * (span - dur);
      set(e, start, start + dur, 'external', category === 'Walls');
    }
  });
  const externalEnd = Math.max(ext0 + 1, ...external.map((e) => tasks.get(e.key)!.end));
  const finish = Math.max(externalEnd, finishesEnd) + 10;

  const envelopeStart = Math.min(...envelope.map((e) => tasks.get(e.key)!.start), structureEnd);
  const envelopeEnd = Math.max(...envelope.map((e) => tasks.get(e.key)!.end), envelopeStart + 1);
  const phase = (id: PhaseId, start: number, end: number): Phase => ({ id, name: PHASE_NAMES[id][0], nameAr: PHASE_NAMES[id][1], start: round(start), end: round(end) });
  const phases: Phase[] = [
    phase('survey', ...SURVEY),
    phase('earthworks', ...EARTHWORKS),
    phase('road', ...ROAD),
    phase('foundations', ...FOUNDATIONS),
    phase('structure', STRUCTURE_START, structureEnd),
    phase('envelope', envelopeStart, envelopeEnd),
    phase('finishes', finishStart, finishesEnd),
    phase('external', ext0, externalEnd),
    phase('handover', finish - 10, finish),
  ];

  const structureHeight = (day: number) => {
    if (day < STRUCTURE_START) return 0;
    let lo = 0, hi = hMax;
    for (let i = 0; i < 30; i++) {
      const mid = (lo + hi) / 2;
      if (T(mid) <= day) lo = mid;
      else hi = mid;
    }
    return lo;
  };

  return {
    phases,
    tasks,
    finish,
    structureHeight,
    building: {
      minX: Math.min(...building.map((e) => e.x)),
      maxX: Math.max(...building.map((e) => e.x)),
      minZ: Math.min(...building.map((e) => e.z)),
      maxZ: Math.max(...building.map((e) => e.z)),
      top: hMax,
    },
  };
}

export function dayToIso(day: number) {
  const d = new Date(`${PROJECT_START}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + Math.round(day));
  return d.toISOString().slice(0, 10);
}

/** Hijri (Umm al-Qura) date as YYYY-MM-DD, or '' where the browser lacks the calendar. */
export function hijriIso(iso: string) {
  try {
    const parts = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: 'UTC' }).formatToParts(new Date(`${iso}T00:00:00Z`));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
    return `${get('year').replace(/\D/g, '')}-${get('month')}-${get('day')}`;
  } catch {
    return '';
  }
}

export const phaseAt = (schedule: Schedule, day: number) =>
  schedule.phases.filter((p) => day >= p.start && day < p.end).map((p) => p.id);
