// Self-hosted MapLibre worker, copied into public/ by
// scripts/copy-maplibre-worker.mjs; pass as `workerUrl` on every <MapGL>.
// Only the map components import this module, and they load client-side only.
import { getRTLTextPluginStatus, setRTLTextPlugin, setWorkerUrl } from 'maplibre-gl';

export const MAPLIBRE_WORKER_URL = '/maplibre/maplibre-gl-worker.mjs';

// MapLibre's shared worker pool (used by the RTL text plugin) is created with
// the global worker URL when the first map mounts, so set it before that.
setWorkerUrl(MAPLIBRE_WORKER_URL);

// Arabic map labels: MapLibre's right-to-left text plugin, copied next to the worker.
export function enableRtlText() {
  if (getRTLTextPluginStatus() !== 'unavailable') return Promise.resolve();
  return setRTLTextPlugin(`${window.location.origin}/maplibre/mapbox-gl-rtl-text.js`, true);
}
