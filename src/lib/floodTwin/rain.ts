// Rain: GPU line streaks. Each drop has a fixed random seed; its position is
// computed in the vertex shader from uTime = timeline t, so the rain is
// deterministic. Drops fill a box that follows the camera but wraps in world
// space (they don't slide when the camera moves). A drop is shown when its
// seed is below the current intensity, so intensity follows daily rainfall.

import * as THREE from 'three';
import { RAIN } from './config';

export interface RainLayer {
  mesh: THREE.LineSegments;
  update(time: number, intensity: number, camera: THREE.Vector3, groundY: number): void;
  dispose(): void;
}

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRain(count: number): RainLayer {
  const rand = mulberry32(7);
  const seeds = new Float32Array(count * 2 * 4);
  const ends = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const s = [rand(), rand(), rand(), rand()];
    for (let e = 0; e < 2; e++) {
      seeds.set(s, (i * 2 + e) * 4);
      ends[i * 2 + e] = e;
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 2 * 3), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
  geometry.setAttribute('aEnd', new THREE.BufferAttribute(ends, 1));

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uCenter: { value: new THREE.Vector3() },
      uBottom: { value: 0 },
      uBox: { value: RAIN.BOX },
      uHeight: { value: RAIN.HEIGHT },
      uSpeed: { value: RAIN.SPEED },
      uStreak: { value: RAIN.STREAK },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed;
      attribute float aEnd;
      uniform float uTime, uIntensity, uBottom, uBox, uHeight, uSpeed, uStreak;
      uniform vec3 uCenter;
      varying float vAlpha;
      void main() {
        if (aSeed.w >= uIntensity) {
          gl_Position = vec4(2.0, 2.0, 2.0, 1.0); // outside the clip volume
          vAlpha = 0.0;
          return;
        }
        float x0 = uCenter.x - 0.5 * uBox, z0 = uCenter.z - 0.5 * uBox;
        float speed = uSpeed * (0.85 + 0.3 * aSeed.z);
        vec3 p = vec3(
          x0 + mod(aSeed.x * uBox - x0, uBox),
          uBottom + mod(aSeed.y * uHeight - uTime * speed, uHeight),
          z0 + mod(aSeed.z * 7.31 * uBox - z0, uBox)
        );
        // Streak with a slight wind slant.
        p += aEnd * vec3(0.12, 1.0, 0.05) * uStreak;
        vAlpha = mix(0.55, 0.05, aEnd);
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(0.82, 0.87, 0.92, vAlpha);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.LineSegments(geometry, material);
  mesh.name = 'rain';
  mesh.frustumCulled = false;
  mesh.renderOrder = 2;

  return {
    mesh,
    update(time, intensity, camera, groundY) {
      const u = material.uniforms;
      u.uTime.value = time;
      u.uIntensity.value = intensity;
      u.uCenter.value.copy(camera);
      // The drop column runs from the ground to above the camera.
      u.uBottom.value = Math.max(groundY, camera.y - RAIN.HEIGHT * 0.7);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
