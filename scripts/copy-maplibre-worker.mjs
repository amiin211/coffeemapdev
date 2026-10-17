// Copies MapLibre GL's web worker (and the RTL text plugin) into public/maplibre/
// (run before dev and build).
//
// MapLibre 6 loads its worker as a separate module file next to its own
// bundle, which Next's bundler doesn't emit, so the maps fail with "Worker
// failed to load". The maps point at this copy through react-map-gl's
// `workerUrl` prop (src/lib/maplibre.ts). Relative imports are followed so
// the chunks the worker imports are copied too.

import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(repoRoot, 'node_modules/maplibre-gl/dist');
const outDir = path.join(repoRoot, 'public/maplibre');

mkdirSync(outDir, { recursive: true });

const copied = new Set();
const pending = ['maplibre-gl-worker.mjs'];
while (pending.length) {
  const file = pending.pop();
  if (copied.has(file)) continue;
  copied.add(file);
  const source = path.join(srcDir, file);
  copyFileSync(source, path.join(outDir, file));
  for (const [, dep] of readFileSync(source, 'utf8').matchAll(/(?:from|import)\s*["']\.\/([^"']+\.mjs)["']/g)) {
    pending.push(dep);
  }
}

// MapLibre's right-to-left text plugin (Arabic shaping and bidi for map
// labels), loaded on Arabic pages through setRTLTextPlugin.
const rtlPlugin = 'mapbox-gl-rtl-text.js';
copyFileSync(path.join(repoRoot, 'node_modules/@mapbox/mapbox-gl-rtl-text/dist', rtlPlugin), path.join(outDir, rtlPlugin));
copied.add(rtlPlugin);

console.log(`maplibre worker: copied ${[...copied].join(', ')} to public/maplibre/`);
