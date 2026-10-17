// Water: one flat plane at the water-surface elevation h(t) (a "bathtub"
// model: the surface is level across the AOI). The shader reads the terrain
// heights to tint by depth and fade out at the shoreline, and draws ripples
// from uTime = timeline t, so it is deterministic.

import * as THREE from 'three';
import { WATER } from './config';
import type { HeightGrid } from './data';

/**
 * Terrain heights as a half-float texture, relative to the minimum so half
 * precision keeps centimetre steps. Row 0 (north) is v = 0, matching world z
 * = -height / 2.
 */
export function heightTexture(grid: HeightGrid) {
  const data = new Uint16Array(grid.values.length);
  for (let i = 0; i < data.length; i++) data[i] = THREE.DataUtils.toHalfFloat(grid.values[i] - grid.min);
  const tex = new THREE.DataTexture(data, grid.width, grid.height, THREE.RedFormat, THREE.HalfFloatType);
  tex.magFilter = tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export interface WaterLayer {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  update(level: number, worldY: number, time: number, opacity: number): void;
  setFog(color: THREE.Color, near: number, far: number): void;
  dispose(): void;
}

export function createWater(grid: HeightGrid, widthM: number, heightM: number, exaggeration: number): WaterLayer {
  const geometry = new THREE.PlaneGeometry(widthM, heightM, 1, 1).rotateX(-Math.PI / 2);
  const heights = heightTexture(grid);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uHeights: { value: heights },
      uHeightMin: { value: grid.min },
      uAoi: { value: new THREE.Vector2(widthM, heightM) },
      uLevel: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: WATER.OPACITY },
      uShallow: { value: new THREE.Color(WATER.SHALLOW) },
      uDeep: { value: new THREE.Color(WATER.DEEP) },
      uDeepAt: { value: WATER.DEEP_AT_M },
      uShoreFade: { value: WATER.SHORE_FADE_M },
      uRippleScale: { value: WATER.RIPPLE_SCALE / Math.sqrt(exaggeration) },
      uRippleSpeed: { value: WATER.RIPPLE_SPEED },
      uSunDir: { value: new THREE.Vector3(0.45, 0.8, 0.35).normalize() },
      uFogColor: { value: new THREE.Color() },
      uFogNear: { value: 1e6 },
      uFogFar: { value: 2e6 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D uHeights;
      uniform float uHeightMin, uLevel, uTime, uOpacity, uDeepAt, uShoreFade, uRippleScale, uRippleSpeed;
      uniform vec2 uAoi;
      uniform vec3 uShallow, uDeep, uSunDir, uFogColor;
      uniform float uFogNear, uFogFar;
      varying vec3 vWorld;

      // Sum of travelling sine waves; returns the (unscaled) surface gradient.
      vec2 rippleGradient(vec2 p, float t) {
        vec2 g = vec2(0.0);
        const int N = 4;
        vec2 dirs[N] = vec2[N](vec2(0.8, 0.6), vec2(-0.5, 0.86), vec2(0.97, -0.24), vec2(-0.2, -0.98));
        float freq[N] = float[N](1.0, 1.7, 2.9, 4.3);
        for (int i = 0; i < N; i++) {
          float f = freq[i] * uRippleScale;
          float phase = dot(dirs[i], p) * f + t * uRippleSpeed * (1.3 + float(i) * 0.7);
          g += dirs[i] * cos(phase) / freq[i];
        }
        return g;
      }

      void main() {
        vec2 uv = vec2(vWorld.x / uAoi.x + 0.5, vWorld.z / uAoi.y + 0.5);
        float ground = uHeightMin + texture2D(uHeights, uv).r;
        float depth = uLevel - ground;
        if (depth <= 0.0) discard;

        vec3 n = normalize(vec3(-0.07 * rippleGradient(vWorld.xz, uTime), 1.0).xzy);
        vec3 view = normalize(cameraPosition - vWorld);
        float fresnel = pow(1.0 - max(dot(n, view), 0.0), 3.0);
        float spec = pow(max(dot(reflect(-uSunDir, n), view), 0.0), 80.0);

        vec3 col = mix(uShallow, uDeep, smoothstep(0.0, uDeepAt, depth));
        col *= 0.82 + 0.18 * max(dot(n, uSunDir), 0.0);
        col = mix(col, vec3(0.78, 0.86, 0.92), fresnel * 0.45) + spec * 0.6;

        float fogF = smoothstep(uFogNear, uFogFar, length(cameraPosition - vWorld));
        col = mix(col, uFogColor, fogF);
        float alpha = uOpacity * smoothstep(0.0, uShoreFade, depth) * (0.82 + 0.18 * fresnel);
        gl_FragColor = vec4(col, alpha);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'water';
  mesh.renderOrder = 1;

  return {
    mesh,
    material,
    update(level, worldY, time, opacity) {
      const u = material.uniforms;
      u.uLevel.value = level;
      u.uTime.value = time;
      u.uOpacity.value = WATER.OPACITY * opacity;
      mesh.position.y = worldY;
    },
    setFog(color, near, far) {
      const u = material.uniforms;
      u.uFogColor.value.copy(color);
      u.uFogNear.value = near;
      u.uFogFar.value = far;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      heights.dispose();
    },
  };
}
