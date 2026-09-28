'use client';

import { useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import MapGL, { Source, Layer, Popup, NavigationControl, ScaleControl, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AOI,
  DEM_SOURCE,
  FLOOD_COLOR,
  Grid,
  PERMANENT_WATER_COLOR,
  RISK_CLASSES,
  RiverCollection,
  gridCorners,
} from '@/lib/floodRisk';
import { MAPLIBRE_WORKER_URL } from '@/lib/maplibre';

export interface LayerVisibility {
  hillshade: boolean;
  rainfall: boolean;
  risk: boolean;
  flood: boolean;
  rivers: boolean;
}

export interface CellInfo {
  lng: number;
  lat: number;
  rows: [string, string][];
}

interface FloodRiskMapProps {
  grid: Grid | null;
  images: { risk?: string; flood?: string; rainfall?: string };
  rivers: RiverCollection | null;
  visible: LayerVisibility;
  describeCell: (lng: number, lat: number) => CellInfo | null;
}

// OpenStreetMap standard tiles, desaturated so the analysis layers stand out.
const BASEMAP: StyleSpecification = {
  version: 8,
  sources: {
    basemap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    },
  },
  layers: [{ id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-saturation': -0.7, 'raster-opacity': 0.85 } }],
};

const rgb = (c: readonly number[]) => `rgb(${c.join(',')})`;
const visibility = (on: boolean) => (on ? 'visible' : 'none') as 'visible' | 'none';

const floatingPanelSx = {
  bgcolor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  borderRadius: 1.5,
  boxShadow: 2,
};

function Swatch({ color, label }: { color: string; label: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ lineHeight: 1.3 }}>{label}</Typography>
    </Box>
  );
}

export default function FloodRiskMap({ grid, images, rivers, visible, describeCell }: FloodRiskMapProps) {
  const [popup, setPopup] = useState<CellInfo | null>(null);
  const corners = grid ? gridCorners(grid) : null;

  const onClick = (e: MapLayerMouseEvent) => {
    setPopup(describeCell(e.lngLat.lng, e.lngLat.lat));
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapGL
        workerUrl={MAPLIBRE_WORKER_URL}
        initialViewState={{ bounds: [[AOI.minLon, AOI.minLat], [AOI.maxLon, AOI.maxLat]], fitBoundsOptions: { padding: 20 } }}
        mapStyle={BASEMAP}
        style={{ width: '100%', height: '100%' }}
        onClick={onClick}
        cursor="crosshair"
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* DEM hillshade, rendered by MapLibre (WebGL) from the same terrain tiles the model uses. */}
        <Source
          id="dem"
          type="raster-dem"
          tiles={[DEM_SOURCE.tiles]}
          tileSize={DEM_SOURCE.tileSize}
          encoding={DEM_SOURCE.encoding}
          maxzoom={DEM_SOURCE.maxzoom}
        >
          <Layer
            id="hillshade"
            type="hillshade"
            layout={{ visibility: visibility(visible.hillshade) }}
            paint={{ 'hillshade-exaggeration': 0.6, 'hillshade-shadow-color': '#3d3d3d' }}
          />
        </Source>

        {corners && images.rainfall && (
          <Source id="rainfall" type="image" url={images.rainfall} coordinates={corners}>
            <Layer id="rainfall" type="raster" layout={{ visibility: visibility(visible.rainfall) }} paint={{ 'raster-resampling': 'nearest' }} />
          </Source>
        )}
        {corners && images.risk && (
          <Source id="risk" type="image" url={images.risk} coordinates={corners}>
            <Layer id="risk" type="raster" layout={{ visibility: visibility(visible.risk) }} paint={{ 'raster-resampling': 'nearest' }} />
          </Source>
        )}
        {corners && images.flood && (
          <Source id="flood" type="image" url={images.flood} coordinates={corners}>
            <Layer id="flood" type="raster" layout={{ visibility: visibility(visible.flood) }} paint={{ 'raster-resampling': 'nearest' }} />
          </Source>
        )}
        {rivers && (
          <Source id="rivers" type="geojson" data={rivers}>
            <Layer
              id="rivers"
              type="line"
              layout={{ visibility: visibility(visible.rivers), 'line-join': 'round', 'line-cap': 'round' }}
              paint={{ 'line-color': '#0d47a1', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 10, 2.5], 'line-opacity': 0.85 }}
            />
          </Source>
        )}
        <Source
          id="aoi"
          type="geojson"
          data={{
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [AOI.minLon, AOI.minLat], [AOI.maxLon, AOI.minLat], [AOI.maxLon, AOI.maxLat], [AOI.minLon, AOI.maxLat], [AOI.minLon, AOI.minLat],
              ],
            },
          }}
        >
          <Layer id="aoi" type="line" paint={{ 'line-color': '#37474f', 'line-width': 1.2, 'line-dasharray': [3, 2] }} />
        </Source>

        {popup && (
          <Popup longitude={popup.lng} latitude={popup.lat} onClose={() => setPopup(null)} closeOnClick={false} maxWidth="260px">
            <Typography variant="caption" color="text.secondary">
              {popup.lat.toFixed(4)}° N, {popup.lng.toFixed(4)}° E
            </Typography>
            <Box component="table" sx={{ mt: 0.5, borderCollapse: 'collapse', '& td': { py: 0.25, fontSize: '0.75rem' } }}>
              <tbody>
                {popup.rows.map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ paddingRight: 12, color: '#666' }}>{label}</td>
                    <td style={{ fontWeight: 600 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Popup>
        )}
      </MapGL>

      <Box sx={{ position: 'absolute', left: 12, bottom: 12, p: 1.5, minWidth: 150, ...floatingPanelSx }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>Flood risk</Typography>
        {RISK_CLASSES.map((c) => (
          <Swatch key={c.label} color={rgb(c.color)} label={c.label} />
        ))}
        <Divider sx={{ my: 0.75 }} />
        <Swatch color={rgb(FLOOD_COLOR)} label="SAR flood extent" />
        <Swatch color={rgb(PERMANENT_WATER_COLOR)} label="Permanent water" />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 14, height: 3, bgcolor: '#0d47a1', flexShrink: 0 }} />
          <Typography variant="caption">Rivers (OSM)</Typography>
        </Box>
      </Box>
    </Box>
  );
}
