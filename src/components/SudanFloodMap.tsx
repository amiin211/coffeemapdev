'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Divider, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MapGL, { Source, Layer, Popup, NavigationControl, ScaleControl, MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  CHOLERA_CLASSES,
  CHOLERA_COLOR,
  FLOOD_CLASSES,
  FloodData,
  NO_DATA_COLOR,
  fmt,
} from '@/utils/sudanFlood';
import { collectionBounds, geometryBounds } from '@/utils/geo';
import { MAPLIBRE_WORKER_URL } from '@/lib/maplibre';

export type MapMode = 'floods' | 'cholera' | 'both';

interface SudanFloodMapProps {
  data: FloodData;
  mode: MapMode;
  selected: string | null; // state pcode
  onSelect: (pcode: string | null) => void;
}

// OpenStreetMap standard tiles, desaturated so the choropleth stands out.
// Glyphs for the locality labels are served with the site (Open Sans
// Semibold, Latin range; the map only renders client-side, so the origin is known).
const BASEMAP: StyleSpecification = {
  version: 8,
  glyphs: `${typeof window !== 'undefined' ? window.location.origin : ''}/fonts/{fontstack}/{range}.pbf`,
  sources: {
    basemap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      maxzoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Boundaries: OCHA COD-AB',
    },
  },
  layers: [{ id: 'basemap', type: 'raster', source: 'basemap', paint: { 'raster-saturation': -0.85, 'raster-opacity': 0.9 } }],
};

const STATE_FILL = 'states-fill';
const LOCALITY_FILL = 'localities-fill';

// Step expression over a numeric property with a no-data fallback.
function classColor(property: string, classes: { min: number; color: string }[]): ExpressionSpecification {
  const value: ExpressionSpecification = ['coalesce', ['get', property], 0];
  return ['case', ['<=', value, 0], NO_DATA_COLOR, ['step', value, classes[0].color, ...classes.slice(1).flatMap((c) => [c.min, c.color])]] as ExpressionSpecification;
}

interface Hover {
  lng: number;
  lat: number;
  pcode: string;
  title: string;
  subtitle?: string;
  rows: [string, string][];
}

function Swatch({ color, label, round }: { color: string; label: string; round?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 12, height: 12, borderRadius: round ? '50%' : 0.5, bgcolor: color, flexShrink: 0, border: round ? `2px solid ${CHOLERA_COLOR}` : 'none' }} />
      <Typography variant="caption" sx={{ lineHeight: 1.45 }}>{label}</Typography>
    </Box>
  );
}

export default function SudanFloodMap({ data, mode, selected, onSelect }: SudanFloodMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [hover, setHover] = useState<Hover | null>(null);
  const [loaded, setLoaded] = useState(false);

  const cholera = useMemo(() => new Map(data.cholera.states.map((c) => [c.pcode, c])), [data]);
  const stateInfo = useMemo(() => new Map(data.states.map((s) => [s.pcode, s])), [data]);
  const localityInfo = useMemo(() => new Map(data.localities.map((l) => [l.adm2_pcode, l])), [data]);

  // States enriched with flood and cholera figures (null-safe for expressions).
  const states = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: data.admin1.features.map((f) => {
      const pcode = f.properties?.adm1_pcode as string;
      const s = stateInfo.get(pcode);
      return {
        ...f,
        properties: {
          pcode,
          name: f.properties?.adm1_name,
          name_ar: f.properties?.adm1_name1,
          affected: s?.affected ?? 0,
          has_data: !!s?.has_data,
          cholera: cholera.get(pcode)?.cases ?? 0,
        },
      };
    }),
  }), [data, stateInfo, cholera]);

  // Localities of the selected state; the ones named in the flash update are flagged.
  const localities = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: selected
      ? data.admin2.features
        .filter((f) => f.properties?.adm1_pcode === selected)
        .map((f) => {
          const l = localityInfo.get(f.properties?.adm2_pcode);
          return {
            ...f,
            properties: {
              pcode: f.properties?.adm2_pcode,
              name: f.properties?.adm2_name,
              name_ar: f.properties?.adm2_name1,
              flood_affected: !!l,
              affected: l?.affected ?? 0,
              center_lat: f.properties?.center_lat,
              center_lon: f.properties?.center_lon,
            },
          };
        })
      : [],
  }), [data, selected, localityInfo]);

  const localityLabels = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: localities.features.map((f) => ({
      type: 'Feature',
      properties: { name: f.properties?.name, flood_affected: f.properties?.flood_affected },
      geometry: { type: 'Point', coordinates: [f.properties?.center_lon, f.properties?.center_lat] },
    })),
  }), [localities]);

  const choleraPoints = useMemo<GeoJSON.FeatureCollection>(() => ({
    type: 'FeatureCollection',
    features: data.cholera.states.map((c) => ({
      type: 'Feature',
      properties: { name: c.name, cases: c.cases },
      geometry: { type: 'Point', coordinates: [c.lon, c.lat] },
    })),
  }), [data]);

  const sudanBounds = useMemo(() => collectionBounds(data.admin1), [data]);

  // Zoom to the selected state, or back to the whole country.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const feature = selected ? data.admin1.features.find((f) => f.properties?.adm1_pcode === selected) : null;
    map.fitBounds(feature ? geometryBounds(feature.geometry) : sudanBounds, { padding: feature ? 60 : 24, duration: feature ? 900 : 600 });
  }, [selected, loaded, data, sudanBounds]);

  const fillColor = mode === 'cholera' ? classColor('cholera', CHOLERA_CLASSES) : classColor('affected', FLOOD_CLASSES);
  const hasValue: ExpressionSpecification = mode === 'cholera' ? ['>', ['get', 'cholera'], 0] : ['get', 'has_data'];
  // Unselected states fade when a state is selected.
  const fillOpacity: ExpressionSpecification = selected
    ? ['case', ['==', ['get', 'pcode'], selected], 0.15, 0.25]
    : ['case', ['==', ['get', 'pcode'], hover?.pcode ?? ''], 0.92, hasValue, 0.78, 0.45];

  const onMove = (e: MapLayerMouseEvent) => {
    const f = e.features?.[0];
    if (!f) return setHover(null);
    const p = f.properties ?? {};
    if (f.layer.id === LOCALITY_FILL) {
      const l = localityInfo.get(p.pcode);
      setHover({
        lng: e.lngLat.lng, lat: e.lngLat.lat, pcode: p.pcode, title: p.name, subtitle: p.name_ar,
        rows: l ? [['Flood-affected', 'Yes'], ['People affected', fmt(l.affected)]] : [['Flood-affected', 'Not reported']],
      });
      return;
    }
    const s = stateInfo.get(p.pcode);
    const c = cholera.get(p.pcode);
    setHover({
      lng: e.lngLat.lng, lat: e.lngLat.lat, pcode: p.pcode, title: p.name, subtitle: p.name_ar,
      rows: [
        ['People affected', s?.has_data ? fmt(s.affected) : 'No data'],
        ['Deaths', fmt(s?.deaths)],
        ['Homes destroyed', fmt(s?.homes_destroyed)],
        ['Cholera cases', c ? fmt(c.cases) : '–'],
      ],
    });
  };

  const onClick = (e: MapLayerMouseEvent) => {
    const f = e.features?.find((x) => x.layer.id === STATE_FILL);
    if (f && f.properties?.pcode !== selected) onSelect(f.properties?.pcode);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
      <MapGL
        ref={mapRef}
        workerUrl={MAPLIBRE_WORKER_URL}
        initialViewState={{ bounds: sudanBounds, fitBoundsOptions: { padding: 24 } }}
        mapStyle={BASEMAP}
        style={{ width: '100%', height: '100%' }}
        interactiveLayerIds={selected ? [LOCALITY_FILL, STATE_FILL] : [STATE_FILL]}
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
        onLoad={() => setLoaded(true)}
        cursor={hover ? 'pointer' : 'grab'}
        minZoom={3.5}
        maxZoom={10}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <ScaleControl position="bottom-right" />

        <Source id="states" type="geojson" data={states}>
          <Layer id={STATE_FILL} type="fill" paint={{ 'fill-color': fillColor, 'fill-opacity': fillOpacity }} />
          <Layer id="states-line" type="line" paint={{ 'line-color': '#ffffff', 'line-width': 1.2 }} />
          <Layer
            id="states-selected"
            type="line"
            filter={['==', ['get', 'pcode'], selected ?? '']}
            paint={{ 'line-color': '#1a1a1a', 'line-width': 2.5 }}
          />
        </Source>

        <Source id="localities" type="geojson" data={localities}>
          <Layer
            id={LOCALITY_FILL}
            type="fill"
            paint={{
              'fill-color': ['case', ['get', 'flood_affected'], '#2171b5', '#ffffff'],
              'fill-opacity': ['case', ['get', 'flood_affected'], 0.7, 0.25],
            }}
          />
          <Layer id="localities-line" type="line" paint={{ 'line-color': '#37474f', 'line-width': 0.8, 'line-opacity': 0.8 }} />
        </Source>
        <Source id="locality-labels" type="geojson" data={localityLabels}>
          <Layer
            id="locality-labels"
            type="symbol"
            layout={{ 'text-field': ['get', 'name'], 'text-font': ['Open Sans Semibold'], 'text-size': 11, 'text-allow-overlap': false }}
            paint={{ 'text-color': ['case', ['get', 'flood_affected'], '#0b2545', '#555'], 'text-halo-color': '#fff', 'text-halo-width': 1.4 }}
          />
        </Source>

        {mode !== 'floods' && (
          <Source id="cholera" type="geojson" data={choleraPoints}>
            <Layer
              id="cholera-circles"
              type="circle"
              paint={{
                // Area proportional to cases.
                'circle-radius': ['interpolate', ['linear'], ['sqrt', ['get', 'cases']], 0, 4, 42, 30],
                'circle-color': CHOLERA_COLOR,
                'circle-opacity': mode === 'both' ? 0.3 : 0.15,
                'circle-stroke-color': CHOLERA_COLOR,
                'circle-stroke-width': 2,
              }}
            />
          </Source>
        )}

        {hover && (
          <Popup longitude={hover.lng} latitude={hover.lat} closeButton={false} closeOnClick={false} offset={12} maxWidth="240px">
            <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>{hover.title}</Typography>
            {hover.subtitle && <Typography variant="caption" dir="rtl" color="text.secondary" sx={{ display: 'block' }}>{hover.subtitle}</Typography>}
            <Box component="table" sx={{ mt: 0.5, borderCollapse: 'collapse', '& td': { py: 0.15, fontSize: '0.74rem' } }}>
              <tbody>
                {hover.rows.map(([k, v]) => (
                  <tr key={k}>
                    <td style={{ paddingRight: 10, color: '#666' }}>{k}</td>
                    <td style={{ fontWeight: 600 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </Box>
          </Popup>
        )}
      </MapGL>

      {selected && (
        <Button
          size="small"
          variant="contained"
          startIcon={<ArrowBackIcon />}
          onClick={() => onSelect(null)}
          sx={{ position: 'absolute', top: 12, left: 12, textTransform: 'none', bgcolor: 'white', color: 'text.primary', '&:hover': { bgcolor: '#f5f5f5' } }}
        >
          All of Sudan
        </Button>
      )}
      {!selected && (
        <Box sx={{ position: 'absolute', top: 12, left: 12, px: 1.25, py: 0.5, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.92)', boxShadow: 1 }}>
          <Typography variant="caption" sx={{ fontWeight: 500 }}>Hover a state for figures · click to see its localities</Typography>
        </Box>
      )}

      <Box sx={{ position: 'absolute', left: 12, bottom: 12, p: 1.5, width: 190, bgcolor: 'rgba(255,255,255,0.93)', backdropFilter: 'blur(8px)', borderRadius: 1.5, boxShadow: 2 }}>
        {mode !== 'cholera' ? (
          <>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>People affected by floods</Typography>
            {[...FLOOD_CLASSES].reverse().map((c) => <Swatch key={c.label} color={c.color} label={c.label} />)}
          </>
        ) : (
          <>
            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>Cholera cases</Typography>
            {[...CHOLERA_CLASSES].reverse().map((c) => <Swatch key={c.label} color={c.color} label={c.label} />)}
          </>
        )}
        <Swatch color={NO_DATA_COLOR} label="No data reported" />
        {mode === 'both' && (
          <>
            <Divider sx={{ my: 0.75 }} />
            <Swatch color="rgba(106,27,154,0.3)" label="Cholera cases (circle area)" round />
          </>
        )}
        {selected && (
          <>
            <Divider sx={{ my: 0.75 }} />
            <Swatch color="rgba(33,113,181,0.7)" label="Flood-affected locality" />
          </>
        )}
      </Box>
    </Box>
  );
}
