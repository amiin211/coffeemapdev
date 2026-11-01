// Temporary works and site preparation for the mosque's 4D construction view:
// the graded earthworks pad, the foundation slab, the access road to the
// existing paved road, a tower crane and the scaffold round the building.
// Driven by the indicative schedule (mosqueSchedule.ts), one day at a time.
import * as THREE from 'three';
import type { Phase, Schedule } from '@/lib/mosqueSchedule';

export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Access road: from the site's south-east entrance on the internal loop road
// to the bend of the existing paved road seen in the orthophoto (centred
// model coordinates, metres; traced from ortho2.jpg).
export const ACCESS_ROAD: [number, number][] = [
  [72.9, 73.6], [77.5, 81], [84, 93], [91, 106], [98, 120], [103, 132], [106.5, 142], [108, 150],
];
// The existing paved road through the valley, traced from ortho2.jpg: it is
// surfaced with asphalt in terrain mode (in grass mode it lies off the lawn).
export const EXISTING_ROAD: [number, number][] = [
  [216.2, 192.5], [206.2, 176.5], [194.2, 158.5], [178.2, 146.5], [162.2, 140.5], [142.2, 139.3], [124.3, 141.7],
  [112.3, 146.5], [104.2, 156.5], [99.1, 170.5], [96.3, 190.5], [94.2, 210.5], [93.4, 228.5], [95.1, 246.5],
  [99.1, 262.5], [105.4, 280.5], [112.3, 298.5], [119, 316.5], [126.2, 334.5], [135, 354.5], [144.2, 374.5],
  [153.5, 394.5], [159, 409.8],
];
const EXISTING_ROAD_WIDTH = 6;
export const ROAD_WIDTH = 6.5;

const SOIL = 0xb2a690; // graded, compacted fill (greyish tan: the warm sun adds the rest)
const GRAVEL = 0xb3a48a;
const ASPHALT = 0x3b3a3a;
const CONCRETE = 0xa7a39b;
const CRANE_YELLOW = 0xf2b705;
const SCAFFOLD = 0x9aa3a8;

// A ribbon of `width` along a smoothed polyline, draped on the ground.
function ribbonGeometry(points: [number, number][], width: number, heightAt: (x: number, z: number) => number, lift: number, segments: number) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const pts = curve.getSpacedPoints(segments);
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const p = pts[i];
    const t = curve.getTangentAt(i / segments);
    const len = Math.hypot(t.x, t.z) || 1;
    const nx = -t.z / len, nz = t.x / len;
    for (const side of [-1, 1]) {
      const x = p.x + (side * nx * width) / 2, z = p.z + (side * nz * width) / 2;
      pos.push(x, heightAt(x, z) + lift, z);
      uv.push(side < 0 ? 0 : 1, i / segments);
    }
    if (i < segments) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const progressIn = (day: number, p: Phase | undefined) => (p ? (day - p.start) / Math.max(1, p.end - p.start) : 0);

// A speckled soil texture so the graded pad doesn't read as flat paint.
function soilTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  let seed = 11;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < size * size; i++) {
    const v = 200 + rand() * 55;
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v * 0.97;
    img.data[i * 4 + 2] = v * 0.93;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(30, 30);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function towerCrane(height: number, jib: number) {
  const crane = new THREE.Group();
  const yellow = new THREE.MeshStandardMaterial({ color: CRANE_YELLOW, roughness: 0.6, metalness: 0.2 });
  const steel = new THREE.LineBasicMaterial({ color: 0xd49a00 });
  const concrete = new THREE.MeshStandardMaterial({ color: CONCRETE, roughness: 0.9 });
  const w = 1.6;

  // Mast: four chords with zig-zag lattice bracing.
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const chord = new THREE.Mesh(new THREE.BoxGeometry(0.16, height, 0.16), yellow);
    chord.position.set((x * w) / 2, height / 2, (z * w) / 2);
    crane.add(chord);
  }
  const brace: number[] = [];
  for (let y = 0; y < height; y += w) {
    const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
    for (let s = 0; s < 4; s++) {
      const [ax, az] = corners[s], [bx, bz] = corners[(s + 1) % 4];
      brace.push((ax * w) / 2, y, (az * w) / 2, (bx * w) / 2, y + w, (bz * w) / 2);
      brace.push((ax * w) / 2, y + w, (az * w) / 2, (bx * w) / 2, y + w, (bz * w) / 2);
    }
  }
  const braceGeo = new THREE.BufferGeometry();
  braceGeo.setAttribute('position', new THREE.Float32BufferAttribute(brace, 3));
  crane.add(new THREE.LineSegments(braceGeo, steel));
  const base = new THREE.Mesh(new THREE.BoxGeometry(5, 1, 5), concrete);
  base.position.y = 0.5;
  crane.add(base);

  // Slewing part: jib, counter-jib with ballast, cab, trolley and hook.
  const slew = new THREE.Group();
  slew.position.y = height;
  const jibMesh = new THREE.Mesh(new THREE.BoxGeometry(jib, 1.1, 1.1), yellow);
  jibMesh.position.x = jib / 2;
  const counter = new THREE.Mesh(new THREE.BoxGeometry(jib * 0.3, 0.9, 1.1), yellow);
  counter.position.x = -jib * 0.15;
  const ballast = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2, 1.6), concrete);
  ballast.position.set(-jib * 0.27, -0.6, 0);
  const apex = new THREE.Mesh(new THREE.BoxGeometry(1, 6, 1), yellow);
  apex.position.y = 3.5;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color: 0xf5f1e6, roughness: 0.5 }));
  cab.position.set(1.2, -1.4, 1.4);
  const ties = new THREE.BufferGeometry();
  ties.setAttribute('position', new THREE.Float32BufferAttribute([0, 6.5, 0, jib * 0.7, 0.6, 0, 0, 6.5, 0, -jib * 0.3, 0.5, 0], 3));
  const trolleyX = jib * 0.65;
  const hookLine = new THREE.BufferGeometry();
  hookLine.setAttribute('position', new THREE.Float32BufferAttribute([trolleyX, -0.5, 0, trolleyX, -height * 0.55, 0], 3));
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1, 0.8), new THREE.MeshStandardMaterial({ color: 0x333333 }));
  hook.position.set(trolleyX, -height * 0.55 - 0.5, 0);
  slew.add(jibMesh, counter, ballast, apex, cab, new THREE.LineSegments(ties, steel), new THREE.Line(hookLine, new THREE.LineBasicMaterial({ color: 0x222222 })), hook);
  crane.add(slew);
  crane.traverse((o) => {
    if (o instanceof THREE.Mesh) o.castShadow = true;
  });
  return { crane, slew };
}

export class ConstructionSite {
  readonly group = new THREE.Group();
  private pad: THREE.Mesh;
  private slab: THREE.Mesh;
  private road: THREE.Mesh;
  private roadIndexCount = 0;
  private existingRoad: THREE.Mesh;
  private crane: THREE.Group;
  private slew: THREE.Group;
  private scaffold: THREE.LineSegments;
  private scaffoldHeight = -1;
  private building: Rect;
  private heightAt: (x: number, z: number) => number;
  private active = false;

  constructor(site: Rect, building: Rect, buildingTop: number, heightAt: (x: number, z: number) => number) {
    this.building = building;
    this.heightAt = heightAt;

    // Earthworks: the graded, compacted pad over the whole site.
    const padW = site.maxX - site.minX + 6, padD = site.maxZ - site.minZ + 6;
    this.pad = new THREE.Mesh(
      new THREE.PlaneGeometry(padW, padD),
      new THREE.MeshStandardMaterial({ color: SOIL, map: soilTexture(), roughness: 1, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    );
    this.pad.rotation.x = -Math.PI / 2;
    this.pad.position.set((site.minX + site.maxX) / 2, -0.03, (site.minZ + site.maxZ) / 2);
    this.pad.receiveShadow = true;

    // Foundations: raft / ground slab under the building.
    const slabW = building.maxX - building.minX + 2, slabD = building.maxZ - building.minZ + 2;
    this.slab = new THREE.Mesh(new THREE.BoxGeometry(slabW, 0.35, slabD), new THREE.MeshStandardMaterial({ color: CONCRETE, roughness: 0.85 }));
    this.slab.geometry.translate(slabW / 2, -0.175, 0); // grows from its west edge
    this.slab.position.set(building.minX - 1, -0.005, (building.minZ + building.maxZ) / 2);
    this.slab.receiveShadow = true;

    // Access road ribbon, draped on the ground.
    this.road = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshStandardMaterial({ color: GRAVEL, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    this.road.receiveShadow = true;
    this.existingRoad = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshStandardMaterial({ color: ASPHALT, roughness: 0.92, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    );
    this.existingRoad.receiveShadow = true;
    this.drape();

    // Tower crane beside the building, tall enough to clear the minaret.
    const { crane, slew } = towerCrane(Math.max(34, buildingTop + 12), 42);
    crane.position.set(building.maxX + 7, 0, (building.minZ + building.maxZ) / 2 + 6);
    this.crane = crane;
    this.slew = slew;

    this.scaffold = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: SCAFFOLD, transparent: true, opacity: 0.85 }));

    this.group.add(this.pad, this.slab, this.road, this.existingRoad, this.crane, this.scaffold);
    this.setDay(null, null);
  }

  /** Re-drapes the roads over the current ground (grass or terrain mode). */
  drape(heightAt = this.heightAt, terrainMode = false) {
    this.heightAt = heightAt;
    const n = 120;
    this.road.geometry.dispose();
    this.road.geometry = ribbonGeometry(ACCESS_ROAD, ROAD_WIDTH, heightAt, 0.12, n);
    this.roadIndexCount = n * 6;
    // The terrain mesh is ~1 m resolution, so lift the long road a little more.
    this.existingRoad.geometry.dispose();
    this.existingRoad.geometry = ribbonGeometry(EXISTING_ROAD, EXISTING_ROAD_WIDTH, heightAt, 0.3, 400);
    this.existingRoad.visible = terrainMode;
  }

  private buildScaffold(height: number) {
    const b = this.building, off = 1.2, bay = 2.5, lift = 2;
    const x0 = b.minX - off, x1 = b.maxX + off, z0 = b.minZ - off, z1 = b.maxZ + off;
    const pts: number[] = [];
    const perimeter: [number, number][] = [];
    const along = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az);
      const n = Math.max(1, Math.round(len / bay));
      for (let i = 0; i < n; i++) perimeter.push([ax + ((bx - ax) * i) / n, az + ((bz - az) * i) / n]);
    };
    along(x0, z0, x1, z0);
    along(x1, z0, x1, z1);
    along(x1, z1, x0, z1);
    along(x0, z1, x0, z0);
    for (const [x, z] of perimeter) pts.push(x, 0, z, x, height, z); // standards
    for (let y = lift; y <= height + 0.01; y += lift) {
      for (let i = 0; i < perimeter.length; i++) {
        const [ax, az] = perimeter[i], [bx, bz] = perimeter[(i + 1) % perimeter.length];
        pts.push(ax, y, az, bx, y, bz); // ledgers
        if ((i + Math.round(y / lift)) % 3 === 0) pts.push(ax, y - lift, az, bx, y, bz); // diagonal bracing
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.scaffold.geometry.dispose();
    this.scaffold.geometry = geo;
  }

  /** Shows the site as it is on `day` (null hides all temporary works). */
  setDay(day: number | null, schedule: Schedule | null) {
    this.active = day !== null && !!schedule;
    if (day === null || !schedule) {
      this.pad.visible = this.slab.visible = this.crane.visible = this.scaffold.visible = false;
      this.road.visible = true; // the finished access road stays
      (this.road.material as THREE.MeshStandardMaterial).color.set(ASPHALT);
      this.road.geometry.setDrawRange(0, this.roadIndexCount);
      return;
    }
    const phase = (id: Phase['id']) => schedule.phases.find((p) => p.id === id);
    const external = phase('external');
    const finishes = phase('finishes');
    const structure = phase('structure');

    // Earthworks: the graded area spreads out from the centre.
    const earth = ease(progressIn(day, phase('earthworks')));
    this.pad.visible = earth > 0 && day < (external ? external.start + 60 : Infinity);
    this.pad.scale.set(Math.max(0.01, earth), Math.max(0.01, earth), 1);

    // Access road: sub-base laid along its length, then surfaced.
    const road = progressIn(day, phase('road'));
    this.road.visible = road > 0;
    this.road.geometry.setDrawRange(0, Math.round((Math.min(1, road / 0.65) * this.roadIndexCount) / 6) * 6);
    (this.road.material as THREE.MeshStandardMaterial).color.set(road >= 0.65 ? ASPHALT : GRAVEL);

    // Foundations: poured bay by bay from the west.
    const found = ease(progressIn(day, phase('foundations')));
    this.slab.visible = found > 0 && day < (external ? external.start + 60 : Infinity);
    this.slab.scale.x = Math.max(0.01, found);

    // Crane: erected after the foundations, dismantled when the finishes start.
    this.crane.visible = !!structure && day >= structure.start - 7 && day < (finishes ? finishes.start + 10 : structure.end);

    // Scaffold: climbs with the structure, struck top-down during the finishes.
    let h = schedule.structureHeight(day);
    if (finishes && day >= finishes.start) h *= 1 - Math.min(1, progressIn(day, finishes));
    if (structure && day < structure.start) h = 0;
    h = Math.min(h + 1, schedule.building.top + 1.5);
    this.scaffold.visible = h > 1.2;
    if (this.scaffold.visible && Math.abs(h - this.scaffoldHeight) > 0.4) {
      this.buildScaffold(Math.floor(h / 2) * 2 || 2);
      this.scaffoldHeight = h;
    }
  }

  /** Slowly slews the crane while the site is active. */
  animate(dt: number) {
    if (this.active && this.crane.visible) this.slew.rotation.y += dt * 0.12;
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments || o instanceof THREE.Line) {
        o.geometry.dispose();
        const m = o.material as THREE.Material & { map?: THREE.Texture | null };
        m.map?.dispose();
        m.dispose();
      }
    });
  }
}
