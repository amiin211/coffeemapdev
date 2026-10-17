// Buildings: footprints extruded in the browser and merged into one
// BufferGeometry. Each vertex carries its building's index (aBuildingIndex),
// and a small float texture holds per-building data (base elevation and a
// selection flag), so the shader colours every building by the current water
// depth with no per-frame CPU work, and recolouring one building is a single
// texel write.

import * as THREE from 'three';
import { BUILDING_FOOTING_M, DEPTH_CLASSES } from './config';
import type { BuildingCollection, BuildingProps } from './data';

const DATA_WIDTH = 1024;

export interface BuildingLayer {
  mesh: THREE.Mesh;
  props: BuildingProps[];
  setWaterLevel(level: number): void;
  setSelected(index: number | null): void;
  /** Building index of the face hit by a raycast. */
  indexOfFace(faceVertex: number): number;
  dispose(): void;
}

function ringToPoints(ring: GeoJSON.Position[]) {
  const pts = ring.map(([x, y]) => new THREE.Vector2(x, y));
  if (pts.length > 1 && pts[0].equals(pts[pts.length - 1])) pts.pop();
  return pts;
}

function polygonShapes(geom: GeoJSON.Polygon | GeoJSON.MultiPolygon): THREE.Shape[] {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  return polys.map(([outer, ...holes]) => {
    const shape = new THREE.Shape(ringToPoints(outer));
    shape.holes = holes.map((h) => new THREE.Path(ringToPoints(h)));
    return shape;
  });
}

/**
 * @param worldY maps an elevation (m) to world y (datum + vertical exaggeration).
 * @param exaggeration vertical exaggeration, applied to building heights too.
 */
export function createBuildings(collection: BuildingCollection, worldY: (elev: number) => number, exaggeration: number): BuildingLayer {
  const props = collection.features.map((f) => f.properties);
  const parts: { pos: ArrayLike<number>; nrm: ArrayLike<number>; index: number; y0: number }[] = [];
  let total = 0;
  collection.features.forEach((f, index) => {
    const p = f.properties;
    const depth = (p.height_m + BUILDING_FOOTING_M) * exaggeration;
    for (const shape of polygonShapes(f.geometry)) {
      const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1, curveSegments: 1 });
      const pos = g.getAttribute('position').array, nrm = g.getAttribute('normal').array;
      parts.push({ pos, nrm, index, y0: worldY(p.base_elev_m - BUILDING_FOOTING_M) });
      total += pos.length / 3;
      g.dispose();
    }
  });

  // Merge, mapping the extrusion frame (x east, y north, z up) to the world
  // (x east, y up, z south): (x, y, z) -> (x, z + y0, -y).
  const position = new Float32Array(total * 3);
  const normal = new Float32Array(total * 3);
  const buildingIndex = new Float32Array(total);
  let v = 0;
  for (const { pos, nrm, index, y0 } of parts) {
    for (let i = 0; i < pos.length; i += 3, v++) {
      position[v * 3] = pos[i];
      position[v * 3 + 1] = pos[i + 2] + y0;
      position[v * 3 + 2] = -pos[i + 1];
      normal[v * 3] = nrm[i];
      normal[v * 3 + 1] = nrm[i + 2];
      normal[v * 3 + 2] = -nrm[i + 1];
      buildingIndex[v] = index;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
  geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  geometry.setAttribute('aBuildingIndex', new THREE.BufferAttribute(buildingIndex, 1));
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  // Per-building data: r = base elevation (m), g = selected.
  const rows = Math.max(1, Math.ceil(props.length / DATA_WIDTH));
  const data = new Float32Array(DATA_WIDTH * rows * 4);
  props.forEach((p, i) => (data[i * 4] = p.base_elev_m));
  const dataTex = new THREE.DataTexture(data, DATA_WIDTH, rows, THREE.RGBAFormat, THREE.FloatType);
  dataTex.needsUpdate = true;

  const uniforms = {
    uBuildingData: { value: dataTex },
    uWaterLevel: { value: -1e9 },
    uDepthColors: { value: DEPTH_CLASSES.map((c) => new THREE.Color(c.color)) },
    uHighlight: { value: new THREE.Color('#00e5ff') },
  };
  const material = new THREE.MeshStandardMaterial({ roughness: 0.85, metalness: 0 });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float aBuildingIndex;
        uniform highp sampler2D uBuildingData;
        uniform float uWaterLevel;
        uniform vec3 uDepthColors[4];
        uniform vec3 uHighlight;
        varying vec3 vBuildingColor;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        int bi = int(aBuildingIndex + 0.5);
        vec4 bd = texelFetch(uBuildingData, ivec2(bi % ${DATA_WIDTH}, bi / ${DATA_WIDTH}), 0);
        float depth = uWaterLevel - bd.r;
        vBuildingColor = depth <= ${DEPTH_CLASSES[0].max.toFixed(2)} ? uDepthColors[0]
          : depth < ${DEPTH_CLASSES[1].max.toFixed(2)} ? uDepthColors[1]
          : depth < ${DEPTH_CLASSES[2].max.toFixed(2)} ? uDepthColors[2] : uDepthColors[3];
        if (bd.g > 0.5) vBuildingColor = mix(vBuildingColor, uHighlight, 0.65);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBuildingColor;')
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( vBuildingColor, opacity );');
  };

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'buildings';
  let selected: number | null = null;

  return {
    mesh,
    props,
    setWaterLevel(level) {
      uniforms.uWaterLevel.value = level;
    },
    setSelected(index) {
      if (selected !== null) data[selected * 4 + 1] = 0;
      selected = index;
      if (index !== null) data[index * 4 + 1] = 1;
      dataTex.needsUpdate = true;
    },
    indexOfFace(faceVertex) {
      return Math.round(buildingIndex[faceVertex]);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      dataTex.dispose();
    },
  };
}
