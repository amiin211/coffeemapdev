'use client';

import { useEffect, useRef, useState } from 'react';
import { Box, Divider, Typography } from '@mui/material';
import MapGL, { Source, Layer, Popup, Marker, NavigationControl, ScaleControl, MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  AOI,
  DEM_SOURCE,
  DISTRICTS,
  EQUITY_RAMP,
  Grid,
  HEAT_RAMP,
  HOTSPOT_COLOR,
  NDVI_LEGEND,
  NDVI_RAMP,
  PRIORITY_COLOR,
  ParkCollection,
  TreeCollection,
  gridCorners,
} from '@/lib/urbanHeat';

export interface UrbanLayerVisibility {
  hillshade: boolean;
  heat: boolean;
  hotspots: boolean;
  vegetation: boolean;
  canopy: boolean;
  equity: boolean;
  priority: boolean;
  trees: boolean;
  parks: boolean;
}

export interface CellInfo {
  lng: number;
  lat: number;
  rows: [string, string][];
}

export type UrbanImages = Partial<Record<'heat' | 'hotspots' | 'vegetation' | 'canopy' | 'equity' | 'priority', string>>;

interface UrbanHeatMapProps {
  grid: Grid | null;
  images: UrbanImages;
  trees: TreeCollection | null;
  parks: ParkCollection | null;
  visible: UrbanLayerVisibility;
  lstRange: [number, number] | null;
  focus: { lon: number; lat: number } | null;
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
  layers: [{ id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-saturation': -0.8, 'raster-opacity': 0.9 } }],
};

// Image overlays, bottom to top.
const RASTERS: (keyof UrbanImages)[] = ['heat', 'vegetation', 'canopy', 'equity', 'hotspots', 'priority'];

const rgb = (c: readonly number[]) => `rgb(${c.join(',')})`;
const gradient = (ramp: number[][]) => `linear-gradient(to right, ${ramp.map(rgb).join(', ')})`;
const visibility = (on: boolean) => (on ? 'visible' : 'none') as 'visible' | 'none';

function RampLegend({ title, ramp, left, right }: { title: string; ramp: number[][]; left: string; right: string }) {
  return (
    <Box sx={{ mb: 0.75 }}>
      <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>{title}</Typography>
      <Box sx={{ height: 8, borderRadius: 0.5, background: gradient(ramp), my: 0.25 }} />
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{left}</Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>{right}</Typography>
      </Box>
    </Box>
  );
}

function Swatch({ color, label, round }: { color: string; label: string; round?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 12, height: 12, borderRadius: round ? '50%' : 0.5, bgcolor: color, flexShrink: 0 }} />
      <Typography variant="caption" sx={{ lineHeight: 1.4 }}>{label}</Typography>
    </Box>
  );
}

export default function UrbanHeatMap({ grid, images, trees, parks, visible, lstRange, focus, describeCell }: UrbanHeatMapProps) {
  const [popup, setPopup] = useState<CellInfo | null>(null);
  const mapRef = useRef<MapRef>(null);
  const corners = grid ? gridCorners(grid) : null;

  useEffect(() => {
    if (focus) mapRef.current?.flyTo({ center: [focus.lon, focus.lat], zoom: 13.5, duration: 1500 });
  }, [focus]);

  const onClick = (e: MapLayerMouseEvent) => setPopup(describeCell(e.lngLat.lng, e.lngLat.lat));

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapGL
        ref={mapRef}
        initialViewState={{ bounds: [[AOI.minLon, AOI.minLat], [AOI.maxLon, AOI.maxLat]], fitBoundsOptions: { padding: 20 } }}
        mapStyle={BASEMAP}
        style={{ width: '100%', height: '100%' }}
        onClick={onClick}
        cursor="crosshair"
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />

        {/* DEM hillshade, rendered by MapLibre (WebGL) from terrain tiles. */}
        <Source id="dem" type="raster-dem" tiles={[DEM_SOURCE.tiles]} tileSize={DEM_SOURCE.tileSize} encoding={DEM_SOURCE.encoding} maxzoom={DEM_SOURCE.maxzoom}>
          <Layer id="hillshade" type="hillshade" layout={{ visibility: visibility(visible.hillshade) }} paint={{ 'hillshade-exaggeration': 0.5 }} />
        </Source>

        {corners && RASTERS.map((key) => images[key] && (
          <Source key={key} id={key} type="image" url={images[key]} coordinates={corners}>
            <Layer id={key} type="raster" layout={{ visibility: visibility(visible[key]) }} paint={{ 'raster-resampling': 'nearest', 'raster-fade-duration': 0 }} />
          </Source>
        ))}

        {parks && (
          <Source id="parks" type="geojson" data={parks}>
            <Layer id="parks-fill" type="fill" layout={{ visibility: visibility(visible.parks) }} paint={{ 'fill-color': '#2e7d32', 'fill-opacity': 0.35 }} />
            <Layer id="parks-line" type="line" layout={{ visibility: visibility(visible.parks) }} paint={{ 'line-color': '#1b5e20', 'line-width': 1 }} />
          </Source>
        )}
        {trees && (
          <Source id="trees" type="geojson" data={trees}>
            <Layer
              id="trees"
              type="circle"
              layout={{ visibility: visibility(visible.trees) }}
              paint={{
                'circle-color': '#43a047',
                'circle-stroke-color': '#1b5e20',
                'circle-stroke-width': 0.8,
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 1.5, 15, 5],
              }}
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
              coordinates: [[AOI.minLon, AOI.minLat], [AOI.maxLon, AOI.minLat], [AOI.maxLon, AOI.maxLat], [AOI.minLon, AOI.maxLat], [AOI.minLon, AOI.minLat]],
            },
          }}
        >
          <Layer id="aoi" type="line" paint={{ 'line-color': '#37474f', 'line-width': 1.2, 'line-dasharray': [3, 2] }} />
        </Source>

        {DISTRICTS.map((d) => (
          <Marker key={d.name} longitude={d.lon} latitude={d.lat} anchor={d.labelBelow ? 'top' : 'bottom'}>
            <Box
              sx={{
                px: 0.75,
                py: 0.1,
                borderRadius: 0.5,
                bgcolor: 'rgba(33,33,33,0.72)',
                color: 'white',
                fontSize: '0.68rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
              }}
            >
              {d.name}
            </Box>
          </Marker>
        ))}

        {popup && (
          <Popup longitude={popup.lng} latitude={popup.lat} onClose={() => setPopup(null)} closeOnClick={false} maxWidth="280px">
            <Typography variant="caption" color="text.secondary">
              {popup.lat.toFixed(4)}° N, {popup.lng.toFixed(4)}° E
            </Typography>
            <Box component="table" sx={{ mt: 0.5, borderCollapse: 'collapse', '& td': { py: 0.2, fontSize: '0.74rem' } }}>
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

      <Box
        sx={{
          position: 'absolute',
          left: 12,
          bottom: 12,
          p: 1.5,
          width: 190,
          bgcolor: 'rgba(255,255,255,0.93)',
          backdropFilter: 'blur(8px)',
          borderRadius: 1.5,
          boxShadow: 2,
        }}
      >
        {visible.heat && lstRange && (
          <RampLegend title="Land surface temp." ramp={HEAT_RAMP} left={`${Math.round(lstRange[0] - 4)} °C`} right={`${Math.round(lstRange[1] + 4)} °C`} />
        )}
        {visible.vegetation && <RampLegend title="NDVI" ramp={NDVI_RAMP} left={String(NDVI_LEGEND[0])} right={String(NDVI_LEGEND[1])} />}
        {visible.equity && <RampLegend title="Canopy equity" ramp={EQUITY_RAMP} left="Deficit" right="Good access" />}
        {(visible.heat || visible.vegetation || visible.equity) && <Divider sx={{ my: 0.5 }} />}
        <Swatch color={rgb(PRIORITY_COLOR)} label="Priority planting zone" />
        <Swatch color={rgb(HOTSPOT_COLOR)} label="Heat hotspot (k-means)" />
        <Swatch color="rgb(0,90,50)" label="Tree canopy" />
        <Swatch color="rgba(46,125,50,0.55)" label="Park (OSM)" />
        <Swatch color="#43a047" label="Tree (OSM)" round />
      </Box>
    </Box>
  );
}
