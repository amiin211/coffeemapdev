// Mosque environment: the mosque model with per-mesh colors, a grass ground or
// DTM terrain, vegetation, site traffic, a photogrammetry survey drone, and
// day (HDRI) / night (point lights) lighting.
// Ported from the standalone Vite project in ~/environment (1 unit = 1 m).
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// HDRLoader is three's current name for RGBELoader (deprecated alias since r180).
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { BIM_URL, BimData, BimSelection, CATEGORY_COLORS, ColorMode, UNCATEGORISED_COLOR } from '@/lib/mosqueBim';
import { SurveyLayers, SurveyMission, SurveyStatus } from '@/lib/surveyDrone';
import { Schedule, buildSchedule, dayToIso, hijriIso } from '@/lib/mosqueSchedule';
import { ACCESS_ROAD, ConstructionSite, ROAD_WIDTH, Rect } from '@/lib/mosqueConstruction';
import { SiteQuantities, WorkPackage, buildSiteWorks } from '@/lib/mosqueSiteWorks';

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
  START_AT_NIGHT: false,
  // 'category' colours each element by its BIM category; 'realistic' uses MOSQUE_COLORS.
  START_COLOR_MODE: 'realistic' as ColorMode,
  TERRAIN_WIDTH: 507.5, // 1015 px x 0.5 m
  TERRAIN_DEPTH: 819.5, // 1639 px x 0.5 m
  TERRAIN_SEGMENTS: 512,
  DISPLACEMENT_SCALE: 448.88, // 2793.35 m - 2344.47 m: the DTM's real height range
  // The terrain is flattened under the mosque and blends back over this distance.
  TERRAIN_BLEND: 40,

  // The model's floor: dark asphalt for the driveways and parking, white
  // marble slabs (marbleSlabTexture) inside the PLAZA rectangle around the building
  // (centred model coordinates, metres).
  ASPHALT_COLOR: 0x2a2a2b,
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
  // Golden hour, as in the classic photographs of Badshahi Mosque: a low,
  // warm sun that sets the red sandstone glowing.
  DAY_SUN_COLOR: 0xffbf86,
  DAY_SUN_INTENSITY: 3.4,
  DAY_AMBIENT_COLOR: 0xffdcb8,
  DAY_AMBIENT_INTENSITY: 0.32,
  DAY_ENVIRONMENT_INTENSITY: 0.55,
  DAY_EXPOSURE: 0.95,

  // Night lighting: lights on this many of the model's own light poles.
  POLE_LIGHTS: 12,
  POLE_LIGHT_INTENSITY: 250,
  FLOODLIGHT_INTENSITY: 1000,

  // Survey drone: a lawnmower photogrammetry flight over the mosque model's
  // bounding box. Line and trigger spacing follow from the altitude, the
  // camera's field of view and the overlaps.
  START_SURVEY: true,
  SURVEY_ALTITUDE: 60, // m above the take-off point
  SURVEY_FOV_X: 60, // across track, degrees
  SURVEY_FOV_Y: 45, // along track
  SURVEY_SIDE_OVERLAP: 0.7,
  SURVEY_FRONT_OVERLAP: 0.8,
  SURVEY_SPEED: 10, // m/s on the survey lines
  SURVEY_TURN_SPEED: 7,
  SURVEY_TRANSIT_SPEED: 14,
  SURVEY_CLIMB_SPEED: 4,
  SURVEY_TIME_SCALE: 2, // the full flight takes ~2 minutes
  // The 2 m airframe is drawn 4x larger so it reads at site scale.
  SURVEY_DRONE_SCALE: 4,
};

const SUN_DIR = new THREE.Vector3(12, 9, 5).normalize(); // low evening sun

// Mosque material colors (floors get floorMaterial() instead), first match on
// the lower-cased mesh name wins. Walls, trims, domes and roofs get the Mughal
// stone materials instead (see mughalMaterial): red sandstone with white
// marble inlay, white marble domes and cornices, after Badshahi Mosque.
const MOSQUE_COLORS: [string, number][] = [
  ['door', 0x5a3a22], // carved dark timber
  ['window', 0x3e5560], // bronze-tinted glazing
  ['m_fixed', 0x3e5560], // fixed glazing panels are windows too
  ['dome', 0xc9a24a], // (white marble: mughalMaterial)
  ['roof', 0xa9603c], // terracotta roof, set apart from the limestone walls
  ['sweep', 0xcdb48c], // sandstone cornices and trims
  ['wall', 0xf1e7d4], // warm limestone render
  ['rail', 0x4a3b2c], // dark bronze
  ['step', 0xcfc0a3], // travertine
  ['stairs', 0xcfc0a3],
  ['parking shade', 0x4a3121], // dark brown shade structures
  ['electric poll', 0x6d6a66],
];
const MOSQUE_DEFAULT_COLOR = 0xf1e7d4;
// Gilded and bronze surfaces get some metallic sheen.
const METALLIC_COLORS = new Set([0xc9a24a, 0x4a3b2c]);

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
  private parked: THREE.Group | null = null;
  private paints = new Map<number, THREE.MeshStandardMaterial>();
  private vehicleModels: Record<string, THREE.Object3D> = {};
  private hdri!: THREE.DataTexture;
  private sky: THREE.Texture | null = null;
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

  // Survey drone; its read-out is reported a few times a second.
  survey!: SurveyMission;
  onSurveyStatus: (status: SurveyStatus) => void = () => {};
  private surveyStatusTimer = 0;

  // BIM: click a mosque element to select it and read its properties.
  bim: BimData | null = null;
  onSelect: (selection: BimSelection | null) => void = () => {};
  private raycaster = new THREE.Raycaster();
  colorMode: ColorMode = CONFIG.START_COLOR_MODE;
  private realisticMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
  private categoryMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private selectedKey: string | null = null;
  // Bright blue stands apart from the white / green / brown palettes.
  private highlightMaterial = new THREE.MeshStandardMaterial({
    color: 0x29b6f6,
    emissive: 0x0277bd,
    emissiveIntensity: 0.45,
    roughness: 0.5,
    side: THREE.DoubleSide,
  });
  private pointerDown: { x: number; y: number } | null = null;

  // 4D BIM: an indicative construction schedule generated from the model,
  // and the model as built on a given day of it (null = complete).
  schedule: Schedule | null = null;
  private construction: ConstructionSite | null = null;
  // Soft landscaping in the gaps of the site floor, and paving for any gaps
  // inside the building's footprint (shown from their phase in the 4D view).
  private siteLandscape: THREE.Group | null = null;
  // Costed site works (survey, earthworks, road, foundations, landscaping),
  // measured from the scene as it is built.
  siteWorks: WorkPackage[] = [];
  private quantities: Partial<SiteQuantities> = {};
  private sitePaving: THREE.Mesh | null = null;
  private buildDay: number | null = null;
  private showPlanned = true;
  private elementState = new Map<string, 'planned' | 'installing' | 'built'>();
  private elementBase = new Map<THREE.Object3D, { y: number; sy: number; bottom: number }>();
  private surveyUserLayers: Partial<SurveyLayers> = {};
  private inSurveyPhase = false;
  // Not yet built: a faint ghost of the design.
  private plannedMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
  private installingMaterial = new THREE.MeshStandardMaterial({
    color: 0xffa726,
    emissive: 0xe65100,
    emissiveIntensity: 0.55,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene.background = new THREE.Color(0x87ceeb);

    this.camera = new THREE.PerspectiveCamera(50, this.aspect(), 0.5, 5000);
    this.camera.position.set(10, 8, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true }); // PDF report snapshot
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

    // A click (not an orbit drag) picks an element.
    renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
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
    const [mosque, tree, palm, hdri, grassTex, orthoTex, height, route, bim, ...vehicles] = await Promise.all([
      gltf.loadAsync(`${DATA}/mosque.glb`),
      gltf.loadAsync(`${DATA}/tree.glb`),
      gltf.loadAsync(`${DATA}/palm.glb`),
      new HDRLoader(manager).loadAsync(`${DATA}/hdri.hdr`),
      textures.loadAsync(`${DATA}/grass.jpg`),
      textures.loadAsync(CONFIG.ORTHO),
      loadHeightData(CONFIG.HEIGHTMAP, CONFIG.HEIGHTMAP_ENCODING),
      fetch(CONFIG.SITE_ROUTE).then((r) => r.json() as Promise<{ points: [number, number][] }>),
      // The viewer still works without BIM data.
      fetch(BIM_URL).then((r) => (r.ok ? (r.json() as Promise<BimData>) : null)).catch(() => null),
      ...vehicleTypes.map((type) => gltf.loadAsync(VEHICLES[type].url)),
    ]);
    this.vehicleModels = Object.fromEntries(vehicleTypes.map((type, i) => [type, vehicles[i].scene]));
    this.bim = bim;

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
    this.prepareSchedule();
    this.createSiteLandscape(tree.scene, palm.scene, grassTex);
    this.survey = this.createSurvey();
    this.createConstructionSite();

    const rand = mulberry32(CONFIG.SEED + 1);
    this.createTraffic(route, rand);
    this.parkCars(rand);

    this.createNightLights();
    this.setColorMode(this.colorMode);
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
      const stone = mughalMaterial(name);
      if (stone) {
        obj.material = stone;
        return;
      }
      const color = MOSQUE_COLORS.find(([key]) => name.includes(key))?.[1] ?? MOSQUE_DEFAULT_COLOR;
      if (!materials.has(color)) {
        materials.set(color, new THREE.MeshStandardMaterial({
          color,
          roughness: METALLIC_COLORS.has(color) ? 0.35 : 0.75,
          metalness: METALLIC_COLORS.has(color) ? 0.65 : 0.02,
          side: THREE.DoubleSide,
        }));
      }
      obj.material = materials.get(color);
    });
    model.traverse((obj) => {
      if (obj instanceof THREE.Mesh) this.realisticMaterials.set(obj, obj.material);
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
    // Earthworks: cut and fill to level the site platform, from the DTM before it is flattened.
    Object.assign(this.quantities, platformEarthworks(h, new THREE.Box3().setFromObject(this.mosque)));
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

  // Where a ray from above first meets the ground. The terrain is displaced
  // on the GPU, so a THREE.Raycaster would only find the flat plane; march the
  // ray over the DTM heightfield instead and refine the hit by bisection.
  raycastGround = (origin: THREE.Vector3, dir: THREE.Vector3, target: THREE.Vector3) => {
    if (!this.terrainMode) {
      const t = dir.y < -1e-6 ? Math.max(-origin.y / dir.y, 0) : 0;
      return target.copy(origin).addScaledVector(dir, t);
    }
    const below = (t: number) => {
      target.copy(origin).addScaledVector(dir, t);
      return target.y <= this.heightAt(target.x, target.z);
    };
    const STEP = 1;
    for (let t = 0; t <= 3000; t += STEP) {
      if (!below(t)) continue;
      let lo = Math.max(t - STEP, 0), hi = t;
      for (let k = 0; k < 10; k++) {
        const mid = (lo + hi) / 2;
        if (below(mid)) hi = mid;
        else lo = mid;
      }
      below(hi);
      break;
    }
    target.y = this.heightAt(target.x, target.z);
    return target;
  };

  // --------------------------------------------------------------- survey --
  // Plan extent of the BIM elements in `categories` (whole model if none match).
  private elementsBox(match: (category: string, zone: string) => boolean) {
    const box = new THREE.Box3();
    for (const element of this.mosque.children) {
      const record = this.bim?.elements[element.name];
      if (record && this.bim && match(this.bim.types[record.type].category, record.zone)) box.expandByObject(element);
    }
    return box.isEmpty() ? new THREE.Box3().setFromObject(this.mosque) : box;
  }

  private createSurvey() {
    // The flight covers the structures (mosque, minaret and parking shades)
    // with a small margin, not the whole site.
    const box = this.elementsBox((c, zone) => c === 'Site Structures' || (zone !== 'External Works' && ['Walls', 'Roofs', 'Domes'].includes(c)));
    const margin = 8;
    this.quantities.surveyHa = ((box.max.x - box.min.x + 2 * margin) * (box.max.z - box.min.z + 2 * margin)) / 10_000;
    const survey = new SurveyMission(
      {
        box: { minX: box.min.x - margin, maxX: box.max.x + margin, minZ: box.min.z - margin, maxZ: box.max.z + margin },
        altitude: CONFIG.SURVEY_ALTITUDE,
        fovX: CONFIG.SURVEY_FOV_X,
        fovY: CONFIG.SURVEY_FOV_Y,
        sideOverlap: CONFIG.SURVEY_SIDE_OVERLAP,
        frontOverlap: CONFIG.SURVEY_FRONT_OVERLAP,
        surveySpeed: CONFIG.SURVEY_SPEED,
        turnSpeed: CONFIG.SURVEY_TURN_SPEED,
        transitSpeed: CONFIG.SURVEY_TRANSIT_SPEED,
        climbSpeed: CONFIG.SURVEY_CLIMB_SPEED,
        timeScale: CONFIG.SURVEY_TIME_SCALE,
        droneScale: CONFIG.SURVEY_DRONE_SCALE,
      },
      this.raycastGround,
      (x, z) => this.heightAt(x, z),
    );
    survey.setLayers({ drone: CONFIG.START_SURVEY });
    this.scene.add(survey.group);
    return survey;
  }

  setSurveyLayers(layers: Partial<SurveyLayers>) {
    this.surveyUserLayers = { ...this.surveyUserLayers, ...layers };
    if (this.buildDay !== null) return; // the 4D view controls the drone until it closes
    this.survey.setLayers(layers);
    this.onSurveyStatus(this.survey.status());
  }

  restartSurvey() {
    this.survey.restart();
    this.onSurveyStatus(this.survey.status());
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

  private detourRoute(points: [number, number][]): [number, number][] {
    const DETOUR_RAMP = 10, CLEARANCE = 2.5, LOW = 3; // m; walls starting below LOW block cars
    const base = this.mosque.position.y;
    const blockers: THREE.Box3[] = [];
    for (const element of this.mosque.children) {
      const record = this.bim?.elements[element.name];
      if (!record || record.zone === 'External Works') continue;
      const box = new THREE.Box3().setFromObject(element);
      if (box.min.y - base < LOW) blockers.push(box);
    }
    const hits = points.filter(([x, z]) => blockers.some((b) => x > b.min.x - 1.5 && x < b.max.x + 1.5 && z > b.min.z - 1.5 && z < b.max.z + 1.5));
    if (!hits.length) return points;
    const hitBoxes = blockers.filter((b) => hits.some(([x, z]) => x > b.min.x - 1.5 && x < b.max.x + 1.5 && z > b.min.z - 1.5 && z < b.max.z + 1.5));
    const x0 = Math.min(...hitBoxes.map((b) => b.min.x)) - 1.5, x1 = Math.max(...hitBoxes.map((b) => b.max.x)) + 1.5;
    const clearZ = Math.min(...hitBoxes.map((b) => b.min.z)) - CLEARANCE;
    const zMid = hits.reduce((s, [, z]) => s + z, 0) / hits.length;
    return points.map(([x, z]) => {
      if (z <= clearZ || Math.abs(z - zMid) > 8) return [x, z];
      const outside = Math.max(x0 - x, x - x1, 0);
      const w = 1 - THREE.MathUtils.smoothstep(outside, 0, DETOUR_RAMP);
      return [x, z + (clearZ - z) * w];
    });
  }

  private createTraffic(route: { points: [number, number][] }, rand: () => number) {
    // The model's floor surface is at its original y = 0.
    const y = this.mosque.position.y;
    const group = new THREE.Group();

    // Main loop over the site's asphalt. Its north leg passes under the
    // mosque's north entrance walls, which start only ~1.2 m above the ground,
    // so cars drove through them: that stretch detours north of the walls,
    // blending back to the original line over DETOUR_RAMP metres each side.
    const points = this.detourRoute(route.points).map(([x, z]) => new THREE.Vector3(x, y, z));
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
    this.parked = group;
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
      // A painted blue sky with clouds; the HDRI still lights the scene.
      this.sky ??= skyTexture();
      this.scene.background = this.sky;
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
    this.survey.setNight(night);
  }

  setTerrainMode(on: boolean) {
    this.terrainMode = on;
    this.grass.visible = !on;
    this.terrain.visible = on;

    for (const obj of this.vegetation.children) {
      obj.position.y = this.heightAt(obj.position.x, obj.position.z) - 0.1;
    }
    // The footprints already taken are re-draped over the new ground.
    this.survey.reproject();
    this.construction?.drape((x, z) => this.heightAt(x, z), on);
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

  // ------------------------------------------------------------------- BIM --
  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDown = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent) => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || !this.bim || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    // Revit elements are the model's top-level children; parts hang below them.
    // The raycaster ignores visibility, so skip elements hidden by the 4D view.
    const elementOf = (o: THREE.Object3D | null) => {
      while (o && o.parent !== this.mosque) o = o.parent;
      return o;
    };
    const hit = this.raycaster
      .intersectObject(this.mosque, true)
      .map((h) => elementOf(h.object))
      .find((o) => o?.visible && this.elementState.get(o.name) !== 'planned');
    this.select(hit?.name ?? null);
  };

  // Selects an element by its node name (null clears the selection).
  select(key: string | null) {
    const element = key ? this.bim?.elements[key] : undefined;
    this.selectedKey = element && key && this.mosque.getObjectByName(key) ? key : null;
    this.applyMaterials();
    this.onSelect(this.selectedKey && element && this.bim
      ? { key: this.selectedKey, element, type: this.bim.types[element.type] }
      : null);
  }

  // ------------------------------------------------------------------ 4D --
  // Builds the indicative schedule from each element's category, zone and
  // real position and height in the model, and records the element dates in
  // the BIM data so the properties panel and the CSV schedule agree with it.
  private prepareSchedule() {
    if (!this.bim) return;
    const box = new THREE.Box3();
    const centre = new THREE.Vector3();
    const items = [];
    for (const element of this.mosque.children) {
      const record = this.bim.elements[element.name];
      if (!record) continue;
      box.setFromObject(element).getCenter(centre);
      const base = this.mosque.position.y;
      items.push({ key: element.name, category: this.bim.types[record.type].category, zone: record.zone, bottom: box.min.y - base, top: box.max.y - base, x: centre.x, z: centre.z });
      this.elementBase.set(element, { y: element.position.y, sy: element.scale.y, bottom: box.min.y - this.mosque.position.y });
    }
    this.schedule = buildSchedule(items);
    this.schedule.tasks.forEach((task, key) => {
      const record = this.bim!.elements[key];
      record.installDate = dayToIso(task.end);
      record.installDateHijri = hijriIso(record.installDate) || record.installDateHijri;
    });
  }

  // The model's site floor (asphalt and paving) leaves gaps between the
  // mosque, the internal roads and the parking, where the bare DTM showed
  // through. Rasterise the floor's triangles onto a 0.5 m grid, then cover
  // every uncovered cell: lawn with palms and shrubs outside the building,
  // interlock paving inside its footprint.
  private createSiteLandscape(treeModel: THREE.Object3D, palmModel: THREE.Object3D, grassTex: THREE.Texture) {
    const STEP = 0.5;
    this.mosque.updateMatrixWorld(true);
    const site = new THREE.Box3().setFromObject(this.mosque);
    const building = this.elementsBox((c, zone) => zone !== 'External Works' && ['Walls', 'Roofs', 'Domes'].includes(c));
    const x0 = site.min.x + 0.5, z0 = site.min.z + 0.5;
    const nx = Math.floor((site.max.x - 0.5 - x0) / STEP), nz = Math.floor((site.max.z - 0.5 - z0) / STEP);
    const covered = new Uint8Array(nx * nz);

    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    this.mosque.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh) || !meshName(obj).includes('floor')) return;
      const pos = obj.geometry.attributes.position;
      const index = obj.geometry.index;
      const count = index ? index.count : pos.count;
      const vert = (k: number, out: THREE.Vector3) => out.fromBufferAttribute(pos, index ? index.getX(k) : k).applyMatrix4(obj.matrixWorld);
      for (let t = 0; t < count; t += 3) {
        vert(t, a);
        vert(t + 1, b);
        vert(t + 2, c);
        const i0 = Math.max(0, Math.floor((Math.min(a.x, b.x, c.x) - x0) / STEP));
        const i1 = Math.min(nx - 1, Math.ceil((Math.max(a.x, b.x, c.x) - x0) / STEP));
        const j0 = Math.max(0, Math.floor((Math.min(a.z, b.z, c.z) - z0) / STEP));
        const j1 = Math.min(nz - 1, Math.ceil((Math.max(a.z, b.z, c.z) - z0) / STEP));
        const d = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
        if (Math.abs(d) < 1e-9) continue;
        for (let j = j0; j <= j1; j++) {
          const pz = z0 + (j + 0.5) * STEP;
          for (let i = i0; i <= i1; i++) {
            const px = x0 + (i + 0.5) * STEP;
            const l1 = ((b.z - c.z) * (px - c.x) + (c.x - b.x) * (pz - c.z)) / d;
            const l2 = ((c.z - a.z) * (px - c.x) + (a.x - c.x) * (pz - c.z)) / d;
            if (l1 >= -0.02 && l2 >= -0.02 && 1 - l1 - l2 >= -0.02) covered[j * nx + i] = 1;
          }
        }
      }
    });

    const inBuilding = (x: number, z: number) => x > building.min.x && x < building.max.x && z > building.min.z && z < building.max.z;
    const lawn: number[] = [], paving: number[] = [];
    const open = new Uint8Array(nx * nz); // 1 = lawn cell
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        if (covered[j * nx + i]) continue;
        const x = x0 + i * STEP, z = z0 + j * STEP;
        const inside = inBuilding(x + STEP / 2, z + STEP / 2);
        (inside ? paving : lawn).push(x, z);
        if (!inside) open[j * nx + i] = 1;
      }
    }
    const cellsMesh = (cells: number[], material: THREE.Material, y: number) => {
      const pos = new Float32Array((cells.length / 2) * 12);
      const idx: number[] = [];
      for (let k = 0, v = 0; k < cells.length; k += 2, v += 4) {
        const x = cells[k], z = cells[k + 1];
        pos.set([x, y, z, x + STEP, y, z, x + STEP, y, z + STEP, x, y, z + STEP], v * 3);
        idx.push(v, v + 2, v + 1, v, v + 3, v + 2);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, material);
      mesh.receiveShadow = true;
      return mesh;
    };

    // Lawn: the grass texture, world-mapped, in a well-watered green.
    const lawnTex = grassTex.clone();
    lawnTex.wrapS = lawnTex.wrapT = THREE.RepeatWrapping;
    lawnTex.colorSpace = THREE.SRGBColorSpace;
    const lawnMaterial = new THREE.MeshStandardMaterial({ color: 0x8fb36a, map: lawnTex, roughness: 1 });
    lawnMaterial.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vLawnXZ;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLawnXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec2 vLawnXZ;')
        .replace('#include <map_fragment>', 'diffuseColor *= texture2D(map, vLawnXZ / 3.0);');
    };
    const group = new THREE.Group();
    group.add(cellsMesh(lawn, lawnMaterial, 0.02));

    // Planting: palms and rounded shrubs, only where there's lawn all round.
    const rand = mulberry32(CONFIG.SEED + 7);
    const clear = (i: number, j: number, r: number) => {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || jj < 0 || ii >= nx || jj >= nz || !open[jj * nx + ii]) return false;
      }
      return true;
    };
    const planted: [number, number][] = [];
    const candidates: [number, number][] = [];
    for (let j = 0; j < nz; j += 2) for (let i = 0; i < nx; i += 2) if (open[j * nx + i]) candidates.push([i, j]);
    for (let k = candidates.length - 1; k > 0; k--) {
      const r = Math.floor(rand() * (k + 1));
      [candidates[k], candidates[r]] = [candidates[r], candidates[k]];
    }
    for (const [i, j] of candidates) {
      if (planted.length >= 90) break; // enough to read as planted, light enough to draw
      const palm = rand() < 0.4;
      if (!clear(i, j, palm ? 4 : 3)) continue; // 2 m / 1.5 m of lawn all round
      const x = x0 + (i + 0.5) * STEP, z = z0 + (j + 0.5) * STEP;
      if (planted.some(([px, pz]) => Math.hypot(px - x, pz - z) < (palm ? 7 : 5))) continue;
      const obj = (palm ? palmModel : treeModel).clone();
      obj.position.set(x, 0.02, z);
      obj.rotation.y = rand() * Math.PI * 2;
      obj.scale.setScalar(palm ? 0.75 + rand() * 0.3 : 0.4 + rand() * 0.2);
      obj.userData.palm = palm;
      obj.traverse((o) => {
        // Only palms cast shadows; shrubs are low enough not to need them.
        if (o instanceof THREE.Mesh) o.castShadow = palm;
      });
      group.add(obj);
      planted.push([x, z]);
    }
    this.siteLandscape = group;
    this.scene.add(group);
    const palms = group.children.filter((o) => o !== group.children[0] && o.userData.palm).length;
    Object.assign(this.quantities, {
      lawnArea: (lawn.length / 2) * STEP * STEP,
      palms,
      shrubs: group.children.length - 1 - palms,
      infillPaving: (paving.length / 2) * STEP * STEP,
    });

    if (paving.length) {
      const pavingMaterial = floorMaterial();
      this.sitePaving = cellsMesh(paving, pavingMaterial, 0.02);
      this.scene.add(this.sitePaving);
    }
  }

  // Building footprint for the foundations: the plan area of its roof slabs
  // (the bounding box would count the open courtyard and the L-shape's corners).
  private roofPlanArea() {
    if (!this.bim) return 0;
    return Object.values(this.bim.elements).reduce((sum, e) => {
      const type = this.bim!.types[e.type];
      return type.category === 'Roofs' && e.zone !== 'External Works' ? sum + (e.quantities.area_m2 ?? 0) : sum;
    }, 0);
  }

  private createConstructionSite() {
    if (!this.schedule) return;
    const site = new THREE.Box3().setFromObject(this.mosque);
    const building = this.elementsBox((c, zone) => zone !== 'External Works' && ['Walls', 'Roofs', 'Domes'].includes(c));
    const rect = (b: THREE.Box3): Rect => ({ minX: b.min.x, maxX: b.max.x, minZ: b.min.z, maxZ: b.max.z });
    this.construction = new ConstructionSite(rect(site), rect(building), this.schedule.building.top, (x, z) => this.heightAt(x, z));
    this.scene.add(this.construction.group);

    // Costed site works over the schedule's phases.
    const roadLength = new THREE.CatmullRomCurve3(ACCESS_ROAD.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal').getLength();
    const q: SiteQuantities = {
      surveyHa: 0, siteArea: 0, cut: 0, fill: 0, lawnArea: 0, palms: 0, shrubs: 0, infillPaving: 0,
      ...this.quantities,
      roadLength,
      roadArea: roadLength * ROAD_WIDTH,
      foundationArea: this.roofPlanArea() || (building.max.x - building.min.x) * (building.max.z - building.min.z),
    };
    const phase = (id: string): [number, number] => {
      const p = this.schedule!.phases.find((x) => x.id === id)!;
      return [p.start, p.end];
    };
    const categoryWindow = (category: string): [number, number] => {
      let start = Infinity, end = -Infinity;
      for (const [key, task] of this.schedule!.tasks) {
        const record = this.bim?.elements[key];
        if (record && this.bim!.types[record.type].category === category) {
          start = Math.min(start, task.start);
          end = Math.max(end, task.end);
        }
      }
      return Number.isFinite(start) ? [start, end] : phase('external');
    };
    this.siteWorks = buildSiteWorks(q, {
      survey: phase('survey'),
      earthworks: phase('earthworks'),
      road: phase('road'),
      foundations: phase('foundations'),
      landscape: categoryWindow('Landscape'),
    });
  }

  /** Frames the construction site in the upper part of the view, above the 4D panel. */
  frameConstruction() {
    const box = new THREE.Box3().setFromObject(this.mosque);
    const center = box.getCenter(new THREE.Vector3());
    const radius = box.getSize(new THREE.Vector3()).length() / 2;
    const dir = new THREE.Vector3(10, 11, 12).normalize();
    const flat = new THREE.Vector3(dir.x, 0, dir.z).normalize();
    // Aim past the site towards the camera so the site sits high in the frame.
    const target = center.clone().addScaledVector(flat, radius * 0.55);
    this.controls.target.copy(target);
    this.camera.position.copy(target).addScaledVector(dir, radius * 1.45);
    this.controls.update();
  }

  /** Shows the mosque as built on `day` of the schedule; null = complete. */
  setBuildDay(day: number | null) {
    const schedule = this.schedule;
    if (!schedule) return;
    if (day !== null && this.buildDay === null) this.frameConstruction();
    this.buildDay = day;
    this.elementState.clear();
    for (const element of this.mosque.children) {
      const task = schedule.tasks.get(element.name);
      const base = this.elementBase.get(element);
      let state: 'planned' | 'installing' | 'built' = 'built';
      let grow = 1;
      if (day !== null && task) {
        if (day < task.start) state = 'planned';
        else if (day < task.end) {
          state = 'installing';
          if (task.grows) grow = Math.max(0.03, (day - task.start) / (task.end - task.start));
        }
      }
      this.elementState.set(element.name, state);
      element.visible = state !== 'planned' || this.showPlanned;
      if (base) {
        // Rise from the element's base: scale its height, keep its bottom in place.
        element.scale.y = base.sy * grow;
        element.position.y = base.y + (base.bottom - base.y) * (1 - grow);
      }
    }
    const complete = day === null || day >= schedule.finish;
    const startOf = (category: string) => {
      let start = Infinity;
      for (const [key, task] of schedule.tasks) {
        const record = this.bim?.elements[key];
        if (record && this.bim!.types[record.type].category === category) start = Math.min(start, task.start);
      }
      return start;
    };
    if (this.siteLandscape) this.siteLandscape.visible = day === null || day >= startOf('Landscape');
    if (this.sitePaving) this.sitePaving.visible = day === null || day >= startOf('Floors');
    if (this.parked) this.parked.visible = complete;
    for (const car of this.traffic) car.obj.visible = complete;
    this.construction?.setDay(day, schedule);

    // The drone survey is the first phase: fly it then, hide it afterwards.
    const survey = schedule.phases.find((p) => p.id === 'survey')!;
    const inSurvey = day !== null && day < survey.end;
    if (day === null) this.survey.setLayers({ drone: true, beam: true, footprints: true, ...this.surveyUserLayers });
    else if (inSurvey) {
      if (!this.inSurveyPhase) this.survey.restart();
      this.survey.setLayers({ drone: true, beam: true, footprints: true });
    } else this.survey.setLayers({ drone: false });
    this.inSurveyPhase = inSurvey;
    this.onSurveyStatus(this.survey.status());

    if (this.selectedKey && this.elementState.get(this.selectedKey) === 'planned') this.select(null);
    else this.applyMaterials();
  }

  /** Shows (or hides) the not-yet-built elements as a faint ghost. */
  setShowPlanned(on: boolean) {
    this.showPlanned = on;
    if (this.buildDay !== null) this.setBuildDay(this.buildDay);
  }

  // Realistic colours, or one colour per BIM category (elements the BIM data
  // doesn't cover stay in their realistic colours).
  setColorMode(mode: ColorMode) {
    this.colorMode = mode;
    this.applyMaterials();
  }

  private categoryMaterial(category: string) {
    let material = this.categoryMaterials.get(category);
    if (!material) {
      material = new THREE.MeshStandardMaterial({
        color: CATEGORY_COLORS[category] ?? UNCATEGORISED_COLOR,
        roughness: 0.7,
        metalness: 0,
        side: THREE.DoubleSide,
      });
      this.categoryMaterials.set(category, material);
    }
    return material;
  }

  // Sets every mosque mesh's material from the colour mode and selection.
  // Revit elements are the model's top-level children; parts hang below them.
  private applyMaterials() {
    for (const element of this.mosque.children) {
      const record = this.bim?.elements[element.name];
      const category = record && this.bim ? this.bim.types[record.type].category : null;
      const selected = element.name === this.selectedKey;
      const state = this.buildDay === null ? 'built' : this.elementState.get(element.name) ?? 'built';
      element.traverse((o) => {
        if (!(o instanceof THREE.Mesh)) return;
        o.castShadow = state !== 'planned';
        o.material = selected
          ? this.highlightMaterial
          : state === 'planned'
            ? this.plannedMaterial
            : state === 'installing'
              ? this.installingMaterial
            : this.colorMode === 'category' && category
            ? this.categoryMaterial(category)
            : this.realisticMaterials.get(o) ?? o.material;
      });
    }
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
    this.survey.update(dt);
    this.construction?.animate(dt);
    this.surveyStatusTimer -= dt;
    if (this.surveyStatusTimer <= 0) {
      this.surveyStatusTimer = 0.25;
      this.onSurveyStatus(this.survey.status());
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.highlightMaterial.dispose();
    this.plannedMaterial.dispose();
    this.installingMaterial.dispose();
    this.construction?.dispose();
    this.survey?.dispose();
    this.categoryMaterials.forEach((m) => m.dispose());
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
    if (this.sky) textures.add(this.sky);
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

// Equirectangular day sky: deep blue overhead fading to a pale horizon, with
// soft fractal clouds (wrapping seamlessly round the horizon).
function skyTexture() {
  const W = 1024, H = 512;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(W, H);

  let seed = 1234;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const lattice = Array.from({ length: 6 }, (_, o) => {
    const cx = 6 * 2 ** o, cy = 3 * 2 ** o;
    return { cx, cy, v: Float32Array.from({ length: cx * (cy + 1) }, rand) };
  });
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const noise = (u: number, v: number) => {
    let sum = 0, amp = 0.5, norm = 0;
    for (const { cx, cy, v: grid } of lattice) {
      const x = u * cx, y = v * cy;
      const x0 = Math.floor(x), y0 = Math.floor(y);
      const fx = smooth(x - x0), fy = smooth(y - y0);
      const at = (i: number, j: number) => grid[Math.min(j, cy) * cx + (((i % cx) + cx) % cx)];
      const a = at(x0, y0) * (1 - fx) + at(x0 + 1, y0) * fx;
      const b = at(x0, y0 + 1) * (1 - fx) + at(x0 + 1, y0 + 1) * fx;
      sum += (a * (1 - fy) + b * fy) * amp;
      norm += amp;
      amp *= 0.5;
    }
    return sum / norm;
  };

  // Clear evening sky: blue overhead, warm haze at the horizon.
  const zenith = [58, 114, 190], horizon = [176, 202, 226], haze = [196, 208, 218];
  for (let y = 0; y < H; y++) {
    const elev = 1 - y / (H / 2); // 1 at the zenith, 0 at the horizon, < 0 below
    const t = Math.pow(Math.max(0, Math.min(1, elev)), 0.35);
    for (let x = 0; x < W; x++) {
      const o = (y * W + x) * 4;
      let r, g, b;
      if (elev <= 0) [r, g, b] = haze;
      else {
        r = horizon[0] + (zenith[0] - horizon[0]) * t;
        g = horizon[1] + (zenith[1] - horizon[1]) * t;
        b = horizon[2] + (zenith[2] - horizon[2]) * t;
        // Clouds: thresholded noise, thinning towards the zenith and the horizon.
        const n = noise(x / W, y / H);
        const band = Math.sin(Math.min(1, elev / 0.75) * Math.PI) * 0.9 + 0.1;
        // Scattered clouds: only the noise peaks show.
        const c = Math.max(0, Math.min(1, (n - 0.62) * 5)) * band * 0.8;
        const shade = 238 + (n - 0.5) * 30; // slightly grey undersides
        r += (shade - r) * c;
        g += (shade - g) * c;
        b += (shade + 6 - b) * c;
      }
      img.data[o] = r;
      img.data[o + 1] = g;
      img.data[o + 2] = b;
      img.data[o + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// ------------------------------------------------------------ Mughal stone --
// Procedural textures and materials after Badshahi Mosque: red sandstone
// (plain, or panelled with white marble inlay), white marble for domes and
// cornices, and large marble slabs for the courtyard. Walls have no usable
// UVs, so the stone is projected in world space (box / triplanar mapping).

type Paint = (ctx: CanvasRenderingContext2D, size: number, rand: () => number) => void;
function canvasTexture(size: number, seed: number, paint: Paint) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  paint(ctx, size, rand);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

// Grain and speckle over whatever is painted.
function grain(ctx: CanvasRenderingContext2D, size: number, rand: () => number, amount: number) {
  const img = ctx.getImageData(0, 0, size, size);
  for (let k = 0; k < img.data.length; k += 4) {
    const n = (rand() - 0.5) * amount;
    img.data[k] += n;
    img.data[k + 1] += n * 0.9;
    img.data[k + 2] += n * 0.8;
  }
  ctx.putImageData(img, 0, 0);
}

// Soft grey veins for marble.
function veins(ctx: CanvasRenderingContext2D, size: number, rand: () => number, count: number, alpha: number) {
  ctx.lineCap = 'round';
  for (let v = 0; v < count; v++) {
    let x = rand() * size, y = rand() * size;
    const dir = rand() * Math.PI * 2;
    ctx.strokeStyle = `rgba(120, 118, 115, ${alpha * (0.4 + rand() * 0.6)})`;
    ctx.lineWidth = 0.6 + rand() * 1.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let k = 0; k < 14; k++) {
      x += Math.cos(dir + (rand() - 0.5) * 1.6) * size * 0.05;
      y += Math.sin(dir + (rand() - 0.5) * 1.6) * size * 0.05;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

// Red sandstone ashlar: courses of blocks with fine joints and bedding streaks.
// One repeat = 3 m. `inlay` adds Badshahi's white marble panel framing: framed
// rectangles with a cusped arch outline in each, 1.5 m per panel.
function sandstoneTexture(inlay: boolean) {
  return canvasTexture(1024, inlay ? 21 : 22, (ctx, S, rand) => {
    const px = S / 3; // pixels per metre
    ctx.fillStyle = '#b06a50';
    ctx.fillRect(0, 0, S, S);
    // Ashlar courses, 0.5 m high, blocks 0.75-1 m long, slight tone variation.
    for (let row = 0; row < 6; row++) {
      let x = row % 2 ? -0.4 * px : 0;
      while (x < S) {
        const w = (0.75 + rand() * 0.25) * px;
        const t = rand();
        ctx.fillStyle = `rgb(${176 + t * 18}, ${100 + t * 14}, ${76 + t * 10})`;
        ctx.fillRect(x + 1, row * 0.5 * px + 1, w - 2, 0.5 * px - 2);
        x += w;
      }
    }
    for (let k = 0; k < 40; k++) {
      ctx.fillStyle = `rgba(${rand() < 0.5 ? '120,50,30' : '215,140,100'}, 0.06)`;
      ctx.fillRect(0, rand() * S, S, 1 + rand() * 3);
    }
    if (inlay) {
      const P = 1.5 * px, line = 0.022 * px;
      ctx.strokeStyle = '#efe7da';
      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          const x = i * P, y = j * P;
          ctx.lineWidth = line;
          ctx.strokeRect(x + line, y + line, P - 2 * line, P - 2 * line); // outer frame
          const m = 0.16 * px;
          ctx.lineWidth = line * 0.7;
          ctx.strokeRect(x + m, y + m, P - 2 * m, P - 2 * m); // inner frame
          // Cusped (multifoil) arch outline in the panel.
          const cx = x + P / 2, top = y + 0.38 * px, bottom = y + P - 0.3 * px, half = 0.36 * px;
          ctx.beginPath();
          ctx.moveTo(cx - half, bottom);
          ctx.lineTo(cx - half, top + half);
          for (let f = 0; f < 5; f++) {
            const a0 = Math.PI + (f * Math.PI) / 5, a1 = Math.PI + ((f + 1) * Math.PI) / 5;
            const r = half;
            const ex = cx + Math.cos(a1) * r, ey = top + half + Math.sin(a1) * r * 1.15;
            const mx = cx + Math.cos((a0 + a1) / 2) * r * 1.12, my = top + half + Math.sin((a0 + a1) / 2) * r * 1.3;
            ctx.quadraticCurveTo(mx, my, ex, ey);
          }
          ctx.lineTo(cx + half, bottom);
          ctx.stroke();
          // Small floral rosette in the spandrels.
          ctx.fillStyle = '#efe7da';
          for (const sx of [x + m + 0.12 * px, x + P - m - 0.12 * px]) {
            ctx.beginPath();
            ctx.arc(sx, y + m + 0.12 * px, 0.035 * px, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
    grain(ctx, S, rand, 18);
  });
}

// White marble with soft veining; one repeat = 4 m.
function marbleTexture() {
  return canvasTexture(1024, 31, (ctx, S, rand) => {
    ctx.fillStyle = '#efe9df';
    ctx.fillRect(0, 0, S, S);
    for (let k = 0; k < 60; k++) {
      ctx.fillStyle = `rgba(${rand() < 0.5 ? '210,204,195' : '250,247,242'}, 0.25)`;
      ctx.beginPath();
      ctx.arc(rand() * S, rand() * S, 20 + rand() * 90, 0, Math.PI * 2);
      ctx.fill();
    }
    veins(ctx, S, rand, 26, 0.35);
    grain(ctx, S, rand, 6);
  });
}

// Courtyard paving: 0.6 m white-grey marble slabs with fine dark joints, as
// in Badshahi's courtyard; one repeat = 2.4 m (4 x 4 slabs).
function marbleSlabTexture() {
  return canvasTexture(1024, 41, (ctx, S, rand) => {
    const cell = S / 4;
    ctx.fillStyle = '#6f6b66';
    ctx.fillRect(0, 0, S, S);
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        const t = rand();
        ctx.fillStyle = `rgb(${206 + t * 30}, ${203 + t * 30}, ${197 + t * 30})`;
        ctx.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
      }
    }
    ctx.save();
    ctx.beginPath();
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) ctx.rect(i * cell + 2, j * cell + 2, cell - 4, cell - 4);
    ctx.clip();
    veins(ctx, S, rand, 40, 0.45);
    ctx.restore();
    grain(ctx, S, rand, 8);
  });
}

// World-space box mapping: each fragment samples the texture on the plane
// facing its normal, `metres` per repeat; the texture's sRGB is decoded by hand.
function worldMappedMaterial(texture: THREE.Texture, metres: number, params: THREE.MeshStandardMaterialParameters) {
  const material = new THREE.MeshStandardMaterial({ ...params, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.stoneTex = { value: texture };
    shader.uniforms.stoneScale = { value: 1 / metres };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStonePos;\nvarying vec3 vStoneNormal;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvStonePos = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvStoneNormal = normalize(mat3(modelMatrix) * objectNormal);',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vStonePos;\nvarying vec3 vStoneNormal;\nuniform sampler2D stoneTex;\nuniform float stoneScale;')
      .replace(
        '#include <map_fragment>',
        [
          'vec3 sn = abs(normalize(vStoneNormal));',
          'vec2 suv = sn.y > max(sn.x, sn.z) ? vStonePos.xz : (sn.x > sn.z ? vStonePos.zy : vStonePos.xy);',
          'diffuseColor.rgb *= pow(texture2D(stoneTex, suv * stoneScale).rgb, vec3(2.2));',
        ].join('\n'),
      );
  };
  return material;
}

// Shared Mughal stone materials, made on first use.
let mughal: Record<'inlay' | 'sandstone' | 'roof' | 'marble' | 'trim', THREE.MeshStandardMaterial> | null = null;
function mughalMaterial(meshName: string): THREE.MeshStandardMaterial | null {
  mughal ??= (() => {
    const marble = marbleTexture();
    return {
      inlay: worldMappedMaterial(sandstoneTexture(true), 4.5, { color: 0xffffff, roughness: 0.82 }), // 2.25 m panels
      sandstone: worldMappedMaterial(sandstoneTexture(false), 3, { color: 0xffffff, roughness: 0.86 }),
      // Roofs in pale lime plaster, set apart from the sandstone walls.
      roof: worldMappedMaterial(marble, 6, { color: 0xddd0bf, roughness: 0.95 }),
      marble: worldMappedMaterial(marble, 4, { color: 0xffffff, roughness: 0.32, metalness: 0.02 }),
      trim: worldMappedMaterial(marble, 2, { color: 0xf6f1e8, roughness: 0.45 }),
    };
  })();
  if (meshName.includes('dome')) return mughal.marble;
  if (meshName.includes('sweep')) return mughal.trim;
  if (meshName.includes('roof')) return mughal.roof;
  if (meshName.includes('chips wall')) return mughal.sandstone;
  if (meshName.includes('tile wall') || meshName.includes('tiles wall')) return mughal.inlay;
  return null;
}

// Cut and fill to level the site rectangle at its mean ground height (a
// balanced platform; batters outside it are ignored), from the raw DTM.
function platformEarthworks(h: HeightData, site: THREE.Box3) {
  const { values, width, height } = h;
  const cellArea = (CONFIG.TERRAIN_WIDTH / (width - 1)) * (CONFIG.TERRAIN_DEPTH / (height - 1));
  const inside: number[] = [];
  for (let row = 0; row < height; row++) {
    const z = (row / (height - 1) - 0.5) * CONFIG.TERRAIN_DEPTH;
    if (z < site.min.z || z > site.max.z) continue;
    for (let col = 0; col < width; col++) {
      const x = (col / (width - 1) - 0.5) * CONFIG.TERRAIN_WIDTH;
      if (x >= site.min.x && x <= site.max.x) inside.push(values[row * width + col] * CONFIG.DISPLACEMENT_SCALE);
    }
  }
  if (!inside.length) return { cut: 0, fill: 0, siteArea: 0 };
  const level = inside.reduce((a, b) => a + b, 0) / inside.length;
  let cut = 0, fill = 0;
  for (const v of inside) {
    if (v > level) cut += (v - level) * cellArea;
    else fill += (level - v) * cellArea;
  }
  return { cut, fill, siteArea: inside.length * cellArea };
}

// Floor material: dark asphalt, except white marble slabs inside CONFIG.PLAZA.
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
    shader.uniforms.plazaTex = { value: marbleSlabTexture() };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vFloorXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFloorXZ = (modelMatrix * vec4(transformed, 1.0)).xz;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec2 vFloorXZ;\nuniform vec2 plazaMin;\nuniform vec2 plazaMax;\nuniform sampler2D plazaTex;',
      )
      .replace(
        '#include <color_fragment>',
        // White marble slabs, 2.4 m per texture repeat (sRGB texture decoded by hand).
        '#include <color_fragment>\nif (all(greaterThan(vFloorXZ, plazaMin)) && all(lessThan(vFloorXZ, plazaMax))) diffuseColor.rgb = pow(texture2D(plazaTex, vFloorXZ / 2.4).rgb, vec3(2.2));',
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
