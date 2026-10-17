// Blue Nile Flood Twin scene: terrain, buildings, water, rain and the
// optional ML flood extent. The scene holds no animation logic of its own:
// apply(evaluate(t)) sets every animated value from the timeline state, so
// a given t always renders the same frame.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createBuildings, type BuildingLayer } from './buildings';
import {
  CAMERA_FOV, FLOOD_EXTENT_COLOR, FLOOD_EXTENT_OPACITY, FOG, MAX_PIXEL_RATIO, MAX_PIXEL_RATIO_MOBILE, RAIN, SKY, VERTICAL_EXAGGERATION,
} from './config';
import type { ExtentCollection, FloodTwinData } from './data';
import { createRain, type RainLayer } from './rain';
import type { SceneState } from './timeline';
import { createWater, type WaterLayer } from './water';

export interface Layers {
  buildings: boolean;
  water: boolean;
  rain: boolean;
  floodExtent: boolean;
  satellite: boolean;
}

export interface SceneOptions {
  mobile: boolean;
  /** Fixed drawing-buffer size (video export); otherwise the container's size. */
  fixedSize?: { width: number; height: number };
}

const EXTENT_TEX_SIZE = 2048;

export class FloodTwinScene {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly buildings: BuildingLayer;
  readonly half: number;
  onSelect: (index: number | null) => void = () => {};

  private water: WaterLayer;
  private rain: RainLayer;
  private terrain: THREE.Mesh;
  private terrainUniforms = {
    uSatellite: { value: 1 },
    uPlain: { value: new THREE.Color('#c9bea7') },
    uExtent: { value: null as THREE.Texture | null },
    uExtentOpacity: { value: 0 },
    uExtentColor: { value: new THREE.Color(FLOOD_EXTENT_COLOR) },
  };
  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private sky = { clear: new THREE.Color(SKY.CLEAR), storm: new THREE.Color(SKY.STORM), now: new THREE.Color() };
  private freeCamera = false;
  private resizeObserver: ResizeObserver | null = null;
  private pointerDown: { x: number; y: number } | null = null;
  private raycaster = new THREE.Raycaster();
  private disposables: { dispose(): void }[] = [];
  private lastState: SceneState | null = null;

  constructor(private container: HTMLElement, private data: FloodTwinData, private options: SceneOptions) {
    const { terrain, heights } = data;
    this.half = Math.max(terrain.width_m, terrain.height_m) / 2;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(options.fixedSize ? 1 : Math.min(window.devicePixelRatio, options.mobile ? MAX_PIXEL_RATIO_MOBILE : MAX_PIXEL_RATIO));
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);
    this.renderer = renderer;

    this.camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 5, 30000);
    this.controls = new OrbitControls(this.camera, renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05;
    this.controls.minDistance = 40;
    this.controls.maxDistance = this.half * 5;
    this.controls.enabled = false;

    this.scene.fog = new THREE.Fog(SKY.CLEAR, FOG.NEAR, FOG.FAR);
    this.hemi = new THREE.HemisphereLight('#eef6ff', '#7a6a55', 2.0);
    this.sun = new THREE.DirectionalLight('#fff4e0', 2.5);
    this.sun.position.set(0.45, 0.8, 0.35).multiplyScalar(1000);
    this.scene.add(this.hemi, this.sun);

    this.terrain = this.createTerrain();
    this.scene.add(this.terrain, this.createSkirt());

    this.buildings = createBuildings(data.buildings, this.worldY, VERTICAL_EXAGGERATION);
    this.water = createWater(heights, terrain.width_m, terrain.height_m, VERTICAL_EXAGGERATION);
    this.rain = createRain(options.mobile ? RAIN.COUNT_MOBILE : RAIN.COUNT);
    this.scene.add(this.buildings.mesh, this.water.mesh, this.rain.mesh);
    this.disposables.push(this.buildings, this.water, this.rain);

    if (data.floodExtent) this.terrainUniforms.uExtent.value = this.extentTexture(data.floodExtent);

    this.resize();
    if (!options.fixedSize) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(container);
    }
    renderer.domElement.addEventListener('pointerdown', this.handlePointerDown);
    renderer.domElement.addEventListener('pointerup', this.handlePointerUp);
  }

  /** Elevation (m) -> world y. */
  worldY = (elev: number) => (elev - this.data.heights.min) * VERTICAL_EXAGGERATION;

  // ---------------------------------------------------------------- terrain --
  private createTerrain() {
    const { terrain, heights, texture } = this.data;
    const geometry = new THREE.PlaneGeometry(terrain.width_m, terrain.height_m, heights.width - 1, heights.height - 1).rotateX(-Math.PI / 2);
    // Vertex i is heightmap pixel i: row 0 is the north edge (z = -height / 2).
    const pos = geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) pos.setY(i, this.worldY(heights.values[i]));
    geometry.computeVertexNormals();

    const map = new THREE.Texture(texture);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    map.needsUpdate = true;
    const blank = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    blank.needsUpdate = true;
    this.terrainUniforms.uExtent.value = blank;

    const material = new THREE.MeshStandardMaterial({ map, roughness: 1, metalness: 0 });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.terrainUniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform float uSatellite, uExtentOpacity;
          uniform vec3 uPlain, uExtentColor;
          uniform sampler2D uExtent;`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
          diffuseColor.rgb = mix(uPlain, diffuseColor.rgb, uSatellite);
          diffuseColor.rgb = mix(diffuseColor.rgb, uExtentColor, texture2D(uExtent, vMapUv).r * uExtentOpacity);`,
        );
    };
    this.disposables.push(geometry, material, map, blank);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'terrain';
    return mesh;
  }

  /** Earth-coloured walls down from the terrain edges, so the AOI reads as a block. */
  private createSkirt() {
    const { terrain, heights } = this.data;
    const { width: gw, height: gh, values } = heights;
    const hw = terrain.width_m / 2, hh = terrain.height_m / 2;
    const bottom = -20 * VERTICAL_EXAGGERATION;
    const edges: [number, number][][] = [
      Array.from({ length: gw }, (_, c) => [c, 0]), //       north, west -> east
      Array.from({ length: gh }, (_, r) => [gw - 1, r]), //   east, north -> south
      Array.from({ length: gw }, (_, c) => [gw - 1 - c, gh - 1]), // south, east -> west
      Array.from({ length: gh }, (_, r) => [0, gh - 1 - r]), //       west, south -> north
    ];
    const verts: number[] = [];
    for (const edge of edges) {
      for (let i = 0; i < edge.length - 1; i++) {
        const [a, b] = [edge[i], edge[i + 1]].map(([c, r]) => [
          (c / (gw - 1)) * 2 * hw - hw,
          this.worldY(values[r * gw + c]),
          (r / (gh - 1)) * 2 * hh - hh,
        ]);
        verts.push(...a, a[0], bottom, a[2], ...b, ...b, a[0], bottom, a[2], b[0], bottom, b[2]);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geometry.computeVertexNormals();
    const material = new THREE.MeshLambertMaterial({ color: '#6b5843', side: THREE.DoubleSide });
    this.disposables.push(geometry, material);
    return new THREE.Mesh(geometry, material);
  }

  /** Rasterises the ML flood extent polygons into a mask draped on the terrain. */
  private extentTexture(extent: ExtentCollection) {
    const { width_m: w, height_m: h } = this.data.terrain;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = EXTENT_TEX_SIZE;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#fff';
    const px = ([x, y]: GeoJSON.Position): [number, number] => [(x / w + 0.5) * EXTENT_TEX_SIZE, (0.5 - y / h) * EXTENT_TEX_SIZE];
    for (const f of extent.features) {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
      ctx.beginPath();
      for (const rings of polys) {
        for (const ring of rings) ring.forEach((p, i) => (i ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p))));
      }
      ctx.fill('evenodd');
    }
    const tex = new THREE.CanvasTexture(canvas);
    this.disposables.push(tex);
    return tex;
  }

  // ------------------------------------------------------------- per frame --
  /** Sets every animated value from the timeline state. */
  apply(state: SceneState, layers: Layers) {
    this.lastState = state;
    if (!this.freeCamera) {
      this.camera.position.set(...state.camera.position);
      this.camera.lookAt(...state.camera.target);
    }

    this.sky.now.copy(this.sky.clear).lerp(this.sky.storm, state.storm);
    this.scene.background = this.sky.now;
    (this.scene.fog as THREE.Fog).color.copy(this.sky.now);
    this.water.setFog(this.sky.now, FOG.NEAR, FOG.FAR);
    this.sun.intensity = 2.5 * (1 - 0.45 * state.storm);
    this.hemi.intensity = 2.0 * (1 - 0.25 * state.storm);

    const waterY = this.worldY(state.waterLevel);
    this.buildings.mesh.visible = layers.buildings;
    this.buildings.setWaterLevel(state.waterLevel);
    this.water.mesh.visible = layers.water && state.waterOpacity > 0.001;
    this.water.update(state.waterLevel, waterY, state.t, state.waterOpacity);
    this.rain.mesh.visible = layers.rain && state.rainIntensity > 0.001;
    this.rain.update(state.t, state.rainIntensity, this.camera.position, Math.max(waterY, 0));

    this.terrainUniforms.uSatellite.value = layers.satellite ? 1 : 0;
    this.terrainUniforms.uExtentOpacity.value = layers.floodExtent && this.data.floodExtent ? state.extentOpacity * FLOOD_EXTENT_OPACITY : 0;
  }

  render() {
    if (this.freeCamera) this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  /** Hands the camera to OrbitControls (true) or back to the scripted path. */
  setFreeCamera(free: boolean) {
    this.freeCamera = free;
    this.controls.enabled = free;
    if (free && this.lastState) {
      this.controls.target.set(...this.lastState.camera.target);
      this.controls.update();
    }
  }

  resize() {
    const size = this.options.fixedSize ?? { width: this.container.clientWidth, height: this.container.clientHeight };
    if (!size.width || !size.height) return;
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(size.width, size.height, !this.options.fixedSize);
  }

  // -------------------------------------------------------------- picking --
  private handlePointerDown = (e: PointerEvent) => {
    this.pointerDown = { x: e.clientX, y: e.clientY };
  };

  private handlePointerUp = (e: PointerEvent) => {
    const down = this.pointerDown;
    this.pointerDown = null;
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || !this.buildings.mesh.visible) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const hit = this.raycaster.intersectObjects([this.terrain, this.buildings.mesh], false)[0];
    const index = hit?.object === this.buildings.mesh && hit.face ? this.buildings.indexOfFace(hit.face.a) : null;
    this.buildings.setSelected(index);
    this.onSelect(index);
  };

  select(index: number | null) {
    this.buildings.setSelected(index);
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.renderer.domElement.removeEventListener('pointerdown', this.handlePointerDown);
    this.renderer.domElement.removeEventListener('pointerup', this.handlePointerUp);
    this.controls.dispose();
    this.disposables.forEach((d) => d.dispose());
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
