// Mosque environment: the mosque model with per-mesh colors, a grass ground or
// DTM terrain, vegetation, site traffic, and day (HDRI) / night (point lights) lighting.
// Ported from the standalone Vite project in ~/environment (1 unit = 1 m).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// HDRLoader is three's current name for RGBELoader (deprecated alias since r180).
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

const DATA = '/data/3d';

// ------------------------------------------------------------------ config --
export const CONFIG = {
  // Grass
  GROUND_SIZE: 300,
  GRASS_REPEAT: 20,
  // Radius of the grass-free circle under the mosque. null = fit it to the
  // model's footprint (the model's site, incl. parking, is ~155 m square).
  HOLE_RADIUS: null as number | null,

  // Terrain: the DTM (bare ground) at true scale. dtm16.png stores 16-bit
  // heights as R * 256 + G (made by scripts/build-dtm16.py); for an ordinary
  // 8-bit grayscale heightmap set HEIGHTMAP_ENCODING to 'gray8'.
  HEIGHTMAP: `${DATA}/dtm16.png`,
  HEIGHTMAP_ENCODING: 'rg16' as 'rg16' | 'gray8',
  ORTHO: `${DATA}/ortho2.jpg`,
  START_IN_TERRAIN: true,
  START_AT_NIGHT: true,
  TERRAIN_WIDTH: 507.5, // 1015 px x 0.5 m
  TERRAIN_DEPTH: 819.5, // 1639 px x 0.5 m
  TERRAIN_SEGMENTS: 512,
  DISPLACEMENT_SCALE: 448.88, // 2793.35 m - 2344.47 m: the DTM's real height range
  // The terrain is flattened under the mosque and blends back over this distance.
  TERRAIN_BLEND: 40,

  // The model's floor: dark asphalt for the driveways and parking, light
  // paving inside the PLAZA rectangle around the building (centred model
  // coordinates, metres).
  ASPHALT_COLOR: 0x2b2b2e,
  PAVING_COLOR: 0xb8b2a6,
  PLAZA: { minX: -67, maxX: 68, minZ: -4, maxZ: 68 },

  // Traffic drives one-way, single file, along a closed loop over the model's
  // asphalt (made by extract_site_route.py from the floor geometry).
  SITE_ROUTE: `${DATA}/site-route.json`,
  SITE_CARS: 30,
  SITE_SPEED: 4, // m/s (~15 km/h)
  // The two parking aisles between the shade rows aren't connected to that
  // loop; cars circulate inside each one in two opposite lanes, turning round
  // in the end caps. (x0, z0) / (x1, z1) = U-turn centres on the aisle's
  // centre line (centred model coordinates, measured from the floor geometry;
  // the aisles are ~3.7 m wide and very slightly skewed).
  PARKING_AISLES: [
    { x0: -50.1, z0: -31.35, x1: -11.8, z1: -31.55 },
    { x0: 11.8, z0: -31.72, x1: 50.1, z1: -32.1 },
  ],
  AISLE_CARS: 3, // per aisle
  AISLE_SPEED: 2.5, // m/s
  // Share of parking bays (two per shade) that have a car parked in them.
  PARKING_OCCUPANCY: 0.9,

  TREE_COUNT: 45,
  PALM_COUNT: 30,
  SEED: 7,

  // Daylight: warm golden sun and ambient; the sky HDRI's (cool, blue) share
  // of the lighting is turned down so the warm tint shows.
  DAY_SUN_COLOR: 0xffd29a,
  DAY_SUN_INTENSITY: 3,
  DAY_AMBIENT_COLOR: 0xffe4c4,
  DAY_AMBIENT_INTENSITY: 0.35,
  DAY_ENVIRONMENT_INTENSITY: 0.6,
  DAY_EXPOSURE: 0.9,

  // Night lighting: lights on this many of the model's own light poles.
  POLE_LIGHTS: 12,
  POLE_LIGHT_INTENSITY: 250,
  FLOODLIGHT_INTENSITY: 1000,
};

const SUN_DIR = new THREE.Vector3(10, 20, 10).normalize();

// Mosque material colors (floors get floorMaterial() instead), first match on the lower-cased mesh name wins.
const MOSQUE_COLORS: [string, number][] = [
  ['door', 0x6b4423], // brown
  ['window', 0x3a6ea5], // blue
  ['m_fixed', 0x3a6ea5], // fixed glazing panels are windows too
  ['dome', 0x2e8b57],
  ['roof', 0xd9d4c7],
  ['wall', 0xffffff], // white (walls + wall sweeps)
  ['rail', 0x333333],
  ['step', 0xbdb6a8],
  ['stairs', 0xbdb6a8],
  ['parking shade', 0xf0f0f0],
  ['electric poll', 0x777777],
];
const MOSQUE_DEFAULT_COLOR = 0xffffff;

// Vehicle models (all +Z forward) and how often each shows up.
type WeightKey = 'traffic' | 'parked' | 'aisle';
const VEHICLES: Record<string, { url: string } & Partial<Record<WeightKey, number>>> = {
  // `aisle`: only sedans are narrow enough (1.8 m) to pass in the aisles.
  car: { url: `${DATA}/car.glb`, traffic: 4, parked: 5, aisle: 1 },
  suv: { url: `${DATA}/suv.glb`, traffic: 3, parked: 3 },
  pickup: { url: `${DATA}/pickup.glb`, traffic: 2, parked: 2 },
  van: { url: `${DATA}/van.glb`, traffic: 2, parked: 1 },
};
const CAR_COLORS = [
  0xf4f4f4, 0xf4f4f4, 0xc0c4c8, 0xc0c4c8, 0x1c1c1e, 0x5a5e63,
  0xa3171b, 0x1f4e9c, 0x1d3b2a, 0xd8c9a3, 0xf2c200, 0x6b1a24,
];
const _p = new THREE.Vector3();
const _tangent = new THREE.Vector3();

interface HeightData {
  values: Float32Array;
  width: number;
  height: number;
  base: number;
}
interface Route {
  curve: THREE.Curve<THREE.Vector3>;
  speed: number;
  length: number;
}
interface Mover {
  obj: THREE.Object3D;
  route: Route;
  t: number;
}
// Small deterministic RNG so the vegetation layout is the same every load.
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class MosqueEnvironment {
  terrainMode = false;
  night = false;

  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;

  private container: HTMLElement;
  private ambient: THREE.AmbientLight;
  private sun: THREE.DirectionalLight;
  private traffic: Mover[] = [];
  private paints = new Map<number, THREE.MeshStandardMaterial>();
  private vehicleModels: Record<string, THREE.Object3D> = {};
  private hdri!: THREE.DataTexture;
  private mosque!: THREE.Object3D;
  private holeRadius = 0;
  private grass!: THREE.Group;
  private height!: HeightData;
  private terrain!: THREE.Mesh;
  private vegetation!: THREE.Group;
  private nightLights: { light: THREE.Light; intensity: number }[] = [];
  private bulbMaterial!: THREE.MeshStandardMaterial;
  private resizeObserver: ResizeObserver;
  private lastTime = performance.now();

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(50, this.aspect(), 0.5, 5000);
    this.camera.position.set(10, 8, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    // PCFSoftShadowMap was removed in r18x; PCFShadowMap is now the soft variant.
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;

    this.ambient = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(this.ambient);

    const sun = new THREE.DirectionalLight(0xffffff, 2.5);
    sun.position.set(10, 20, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.05;
    this.scene.add(sun, sun.target);
    this.sun = sun;

    this.resizeObserver = new ResizeObserver(() => {
      if (!container.clientWidth || !container.clientHeight) return;
      this.camera.aspect = this.aspect();
      this.camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    });
    this.resizeObserver.observe(container);
  }

  private aspect() {
    return this.container.clientWidth / Math.max(this.container.clientHeight, 1);
  }

  async load(onProgress: (fraction: number) => void = () => {}) {
    const manager = new THREE.LoadingManager();
    manager.onProgress = (_url, loaded, total) => onProgress(loaded / total);
    const gltf = new GLTFLoader(manager);
    const textures = new THREE.TextureLoader(manager);

    const vehicleTypes = Object.keys(VEHICLES);
    const [mosque, tree, palm, hdri, grassTex, orthoTex, height, route, ...vehicles] = await Promise.all([
      gltf.loadAsync(`${DATA}/mosque.glb`),
      gltf.loadAsync(`${DATA}/tree.glb`),
      gltf.loadAsync(`${DATA}/palm.glb`),
      new HDRLoader(manager).loadAsync(`${DATA}/hdri.hdr`),
      textures.loadAsync(`${DATA}/grass.jpg`),
      textures.loadAsync(CONFIG.ORTHO),
      loadHeightData(CONFIG.HEIGHTMAP, CONFIG.HEIGHTMAP_ENCODING),
      fetch(CONFIG.SITE_ROUTE).then((r) => r.json() as Promise<{ points: [number, number][] }>),
      ...vehicleTypes.map((type) => gltf.loadAsync(VEHICLES[type].url)),
    ]);
    this.vehicleModels = Object.fromEntries(vehicleTypes.map((type, i) => [type, vehicles[i].scene]));

    hdri.mapping = THREE.EquirectangularReflectionMapping;
    this.hdri = hdri;

    this.mosque = this.setupMosque(mosque.scene);
    this.holeRadius = CONFIG.HOLE_RADIUS ?? footprintRadius(this.mosque);

    this.grass = createGrass(grassTex, this.holeRadius);
    this.scene.add(this.grass);

    this.height = height;
    this.terrain = this.createTerrain(orthoTex);
    this.scene.add(this.terrain);

    this.vegetation = this.scatterVegetation(tree.scene, palm.scene);

    const rand = mulberry32(CONFIG.SEED + 1);
    this.createTraffic(route, rand);
    this.parkCars(rand);

    this.createNightLights();
    this.frameCamera();
    this.setTerrainMode(CONFIG.START_IN_TERRAIN);
    this.setNight(CONFIG.START_AT_NIGHT);
  }

  // ---------------------------------------------------------------- mosque --
  private setupMosque(model: THREE.Object3D) {
    // The export contains Blender's default "Cube" at the origin; drop it.
    model.getObjectByName('Cube')?.removeFromParent();

    // One shared material per color keeps this ~800-mesh model cheap to draw.
    const materials = new Map<number, THREE.MeshStandardMaterial>();
    const floor = floorMaterial();
    model.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.castShadow = true;
      obj.receiveShadow = true;
      const name = meshName(obj);
      if (name.includes('floor')) {
        obj.material = floor;
        return;
      }
      const color = MOSQUE_COLORS.find(([key]) => name.includes(key))?.[1] ?? MOSQUE_DEFAULT_COLOR;
      if (!materials.has(color)) {
        materials.set(color, new THREE.MeshStandardMaterial({
          color,
          roughness: 0.6,
          metalness: 0.1,
          side: THREE.DoubleSide,
        }));
      }
      obj.material = materials.get(color);
    });

    // The geometry sits ~1 km from its origin, so centre it on (0, 0, 0)
    // horizontally with its base resting on y = 0.
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x, -box.min.y, -center.z);
    this.scene.add(model);
    return model;
  }

  // --------------------------------------------------------------- terrain --
  private createTerrain(orthoTex: THREE.Texture) {
    const { TERRAIN_WIDTH: w, TERRAIN_DEPTH: d, TERRAIN_SEGMENTS: seg, DISPLACEMENT_SCALE: scale } = CONFIG;
    const h = this.height;

    // Flatten the heightmap under the mosque so the building sits on level
    // ground, then use the edited copy as the displacement map.
    flattenHeights(h, this.holeRadius, CONFIG.TERRAIN_BLEND);
    const displacement = heightTexture(h);

    orthoTex.colorSpace = THREE.SRGBColorSpace;
    orthoTex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const terrain = new THREE.Mesh(
      new THREE.PlaneGeometry(w, d, seg, seg),
      new THREE.MeshStandardMaterial({
        map: orthoTex,
        displacementMap: displacement,
        displacementScale: scale,
        roughness: 1,
        metalness: 0,
      }),
    );
    terrain.rotation.x = -Math.PI / 2;
    // Put the flattened pad at y = 0 (slightly below, to sit under the floor slab).
    terrain.position.y = -h.base * scale - 0.05;
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    return terrain;
  }

  // Ground height at world (x, z) for the current mode.
  heightAt(x: number, z: number) {
    if (!this.terrainMode) return 0;
    const { values, width, height, base } = this.height;
    const u = (x / CONFIG.TERRAIN_WIDTH + 0.5) * (width - 1);
    const v = (z / CONFIG.TERRAIN_DEPTH + 0.5) * (height - 1);
    if (u < 0 || v < 0 || u > width - 1 || v > height - 1) return 0;
    const x0 = Math.floor(u), y0 = Math.floor(v);
    const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
    const fx = u - x0, fy = v - y0;
    const top = values[y0 * width + x0] * (1 - fx) + values[y0 * width + x1] * fx;
    const bottom = values[y1 * width + x0] * (1 - fx) + values[y1 * width + x1] * fx;
    return (top * (1 - fy) + bottom * fy - base) * CONFIG.DISPLACEMENT_SCALE;
  }

  // ------------------------------------------------------------ vegetation --
  private scatterVegetation(treeModel: THREE.Object3D, palmModel: THREE.Object3D) {
    const rand = mulberry32(CONFIG.SEED);
    const half = CONFIG.GROUND_SIZE / 2 - 4;
    const placed: THREE.Vector3[] = [];

    const fits = (x: number, z: number) =>
      Math.hypot(x, z) > this.holeRadius + 3 &&
      placed.every((p) => Math.hypot(p.x - x, p.z - z) > 5);

    const group = new THREE.Group();
    const scatter = (source: THREE.Object3D, count: number, minScale: number, maxScale: number) => {
      for (let n = 0, tries = 0; n < count && tries < count * 200; tries++) {
        const x = (rand() * 2 - 1) * half;
        const z = (rand() * 2 - 1) * half;
        if (!fits(x, z)) continue;
        const obj = source.clone();
        obj.position.set(x, 0, z);
        obj.rotation.y = rand() * Math.PI * 2;
        obj.scale.setScalar(minScale + rand() * (maxScale - minScale));
        obj.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        group.add(obj);
        placed.push(obj.position);
        n++;
      }
    };
    scatter(treeModel, CONFIG.TREE_COUNT, 0.8, 1.4);
    scatter(palmModel, CONFIG.PALM_COUNT, 0.9, 1.3);
    this.scene.add(group);
    return group;
  }

  // -------------------------------------------------------------- vehicles --
  private makeVehicle(type: string, color: number) {
    if (!this.paints.has(color)) {
      this.paints.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.4 }));
    }
    const vehicle = this.vehicleModels[type].clone();
    vehicle.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      if (obj.material.name === 'Paint') obj.material = this.paints.get(color);
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
    return vehicle;
  }

  private randomVehicle(rand: () => number, weightKey: WeightKey) {
    const types = Object.keys(VEHICLES).filter((t) => (VEHICLES[t][weightKey] ?? 0) > 0);
    let r = rand() * types.reduce((sum, t) => sum + (VEHICLES[t][weightKey] ?? 0), 0);
    const type = types.find((t) => (r -= VEHICLES[t][weightKey] ?? 0) < 0) ?? types[0];
    const color = CAR_COLORS[Math.floor(rand() * CAR_COLORS.length)];
    return this.makeVehicle(type, color);
  }

  // Each route gets evenly spaced cars that all share the route's speed, so
  // they never run into each other.
  private addRoute(
    curve: THREE.CatmullRomCurve3,
    count: number,
    speed: number,
    weightKey: WeightKey,
    rand: () => number,
    group: THREE.Group,
  ) {
    curve.arcLengthDivisions = Math.max(200, Math.ceil(curve.getLength() * 4));
    const route = { curve, speed, length: curve.getLength() };
    for (let i = 0; i < count; i++) {
      const obj = this.randomVehicle(rand, weightKey);
      group.add(obj);
      this.traffic.push({ obj, route, t: (i + rand() * 0.4) / count });
    }
  }

  private createTraffic(route: { points: [number, number][] }, rand: () => number) {
    // The model's floor surface is at its original y = 0.
    const y = this.mosque.position.y;
    const group = new THREE.Group();

    // Main loop over the site's asphalt.
    const points = route.points.map(([x, z]) => new THREE.Vector3(x, y, z));
    const site = new THREE.CatmullRomCurve3(points, true, 'centripetal');
    this.addRoute(site, CONFIG.SITE_CARS, CONFIG.SITE_SPEED, 'traffic', rand, group);

    // Parking aisles: eastbound lane on the south (+z) side, westbound on the
    // north side (right-hand traffic), joined by U-turns in the end caps.
    const lane = 0.95;
    for (const { x0, z0, x1, z1 } of CONFIG.PARKING_AISLES) {
      const path = new THREE.CurvePath<THREE.Vector3>();
      path.add(new THREE.LineCurve3(new THREE.Vector3(x0, y, z0 + lane), new THREE.Vector3(x1, y, z1 + lane)));
      path.add(uTurn(x1, y, z1, lane, 1));
      path.add(new THREE.LineCurve3(new THREE.Vector3(x1, y, z1 - lane), new THREE.Vector3(x0, y, z0 - lane)));
      path.add(uTurn(x0, y, z0, lane, -1));
      const curve = new THREE.CatmullRomCurve3(path.getSpacedPoints(200).slice(0, -1), true, 'centripetal');
      this.addRoute(curve, CONFIG.AISLE_CARS, CONFIG.AISLE_SPEED, 'aisle', rand, group);
    }
    this.scene.add(group);
  }

  // Two cars side by side under each parking shade in the mosque model.
  private parkCars(rand: () => number) {
    const group = new THREE.Group();
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    this.mosque.updateMatrixWorld(true);
    this.mosque.traverse((shade) => {
      if (!(shade instanceof THREE.Mesh) || !meshName(shade).includes('parking shade')) return;
      box.setFromObject(shade).getSize(size);
      box.getCenter(center);
      // Cars sit side by side along the shade's longer side.
      const alongX = size.x > size.z;
      for (const side of [-1, 1]) {
        if (rand() > CONFIG.PARKING_OCCUPANCY) continue;
        const car = this.randomVehicle(rand, 'parked');
        const offset = (side * (alongX ? size.x : size.z)) / 4;
        car.position.set(center.x + (alongX ? offset : 0), box.min.y, center.z + (alongX ? 0 : offset));
        car.rotation.y = (alongX ? 0 : Math.PI / 2) + (rand() < 0.5 ? 0 : Math.PI);
        group.add(car);
      }
    });
    this.scene.add(group);
  }

  // ---------------------------------------------------------- night lights --
  private createNightLights() {
    this.bulbMaterial = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 0 });
    const bulbGeo = new THREE.SphereGeometry(0.3, 12, 8);

    // Find the tops of the model's light poles (a pole can be several meshes).
    const poles: THREE.Vector3[] = [];
    const box = new THREE.Box3();
    const c = new THREE.Vector3();
    this.mosque.updateMatrixWorld(true);
    this.mosque.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !meshName(obj).includes('electric poll')) return;
      box.setFromObject(obj).getCenter(c);
      const top = new THREE.Vector3(c.x, box.max.y, c.z);
      const same = poles.find((p) => Math.hypot(p.x - top.x, p.z - top.z) < 1.5);
      if (same) same.y = Math.max(same.y, top.y);
      else poles.push(top);
    });

    // Light a well spread-out subset (farthest-point sampling).
    const chosen = poles.length ? [poles[0]] : [];
    while (chosen.length < Math.min(CONFIG.POLE_LIGHTS, poles.length)) {
      let best = poles[0];
      let bestDist = -1;
      for (const p of poles) {
        const d = Math.min(...chosen.map((q) => Math.hypot(p.x - q.x, p.z - q.z)));
        if (d > bestDist) [best, bestDist] = [p, d];
      }
      chosen.push(best);
    }
    for (const top of chosen) {
      const bulb = new THREE.Mesh(bulbGeo, this.bulbMaterial);
      bulb.position.set(top.x, top.y - 0.4, top.z);
      const light = new THREE.PointLight(0xffc98a, 0, 45, 2);
      light.position.copy(bulb.position);
      this.scene.add(bulb, light);
      this.nightLights.push({ light, intensity: CONFIG.POLE_LIGHT_INTENSITY });
    }

    // Four warm floodlights around the mosque.
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const light = new THREE.PointLight(0xffe2b0, 0, 250, 2);
      light.position.set(Math.cos(a) * 60, 30, Math.sin(a) * 60);
      this.scene.add(light);
      this.nightLights.push({ light, intensity: CONFIG.FLOODLIGHT_INTENSITY });
    }
  }

  // ----------------------------------------------------------------- modes --
  setNight(night: boolean) {
    this.night = night;
    if (night) {
      this.scene.background = new THREE.Color(0x0a1022);
      this.scene.environment = this.hdri;
      this.scene.environmentIntensity = 0.03;
      this.ambient.color.set(0x3355aa); // soft blue
      this.ambient.intensity = 0.35;
      this.sun.color.set(0x8fa3ff); // moonlight
      this.sun.intensity = 0.25;
      this.renderer.toneMappingExposure = 1;
    } else {
      this.scene.background = this.hdri;
      this.scene.environment = this.hdri;
      this.scene.environmentIntensity = CONFIG.DAY_ENVIRONMENT_INTENSITY;
      this.ambient.color.set(CONFIG.DAY_AMBIENT_COLOR);
      this.ambient.intensity = CONFIG.DAY_AMBIENT_INTENSITY;
      this.sun.color.set(CONFIG.DAY_SUN_COLOR);
      this.sun.intensity = CONFIG.DAY_SUN_INTENSITY;
      this.renderer.toneMappingExposure = CONFIG.DAY_EXPOSURE;
    }
    for (const { light, intensity } of this.nightLights) light.intensity = night ? intensity : 0;
    this.bulbMaterial.emissiveIntensity = night ? 4 : 0;
  }

  setTerrainMode(on: boolean) {
    this.terrainMode = on;
    this.grass.visible = !on;
    this.terrain.visible = on;

    for (const obj of this.vegetation.children) {
      obj.position.y = this.heightAt(obj.position.x, obj.position.z) - 0.1;
    }
  }

  // ---------------------------------------------------------------- camera --
  private frameCamera() {
    const box = new THREE.Box3().setFromObject(this.mosque);
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;

    // Keep the (10, 8, 12) viewing direction, pulled back to fit the site.
    const dir = new THREE.Vector3(10, 8, 12).normalize();
    const dist = radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.position.copy(center).addScaledVector(dir, dist);
    this.controls.target.copy(center);
    this.controls.update();

    // Shadow camera covers the whole grass area.
    const r = CONFIG.GROUND_SIZE / 2 + 10;
    this.sun.position.copy(SUN_DIR).multiplyScalar(r * 2);
    this.sun.target.position.set(0, 0, 0);
    const cam = this.sun.shadow.camera;
    cam.left = cam.bottom = -r;
    cam.right = cam.top = r;
    cam.near = 1;
    cam.far = r * 4;
    cam.updateProjectionMatrix();
  }

  // ---------------------------------------------------------------- update --
  start() {
    this.lastTime = performance.now();
    this.renderer.setAnimationLoop((now) => {
      // The first frame's timestamp can predate lastTime; a negative dt would
      // push the cars' curve positions below 0.
      const dt = THREE.MathUtils.clamp((now - this.lastTime) / 1000, 0, 0.1);
      this.lastTime = now;
      this.update(dt);
    });
  }

  private update(dt: number) {
    for (const car of this.traffic) {
      const { curve, speed, length } = car.route;
      car.t = (car.t + (speed * dt) / length) % 1;
      curve.getPointAt(car.t, _p);
      curve.getTangentAt(car.t, _tangent);
      car.obj.position.copy(_p);
      car.obj.lookAt(_p.add(_tangent));
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.controls.dispose();
    const textures = new Set<THREE.Texture>();
    this.scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.geometry.dispose();
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      for (const material of materials) {
        for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
        material.dispose();
      }
    });
    if (this.hdri) textures.add(this.hdri);
    textures.forEach((texture) => texture.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

// ------------------------------------------------------------------ helpers --
// GLTFLoader replaces spaces in node names with "_"; undo that for matching.
function meshName(obj: THREE.Object3D) {
  return obj.name.toLowerCase().replace(/_/g, ' ');
}

// Half circle of `radius` around (cx, cz) at height y. side = 1: from the +z
// side round the +x end to the -z side; side = -1: from the -z side round the
// -x end to the +z side.
function uTurn(cx: number, y: number, cz: number, radius: number, side: 1 | -1) {
  const points = [];
  for (let k = 0; k <= 12; k++) {
    const a = (side * Math.PI) / 2 - (k * Math.PI) / 12;
    points.push(new THREE.Vector3(cx + radius * Math.cos(a), y, cz + radius * Math.sin(a)));
  }
  return new THREE.CatmullRomCurve3(points);
}

function footprintRadius(model: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(model);
  return Math.hypot(box.max.x - box.min.x, box.max.z - box.min.z) / 2 + 2;
}

// Floor material: dark asphalt, except light paving inside CONFIG.PLAZA.
// Decided per pixel from world position, since one floor mesh covers both.
function floorMaterial() {
  const { minX, maxX, minZ, maxZ } = CONFIG.PLAZA;
  const material = new THREE.MeshStandardMaterial({
    color: CONFIG.ASPHALT_COLOR,
    roughness: 0.9,
    metalness: 0,
    side: THREE.DoubleSide,
  });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.plazaMin = { value: new THREE.Vector2(minX, minZ) };
    shader.uniforms.plazaMax = { value: new THREE.Vector2(maxX, maxZ) };
    shader.uniforms.plazaColor = { value: new THREE.Color(CONFIG.PAVING_COLOR) };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFloorXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloorXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec2 vFloorXZ;\nuniform vec2 plazaMin;\nuniform vec2 plazaMax;\nuniform vec3 plazaColor;',
      )
      .replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nif (all(greaterThan(vFloorXZ, plazaMin)) && all(lessThan(vFloorXZ, plazaMax))) diffuseColor.rgb = plazaColor;',
      );
  };
  return material;
}

// Grass plane with a circular hole cut out under the mosque.
function createGrass(grassTex: THREE.Texture, holeRadius: number) {
  const size = CONFIG.GROUND_SIZE;
  const half = size / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, -half);
  shape.lineTo(half, -half);
  shape.lineTo(half, half);
  shape.lineTo(-half, half);
  shape.lineTo(-half, -half);

  const hole = new THREE.Path();
  hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
  shape.holes.push(hole);

  const geometry = new THREE.ShapeGeometry(shape, 96);
  // ShapeGeometry UVs are raw coordinates; map them to 0..1 so the texture
  // repeat means "tiles across the whole plane".
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, (pos.getX(i) + half) / size, (pos.getY(i) + half) / size);
  }

  grassTex.colorSpace = THREE.SRGBColorSpace;
  grassTex.wrapS = grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(CONFIG.GRASS_REPEAT, CONFIG.GRASS_REPEAT);

  const grass = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  grass.rotation.x = -Math.PI / 2;
  grass.receiveShadow = true;

  // Plain soil inside the hole, just below the model, so the sky never shows
  // through gaps between the circular hole and the model's own floor.
  const soil = new THREE.Mesh(
    new THREE.CircleGeometry(holeRadius, 96),
    new THREE.MeshStandardMaterial({ color: 0xa89f91, roughness: 1 }),
  );
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = -0.05;
  soil.receiveShadow = true;

  const group = new THREE.Group();
  group.add(grass, soil);
  return group;
}

// Reads the heightmap's raw pixel values (no browser color management) as
// heights in 0..1.
async function loadHeightData(url: string, encoding: 'rg16' | 'gray8'): Promise<HeightData> {
  const blob = await (await fetch(url)).blob();
  const bitmap = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const values = new Float32Array(canvas.width * canvas.height);
  const d = pixels.data;
  for (let i = 0; i < values.length; i++) {
    values[i] = encoding === 'rg16' ? (d[i * 4] * 256 + d[i * 4 + 1]) / 65535 : d[i * 4] / 255;
  }
  return { values, width: canvas.width, height: canvas.height, base: 0 };
}

// Half-float displacement texture, so the heights keep their 16-bit precision
// (an 8-bit texture would step the ~450 m range in 1.8 m terraces).
function heightTexture({ values, width, height }: HeightData) {
  const data = new Uint16Array(width * height);
  // DataTextures aren't flipped on upload: row 0 is the bottom (v = 0) edge.
  for (let row = 0; row < height; row++) {
    const src = row * width;
    const dst = (height - 1 - row) * width;
    for (let col = 0; col < width; col++) data[dst + col] = THREE.DataUtils.toHalfFloat(values[src + col]);
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.HalfFloatType);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// Level the heightmap inside `radius` (world metres) to its mean height there,
// blending back to the original over `blend` metres.
function flattenHeights(h: HeightData, radius: number, blend: number) {
  const { values, width, height } = h;
  const worldX = (col: number) => (col / (width - 1) - 0.5) * CONFIG.TERRAIN_WIDTH;
  const worldZ = (row: number) => (row / (height - 1) - 0.5) * CONFIG.TERRAIN_DEPTH;

  let sum = 0;
  let count = 0;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (Math.hypot(worldX(col), worldZ(row)) < radius) {
        sum += values[row * width + col];
        count++;
      }
    }
  }
  const base = count ? sum / count : 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const i = row * width + col;
      const t = THREE.MathUtils.smoothstep(Math.hypot(worldX(col), worldZ(row)), radius, radius + blend);
      values[i] = base + (values[i] - base) * t;
    }
  }
  h.base = base;
}
