// Survey drone: an original procedural VTOL quad-plane that flies a lawnmower
// photogrammetry survey over a box, with a camera beam projected onto the
// ground and a footprint stamped at every photo trigger so the overlap builds up.
// Units: metres. The model's nose points +Z, up is +Y, wingspan ~2 m.
import * as THREE from 'three';

type Vec3 = [number, number, number];

// Named parts: "rotor_0".."rotor_3" (spin around Y), "pusher" (spin around Z),
// "camera" (nadir lens; beam origin), "nav_left" / "nav_right" / "strobe".
export function createSurveyDrone() {
  const drone = new THREE.Group();
  drone.name = 'SurveyDrone';

  const white = new THREE.MeshStandardMaterial({ name: 'body_white', color: 0xf3efe8, roughness: 0.35, metalness: 0.05 });
  const coffee = new THREE.MeshStandardMaterial({ name: 'accent_coffee', color: 0x6f4a2f, roughness: 0.45, metalness: 0.1 });
  const crema = new THREE.MeshStandardMaterial({ name: 'accent_crema', color: 0xc8925a, roughness: 0.4, metalness: 0.1 });
  const dark = new THREE.MeshStandardMaterial({ name: 'carbon', color: 0x22252a, roughness: 0.6, metalness: 0.3 });
  const glass = new THREE.MeshStandardMaterial({ name: 'lens', color: 0x0b1a2a, roughness: 0.05, metalness: 0.9 });
  const blade = new THREE.MeshStandardMaterial({ name: 'blade', color: 0x1a1a1a, roughness: 0.5, transparent: true, opacity: 0.85 });
  const red = new THREE.MeshStandardMaterial({ name: 'nav_red', color: 0xff2a2a, emissive: 0xff2a2a, emissiveIntensity: 2 });
  const green = new THREE.MeshStandardMaterial({ name: 'nav_green', color: 0x2aff6a, emissive: 0x2aff6a, emissiveIntensity: 2 });
  const strobeM = new THREE.MeshStandardMaterial({ name: 'strobe', color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 2 });

  const add = (geo: THREE.BufferGeometry, mat: THREE.Material, pos: Vec3 = [0, 0, 0], rot: Vec3 = [0, 0, 0], name?: string) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(...pos);
    m.rotation.set(...rot);
    if (name) m.name = name;
    m.castShadow = true;
    drone.add(m);
    return m;
  };

  // Fuselage: lathe-profiled pod (nose +Z), slightly flattened.
  const prof = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24; // 0 tail -> 1 nose
    const r = 0.11 * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.8)), 0.55) + 0.012;
    prof.push(new THREE.Vector2(r, (t - 0.5) * 1.1));
  }
  const fus = add(new THREE.LatheGeometry(prof, 32), white, [0, 0, 0], [Math.PI / 2, 0, 0], 'fuselage');
  fus.scale.set(1, 1, 0.85);
  // Coffee canopy and crema spine stripe.
  add(new THREE.CapsuleGeometry(0.06, 0.32, 8, 16), coffee, [0, 0.075, 0.12], [Math.PI / 2, 0, 0], 'canopy');
  add(new THREE.BoxGeometry(0.02, 0.012, 0.7), crema, [0, 0.1, -0.05], [0, 0, 0], 'spine_stripe');

  // Wing: tapered, slightly swept, with dihedral; an extruded planform.
  const wingMat = white.clone();
  wingMat.name = 'wing_white';
  wingMat.side = THREE.DoubleSide;
  const makeWing = (side: 1 | -1) => {
    const s = new THREE.Shape();
    const span = 0.98, rootC = 0.3, tipC = 0.16, sweep = 0.08;
    s.moveTo(0, rootC / 2);
    s.lineTo(span, tipC / 2 - sweep);
    s.quadraticCurveTo(span + 0.04, -sweep, span, -tipC / 2 - sweep);
    s.lineTo(0, -rootC / 2);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.022, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 3 });
    g.translate(0, 0, -0.011);
    const w = new THREE.Mesh(g, wingMat);
    w.rotation.x = -Math.PI / 2;
    w.scale.set(side, -1, 1); // mirror, and keep the nose at +Z
    w.castShadow = true;
    const pivot = new THREE.Group();
    pivot.add(w);
    pivot.position.set(side * 0.06, 0.02, 0.02);
    pivot.rotation.z = side * THREE.MathUtils.degToRad(4); // dihedral
    pivot.name = side > 0 ? 'wing_left' : 'wing_right';
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.05, 0.17), coffee);
    tip.position.set(side * 1.0, 0.0, -0.08);
    pivot.add(tip);
    // Nose +Z and up +Y put the left wing at +X: red on the left, green on the right.
    const nav = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), side > 0 ? red : green);
    nav.position.set(side * 1.02, 0.0, -0.02);
    nav.name = side > 0 ? 'nav_left' : 'nav_right';
    pivot.add(nav);
    drone.add(pivot);
  };
  makeWing(1);
  makeWing(-1);

  // Twin booms carrying the four VTOL rotors.
  const boomX = 0.42;
  for (const side of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.018, 0.018, 1.25, 12), dark, [side * boomX, 0.0, -0.05], [Math.PI / 2, 0, 0], `boom_${side > 0 ? 'L' : 'R'}`);
    add(new THREE.BoxGeometry(0.04, 0.012, 0.25), crema, [side * boomX, 0.02, -0.05]);
  }

  const disc = new THREE.MeshBasicMaterial({ name: 'rotor_disc', color: 0x333333, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false });
  let rotorIdx = 0;
  for (const [side, z] of [[-1, 0.5], [1, 0.5], [-1, -0.6], [1, -0.6]]) {
    const x = side * boomX;
    add(new THREE.CylinderGeometry(0.03, 0.035, 0.05, 16), dark, [x, 0.04, z]); // motor
    const rotor = new THREE.Group();
    rotor.name = `rotor_${rotorIdx++}`;
    rotor.position.set(x, 0.075, z);
    for (let b = 0; b < 2; b++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.006, 0.035), blade);
      bl.rotation.y = b * Math.PI;
      bl.rotation.x = 0.12 * (b ? -1 : 1);
      rotor.add(bl);
    }
    rotor.add(new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.03, 12), coffee).translateY(0.02));
    // Faint rotor disc: reads as motion blur while spinning.
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.21, 32), disc);
    d.rotation.x = -Math.PI / 2;
    rotor.add(d);
    drone.add(rotor);
  }

  // V-tail on the boom ends.
  for (const side of [-1, 1]) {
    add(new THREE.BoxGeometry(0.22, 0.012, 0.12), white, [side * (boomX + 0.06), 0.06, -0.66], [0, 0, side * 0.6], 'vtail');
    add(new THREE.BoxGeometry(0.04, 0.014, 0.121), coffee, [side * (boomX + 0.14), 0.12, -0.66], [0, 0, side * 0.6]);
  }

  // Rear pusher prop.
  add(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 16), dark, [0, 0, -0.58], [Math.PI / 2, 0, 0]);
  const pusher = new THREE.Group();
  pusher.name = 'pusher';
  pusher.position.set(0, 0, -0.62);
  for (let b = 0; b < 2; b++) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.006), blade);
    bl.rotation.z = b * Math.PI;
    pusher.add(bl);
  }
  drone.add(pusher);

  // Nadir camera gimbal.
  add(new THREE.CylinderGeometry(0.05, 0.055, 0.035, 24), dark, [0, -0.1, 0.12]);
  add(new THREE.SphereGeometry(0.035, 24, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), glass, CAMERA_OFFSET, [0, 0, 0], 'camera');

  // Strobe on the tail top.
  add(new THREE.SphereGeometry(0.014, 10, 8), strobeM, [0, 0.1, -0.4], [0, 0, 0], 'strobe');

  // Landing skids.
  for (const side of [-1, 1]) {
    add(new THREE.CylinderGeometry(0.007, 0.007, 0.16, 8), dark, [side * boomX, -0.08, 0.3]);
    add(new THREE.CylinderGeometry(0.007, 0.007, 0.16, 8), dark, [side * boomX, -0.08, -0.4]);
  }

  return drone;
}

// The camera lens and the skids' lowest point, in model units.
const CAMERA_OFFSET: Vec3 = [0, -0.115, 0.12];
const SKID_BOTTOM = 0.165;

// --------------------------------------------------------------- mission --
export type SurveyPhase = 'takeoff' | 'survey' | 'turn' | 'return' | 'landing' | 'complete';

export interface SurveyStatus {
  phase: SurveyPhase;
  line: number; // current survey line, 1-based
  lines: number;
  altitude: number; // camera height above the ground straight below it
  lineSpacing: number;
  photoSpacing: number;
  photos: number;
  plannedPhotos: number;
}

export interface SurveyLayers {
  drone: boolean; // the whole mission: drone, survey box, beam and footprints
  beam: boolean;
  footprints: boolean;
}

export interface SurveyOptions {
  box: { minX: number; maxX: number; minZ: number; maxZ: number };
  altitude: number; // above the take-off point
  fovX: number; // across-track field of view, degrees
  fovY: number; // along-track field of view, degrees
  sideOverlap: number; // 0..1
  frontOverlap: number; // 0..1
  surveySpeed: number; // m/s
  turnSpeed: number;
  transitSpeed: number;
  climbSpeed: number;
  timeScale: number; // simulation speed-up
  droneScale: number; // visual size exaggeration of the 2 m airframe
}

// Where a downward ray first meets the ground.
export type GroundRaycast = (origin: THREE.Vector3, dir: THREE.Vector3, target: THREE.Vector3) => THREE.Vector3;

interface Leg {
  curve: THREE.Curve<THREE.Vector3>;
  phase: Exclude<SurveyPhase, 'complete'>;
  speed: number;
  length: number;
  line: number;
  photos: number; // photo triggers spread evenly along the leg, ends included
  heading: number;
}

// Half circle joining the end of one survey line to the start of the next,
// bulging `dir` (±1 along z) beyond the box edge.
class TurnArc extends THREE.Curve<THREE.Vector3> {
  private readonly x0: number;
  private readonly z0: number;
  private readonly r: number;
  private readonly dir: number;
  private readonly y: number;

  constructor(x0: number, z0: number, r: number, dir: number, y: number) {
    super();
    this.x0 = x0;
    this.z0 = z0;
    this.r = r;
    this.dir = dir;
    this.y = y;
  }

  getPoint(t: number, target = new THREE.Vector3()) {
    const a = Math.PI * (1 - t);
    return target.set(this.x0 + this.r * (1 + Math.cos(a)), this.y, this.z0 + this.dir * this.r * Math.sin(a));
  }
}

// Footprints are a (GRID + 1)² grid of projected rays, so they drape over the terrain.
const GRID = 4;
const GRID_VERTS = (GRID + 1) * (GRID + 1);
const CORNERS = [GRID * (GRID + 1), GRID * (GRID + 1) + GRID, GRID, 0]; // front-left, front-right, back-right, back-left
const CENTRE = (GRID / 2) * (GRID + 1) + GRID / 2;
const STAMP_LIFT = 0.12;
const FOOT_LIFT = 0.2;

// Triangle and outline indices for `count` footprint grids stored back to back.
function gridIndices(count: number) {
  const tri: number[] = [];
  const border: number[] = [];
  const v = (i: number, j: number) => j * (GRID + 1) + i;
  for (let n = 0; n < count; n++) {
    const o = n * GRID_VERTS;
    for (let j = 0; j < GRID; j++) {
      for (let i = 0; i < GRID; i++) {
        const a = o + v(i, j), b = o + v(i + 1, j), c = o + v(i + 1, j + 1), d = o + v(i, j + 1);
        tri.push(a, b, c, a, c, d);
      }
    }
    for (let k = 0; k < GRID; k++) {
      border.push(o + v(k, 0), o + v(k + 1, 0), o + v(k, GRID), o + v(k + 1, GRID));
      border.push(o + v(0, k), o + v(0, k + 1), o + v(GRID, k), o + v(GRID, k + 1));
    }
  }
  return { tri, border };
}

// A footprint grid: translucent fill plus outline, sharing one position buffer.
function footprintMeshes(count: number, color: number) {
  const position = new THREE.BufferAttribute(new Float32Array(count * GRID_VERTS * 3), 3);
  position.setUsage(THREE.DynamicDrawUsage);
  const { tri, border } = gridIndices(count);
  const fillGeo = new THREE.BufferGeometry();
  fillGeo.setAttribute('position', position);
  fillGeo.setIndex(tri);
  const lineGeo = new THREE.BufferGeometry();
  lineGeo.setAttribute('position', position);
  lineGeo.setIndex(border);
  const fill = new THREE.Mesh(fillGeo, new THREE.MeshBasicMaterial({
    color, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  }));
  const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color, transparent: true, depthWrite: false }));
  // The buffers are rewritten in place, so their bounds are never current.
  fill.frustumCulled = lines.frustumCulled = false;
  return { position, fill, lines };
}

const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _hit = new THREE.Vector3();
const _p = new THREE.Vector3();
const _t = new THREE.Vector3();

export class SurveyMission {
  readonly group = new THREE.Group();
  readonly lines: number;
  readonly lineSpacing: number;
  readonly photoSpacing: number;
  readonly plannedPhotos: number;

  private opts: SurveyOptions;
  private raycast: GroundRaycast;
  private heightAt: (x: number, z: number) => number;
  private legs: Leg[] = [];
  private home: THREE.Vector3;
  private tanX: number;
  private tanY: number;

  private drone: THREE.Group;
  private rotors: THREE.Object3D[];
  private pusher: THREE.Object3D;
  private navMaterials: THREE.MeshStandardMaterial[];
  private navLights: THREE.PointLight[];
  private strobeMaterial: THREE.MeshStandardMaterial;
  private strobeLight: THREE.PointLight;

  private beam: THREE.Mesh;
  private beamEdges: THREE.LineSegments;
  private foot: ReturnType<typeof footprintMeshes>;
  private stamps: ReturnType<typeof footprintMeshes>;
  private boxOutline: THREE.LineLoop;
  private shots: { origin: THREE.Vector3; heading: number }[] = [];

  private layers: SurveyLayers = { drone: true, beam: true, footprints: true };
  private night = false;
  private legIdx = 0;
  private legPos = 0; // distance flown along the current leg
  private nextShot = 0;
  private heading = 0;
  private yawRate = 0;
  private altitude = 0;
  private clock = 0;

  constructor(opts: SurveyOptions, raycast: GroundRaycast, heightAt: (x: number, z: number) => number) {
    this.opts = opts;
    this.raycast = raycast;
    this.heightAt = heightAt;
    this.group.name = 'SurveyMission';

    // Flight plan: the camera footprint and the overlaps set the line and
    // trigger spacing; both are tightened so the lines end on the box edges.
    const { box, altitude: alt } = opts;
    this.tanX = Math.tan(THREE.MathUtils.degToRad(opts.fovX / 2));
    this.tanY = Math.tan(THREE.MathUtils.degToRad(opts.fovY / 2));
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    this.lines = Math.max(2, Math.ceil(width / (2 * alt * this.tanX * (1 - opts.sideOverlap))) + 1);
    this.lineSpacing = width / (this.lines - 1);
    const shotsPerLine = Math.max(2, Math.ceil(depth / (2 * alt * this.tanY * (1 - opts.frontOverlap))) + 1);
    this.photoSpacing = depth / (shotsPerLine - 1);
    this.plannedPhotos = shotsPerLine * this.lines;
    this.home = new THREE.Vector3(box.minX, 0, box.minZ);
    this.planLegs(shotsPerLine);

    // Drone.
    this.drone = createSurveyDrone();
    this.drone.scale.setScalar(opts.droneScale);
    this.drone.rotation.order = 'YXZ';
    this.rotors = [0, 1, 2, 3].map((i) => this.drone.getObjectByName(`rotor_${i}`)!);
    this.pusher = this.drone.getObjectByName('pusher')!;
    const material = (name: string) => (this.drone.getObjectByName(name) as THREE.Mesh).material as THREE.MeshStandardMaterial;
    this.navMaterials = [material('nav_left'), material('nav_right')];
    this.navLights = ['nav_left', 'nav_right'].map((name, i) => {
      const light = new THREE.PointLight(i ? 0x2aff6a : 0xff2a2a, 0, 12, 2);
      light.position.copy(this.drone.getObjectByName(name)!.position);
      this.drone.getObjectByName(name)!.parent!.add(light);
      return light;
    });
    this.strobeMaterial = material('strobe');
    this.strobeLight = new THREE.PointLight(0xffffff, 0, 40, 2);
    this.strobeLight.position.set(0, 0.2, -0.4);
    this.drone.add(this.strobeLight);

    // Live camera beam: a four-sided pyramid from the lens to the footprint corners.
    const beamGeo = new THREE.BufferGeometry();
    beamGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(5 * 3), 3));
    beamGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
    this.beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
      color: 0x4fd1ff, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3));
    this.beamEdges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: 0x4fd1ff, transparent: true }));
    this.beam.frustumCulled = this.beamEdges.frustumCulled = false;
    this.foot = footprintMeshes(1, 0x4fd1ff);

    // Photo footprints, one per trigger; the drawn range grows with each photo.
    this.stamps = footprintMeshes(this.plannedPhotos, 0xffb300);

    this.boxOutline = new THREE.LineLoop(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 3, gapSize: 2, transparent: true, opacity: 0.8 }),
    );

    this.group.add(this.drone, this.beam, this.beamEdges, this.foot.fill, this.foot.lines, this.stamps.fill, this.stamps.lines, this.boxOutline);
    this.setNight(false);
    this.restart();
  }

  private planLegs(shotsPerLine: number) {
    const { box, altitude: alt } = this.opts;
    const s = this.opts;
    const line = (a: THREE.Vector3, b: THREE.Vector3) => new THREE.LineCurve3(a, b);
    const at = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
    const push = (leg: Omit<Leg, 'length'>) => this.legs.push({ ...leg, length: leg.curve.getLength() });
    const x0 = this.home.x, z0 = this.home.z;

    push({ curve: line(at(x0, 0, z0), at(x0, alt, z0)), phase: 'takeoff', speed: s.climbSpeed, line: 1, photos: 0, heading: 0 });
    let x = x0, z = z0;
    for (let i = 0; i < this.lines; i++) {
      const dir = i % 2 ? -1 : 1;
      x = box.minX + i * this.lineSpacing;
      const zEnd = dir > 0 ? box.maxZ : box.minZ;
      push({ curve: line(at(x, alt, z), at(x, alt, zEnd)), phase: 'survey', speed: s.surveySpeed, line: i + 1, photos: shotsPerLine, heading: dir > 0 ? 0 : Math.PI });
      z = zEnd;
      if (i < this.lines - 1) {
        push({ curve: new TurnArc(x, z, this.lineSpacing / 2, dir, alt), phase: 'turn', speed: s.turnSpeed, line: i + 2, photos: 0, heading: 0 });
      }
    }
    push({ curve: line(at(x, alt, z), at(x0, alt, z0)), phase: 'return', speed: s.transitSpeed, line: this.lines, photos: 0, heading: 0 });
    push({ curve: line(at(x0, alt, z0), at(x0, 0, z0)), phase: 'landing', speed: s.climbSpeed * 0.75, line: this.lines, photos: 0, heading: 0 });
  }

  // ------------------------------------------------------------ controls --
  setLayers(layers: Partial<SurveyLayers>) {
    Object.assign(this.layers, layers);
    const { drone, beam, footprints } = this.layers;
    this.group.visible = drone;
    this.beam.visible = this.beamEdges.visible = this.foot.fill.visible = this.foot.lines.visible = beam;
    this.stamps.fill.visible = this.stamps.lines.visible = footprints;
  }

  restart() {
    this.legIdx = 0;
    this.legPos = 0;
    this.nextShot = 0;
    this.heading = 0;
    this.yawRate = 0;
    this.shots = [];
    this.drawStamps();
    this.reproject();
    this.place();
  }

  setNight(night: boolean) {
    this.night = night;
    (this.beam.material as THREE.MeshBasicMaterial).opacity = night ? 0.22 : 0.1;
    (this.beamEdges.material as THREE.LineBasicMaterial).opacity = night ? 0.85 : 0.55;
    (this.foot.fill.material as THREE.MeshBasicMaterial).opacity = night ? 0.3 : 0.2;
    (this.foot.lines.material as THREE.LineBasicMaterial).opacity = night ? 1 : 0.8;
    // Overlapping stamps stack their opacity, so well-covered ground shows densest.
    (this.stamps.fill.material as THREE.MeshBasicMaterial).opacity = night ? 0.09 : 0.07;
    (this.stamps.lines.material as THREE.LineBasicMaterial).opacity = night ? 0.45 : 0.3;
    for (const m of this.navMaterials) m.emissiveIntensity = night ? 6 : 1.5;
    for (const light of this.navLights) light.intensity = night ? 25 : 0;
  }

  // Re-drapes the footprints and the survey box over the current ground (after a terrain toggle).
  reproject() {
    const p = this.stamps.position.array as Float32Array;
    this.shots.forEach((shot, n) => this.project(shot.origin, shot.heading, p, n * GRID_VERTS * 3, STAMP_LIFT));
    this.stamps.position.needsUpdate = true;

    const { minX, maxX, minZ, maxZ } = this.opts.box;
    const corners = [[minX, minZ], [maxX, minZ], [maxX, maxZ], [minX, maxZ]];
    const points: THREE.Vector3[] = [];
    corners.forEach(([ax, az], k) => {
      const [bx, bz] = corners[(k + 1) % 4];
      for (let i = 0; i < 40; i++) {
        const x = ax + ((bx - ax) * i) / 40, z = az + ((bz - az) * i) / 40;
        points.push(new THREE.Vector3(x, this.heightAt(x, z) + 0.3, z));
      }
    });
    this.boxOutline.geometry.setFromPoints(points);
    this.boxOutline.computeLineDistances();
  }

  status(): SurveyStatus {
    const leg = this.legs[this.legIdx];
    return {
      phase: leg?.phase ?? 'complete',
      line: leg?.line ?? this.lines,
      lines: this.lines,
      altitude: this.altitude,
      lineSpacing: this.lineSpacing,
      photoSpacing: this.photoSpacing,
      photos: this.shots.length,
      plannedPhotos: this.plannedPhotos,
    };
  }

  // -------------------------------------------------------------- flight --
  update(dt: number) {
    if (!this.layers.drone) return;
    this.clock += dt;

    // Advance along the legs, firing every trigger passed this frame (at its
    // own position, so a long frame doesn't bunch the photos up).
    let remaining = dt * this.opts.timeScale;
    while (remaining > 0 && this.legIdx < this.legs.length) {
      const leg = this.legs[this.legIdx];
      const step = Math.min(remaining, (leg.length - this.legPos) / leg.speed);
      this.legPos += step * leg.speed;
      remaining -= step;
      if (leg.photos) {
        const interval = leg.length / (leg.photos - 1);
        while (this.nextShot < leg.photos && this.nextShot * interval <= this.legPos + 1e-6) {
          this.trigger(leg, (this.nextShot++ * interval) / leg.length);
        }
      }
      if (this.legPos >= leg.length - 1e-6) {
        this.legIdx++;
        this.legPos = 0;
        this.nextShot = 0;
      }
    }

    this.place(dt);
    this.animate(dt);
  }

  // Positions the drone and drops the beam onto the ground below it.
  private place(dt = 0) {
    const leg = this.legs[Math.min(this.legIdx, this.legs.length - 1)];
    const t = this.legIdx < this.legs.length ? this.legPos / leg.length : 1;
    this.pointOn(leg, t, _p);
    leg.curve.getTangent(t, _t);

    // Heading follows the horizontal track (kept during vertical climbs);
    // the drone banks into turns.
    if (Math.hypot(_t.x, _t.z) > 1e-3) {
      const heading = Math.atan2(_t.x, _t.z);
      const delta = Math.atan2(Math.sin(heading - this.heading), Math.cos(heading - this.heading));
      if (dt > 0) this.yawRate += (delta / dt - this.yawRate) * Math.min(1, dt * 6);
      this.heading = heading;
    } else {
      this.yawRate = 0;
    }
    const speed = this.legIdx < this.legs.length ? leg.speed : 0;
    const bank = THREE.MathUtils.clamp(Math.atan((speed * this.yawRate) / (9.81 * this.opts.timeScale)), -0.45, 0.45);
    this.drone.position.copy(_p);
    this.drone.rotation.set(0, this.heading, -bank);

    const origin = this.cameraOrigin(_p, this.heading, _o);
    const foot = this.foot.position.array as Float32Array;
    this.project(origin, this.heading, foot, 0, FOOT_LIFT);
    this.foot.position.needsUpdate = true;
    this.altitude = origin.y - (foot[CENTRE * 3 + 1] - FOOT_LIFT);

    const beam = this.beam.geometry.attributes.position as THREE.BufferAttribute;
    beam.setXYZ(0, origin.x, origin.y, origin.z);
    CORNERS.forEach((v, k) => beam.setXYZ(k + 1, foot[v * 3], foot[v * 3 + 1], foot[v * 3 + 2]));
    beam.needsUpdate = true;
    const edges = this.beamEdges.geometry.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < 4; k++) {
      edges.setXYZ(k * 2, origin.x, origin.y, origin.z);
      edges.setXYZ(k * 2 + 1, beam.getX(k + 1), beam.getY(k + 1), beam.getZ(k + 1));
    }
    edges.needsUpdate = true;
  }

  private animate(dt: number) {
    const phase = this.status().phase;
    // VTOL rotors lift for take-off and landing; the pusher drives cruise.
    const lift = phase === 'takeoff' || phase === 'landing' ? 80 : 0;
    const push = phase === 'survey' || phase === 'turn' || phase === 'return' ? 90 : 0;
    this.rotors.forEach((r, i) => (r.rotation.y += (i % 2 ? -1 : 1) * lift * dt));
    this.pusher.rotation.z += push * dt;

    // Anti-collision strobe: a double flash every 1.2 s.
    const c = this.clock % 1.2;
    const flash = c < 0.06 || (c > 0.18 && c < 0.24);
    this.strobeMaterial.emissiveIntensity = flash ? (this.night ? 12 : 6) : 0.2;
    this.strobeLight.intensity = flash && this.night ? 150 : 0;
  }

  private trigger(leg: Leg, t: number) {
    if (this.shots.length >= this.plannedPhotos) return;
    const origin = this.cameraOrigin(this.pointOn(leg, t, new THREE.Vector3()), leg.heading, new THREE.Vector3());
    this.shots.push({ origin, heading: leg.heading });
    const n = this.shots.length - 1;
    this.project(origin, leg.heading, this.stamps.position.array as Float32Array, n * GRID_VERTS * 3, STAMP_LIFT);
    this.stamps.position.needsUpdate = true;
    this.drawStamps();
  }

  private drawStamps() {
    const n = this.shots.length;
    this.stamps.fill.geometry.setDrawRange(0, n * GRID * GRID * 6);
    this.stamps.lines.geometry.setDrawRange(0, n * GRID * 8);
  }

  // Drone position at `t` along a leg: plan heights are above the take-off point.
  private pointOn(leg: Leg, t: number, target: THREE.Vector3) {
    leg.curve.getPoint(t, target);
    target.y += this.heightAt(this.home.x, this.home.z) + SKID_BOTTOM * this.opts.droneScale;
    return target;
  }

  // The gimbal keeps the camera level, so only the heading turns the lens offset.
  private cameraOrigin(dronePos: THREE.Vector3, heading: number, target: THREE.Vector3) {
    const k = this.opts.droneScale;
    const [, oy, oz] = CAMERA_OFFSET;
    return target.set(dronePos.x + Math.sin(heading) * oz * k, dronePos.y + oy * k, dronePos.z + Math.cos(heading) * oz * k);
  }

  // Casts the footprint's grid of rays from the lens and writes the ground hits into `out`.
  private project(origin: THREE.Vector3, heading: number, out: Float32Array, offset: number, lift: number) {
    const c = Math.cos(heading), s = Math.sin(heading);
    for (let j = 0; j <= GRID; j++) {
      for (let i = 0; i <= GRID; i++) {
        const lx = ((i / GRID) * 2 - 1) * this.tanX; // across track
        const lz = ((j / GRID) * 2 - 1) * this.tanY; // along track
        _d.set(lx * c + lz * s, -1, -lx * s + lz * c).normalize();
        this.raycast(origin, _d, _hit);
        const k = offset + (j * (GRID + 1) + i) * 3;
        out[k] = _hit.x;
        out[k + 1] = _hit.y + lift;
        out[k + 2] = _hit.z;
      }
    }
  }

  dispose() {
    // Line geometries and materials; the scene's mesh disposal covers the rest.
    for (const obj of [this.beamEdges, this.foot.lines, this.stamps.lines, this.boxOutline]) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    }
  }
}
