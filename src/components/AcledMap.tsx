'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import MapGL, { Source, Layer, Popup, NavigationControl, FullscreenControl, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { LocalityTotals, NamedTotals } from '@/utils/acled';
import { unBlue, unChoroplethRamp } from '@/theme/unColors';

export type AcledMetric = 'events' | 'fatalities';

interface AcledMapProps {
  admin1: any;
  admin2: any;
  stateTotals: Map<string, NamedTotals>;
  localityTotals: LocalityTotals[];
  periodLabel: string;
  metric: AcledMetric;
  selectedState: string | null;
  selectedLocality: string | null;
  onStateSelect: (state: string | null) => void;
  onLocalitySelect: (locality: string | null) => void;
}

// MapLibre's demotiles basemap (https://demotiles.maplibre.org/style.json),
// served locally with only its sea, land fills and country labels: its own
// border/coastline/graticule lines don't align with the COD boundaries and
// read as doubled borders, and the demo server rate-limits style requests —
// a local style keeps the admin layers rendering even when tiles are throttled.
const BASEMAP = '/data/basemap_style.json';
const CIRCLE_COLOR = '#D32F2F';
const MAX_RADIUS = 26;
const [RAMP_NONE, RAMP_LOW, RAMP_MEDIUM, RAMP_HIGH] = unChoroplethRamp;

const metricLabel = (metric: AcledMetric) => (metric === 'events' ? 'Events' : 'Fatalities');

function computeBounds(features: any[]): [[number, number], [number, number]] {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  const visit = (coords: any): void => {
    if (typeof coords[0] === 'number') {
      west = Math.min(west, coords[0]);
      east = Math.max(east, coords[0]);
      south = Math.min(south, coords[1]);
      north = Math.max(north, coords[1]);
    } else {
      coords.forEach(visit);
    }
  };
  features.forEach((f) => visit(f.geometry.coordinates));
  return [[west, south], [east, north]];
}

const fillColor: ExpressionSpecification = [
  'case',
  ['<=', ['get', 'ratio'], 0], RAMP_NONE,
  ['interpolate', ['linear'], ['get', 'ratio'], 0, RAMP_LOW, 0.5, RAMP_MEDIUM, 1, RAMP_HIGH],
];

const floatingPanelSx = {
  bgcolor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  borderRadius: 1.5,
  boxShadow: 2,
};

interface PopupInfo {
  lng: number;
  lat: number;
  name: string;
  state: string;
  events: number;
  fatalities: number;
}

export default function AcledMap({
  admin1,
  admin2,
  stateTotals,
  localityTotals,
  periodLabel,
  metric,
  selectedState,
  selectedLocality,
  onStateSelect,
  onLocalitySelect,
}: AcledMapProps) {
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);

  // Fly to the selected locality, else the selected state, else all of Sudan.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const target =
      (selectedLocality &&
        admin2.features.filter((f: any) => f.properties.adm2_name === selectedLocality && f.properties.adm1_name === selectedState)) ||
      (selectedState && admin1.features.filter((f: any) => f.properties.adm1_name === selectedState)) ||
      admin1.features;
    if (target.length) mapRef.current.fitBounds(computeBounds(target), { padding: 40, duration: 800 });
  }, [mapLoaded, admin1, admin2, selectedState, selectedLocality]);

  useEffect(() => setPopup(null), [selectedState, selectedLocality, periodLabel, metric]);

  const stateMax = useMemo(() => Math.max(0, ...Array.from(stateTotals.values()).map((s) => s[metric])), [stateTotals, metric]);
  const localityByPcode = useMemo(() => new Map(localityTotals.map((l) => [l.locality.pcode, l])), [localityTotals]);
  const localityMax = useMemo(() => Math.max(0, ...localityTotals.map((l) => l[metric])), [localityTotals, metric]);

  const statesGeoJson = useMemo(
    () => ({
      ...admin1,
      features: admin1.features.map((f: any) => {
        const value = stateTotals.get(f.properties.adm1_name)?.[metric] ?? 0;
        return {
          ...f,
          properties: {
            adm1_name: f.properties.adm1_name,
            value,
            ratio: stateMax > 0 ? value / stateMax : 0,
            isSelected: f.properties.adm1_name === selectedState,
          },
        };
      }),
    }),
    [admin1, stateTotals, metric, stateMax, selectedState]
  );

  // Locality choropleth only inside the selected state — nationwide, 189
  // localities are too dense to read as fills; the circles cover that view.
  const localitiesGeoJson = useMemo(() => {
    if (!selectedState) return { type: 'FeatureCollection', features: [] };
    return {
      ...admin2,
      features: admin2.features
        .filter((f: any) => f.properties.adm1_name === selectedState)
        .map((f: any) => {
          const value = localityByPcode.get(f.properties.adm2_pcode)?.[metric] ?? 0;
          return {
            ...f,
            properties: {
              adm2_name: f.properties.adm2_name,
              value,
              ratio: localityMax > 0 ? value / localityMax : 0,
              isSelected: f.properties.adm2_name === selectedLocality,
            },
          };
        }),
    };
  }, [admin2, selectedState, selectedLocality, localityByPcode, metric, localityMax]);

  const circlesGeoJson = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: localityTotals
        .filter((l) => l[metric] > 0)
        .sort((a, b) => b[metric] - a[metric]) // small circles drawn on top of big ones
        .map((l) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [l.locality.lon, l.locality.lat] },
          properties: {
            name: l.locality.name,
            state: l.locality.state,
            events: l.events,
            fatalities: l.fatalities,
            // Area, not radius, proportional to the value.
            radius: Math.max(3, Math.sqrt(l[metric] / localityMax) * MAX_RADIUS),
          },
        })),
    }),
    [localityTotals, metric, localityMax]
  );

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const p = feature.properties as any;
    if (feature.layer.id === 'locality-circles') {
      const [lng, lat] = (feature.geometry as any).coordinates;
      setPopup({ lng, lat, name: p.name, state: p.state, events: p.events, fatalities: p.fatalities });
    } else if (feature.layer.id === 'localities-fill') {
      onLocalitySelect(p.adm2_name === selectedLocality ? null : p.adm2_name);
    } else if (feature.layer.id === 'states-fill' && p.adm1_name !== selectedState) {
      onStateSelect(p.adm1_name);
    }
  };

  const setCursor = (event: MapLayerMouseEvent) => {
    mapRef.current.getCanvas().style.cursor = event.features?.length ? 'pointer' : '';
  };

  const legendMax = selectedState ? localityMax : stateMax;
  const legendBuckets = [
    { color: RAMP_NONE, range: '0' },
    { color: RAMP_LOW, range: '1' },
    { color: RAMP_MEDIUM, range: Math.round(legendMax / 2).toLocaleString() },
    { color: RAMP_HIGH, range: legendMax.toLocaleString() },
  ];

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <MapGL
        ref={mapRef}
        initialViewState={{ longitude: 30, latitude: 15, zoom: 5 }}
        minZoom={3}
        maxZoom={10}
        mapStyle={BASEMAP}
        interactiveLayerIds={['locality-circles', 'localities-fill', 'states-fill']}
        onClick={handleClick}
        onMouseMove={setCursor}
        onLoad={() => setMapLoaded(true)}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <FullscreenControl position="top-right" />

        {/* Fills first, then admin 2 lines, then admin 1 lines on top, so every
            border is drawn once, from the COD boundary files only. */}
        <Source id="states" type="geojson" data={statesGeoJson}>
          <Layer
            id="states-fill"
            type="fill"
            paint={{
              'fill-color': fillColor,
              'fill-opacity': selectedState ? ['case', ['get', 'isSelected'], 0, 0.15] : 0.8,
              'fill-opacity-transition': { duration: 400 },
            }}
          />
        </Source>

        <Source id="localities" type="geojson" data={localitiesGeoJson as any}>
          <Layer id="localities-fill" type="fill" paint={{ 'fill-color': fillColor, 'fill-opacity': 0.85 }} />
        </Source>

        <Source id="admin2" type="geojson" data={admin2}>
          <Layer
            id="admin2-outline"
            type="line"
            paint={{ 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 8, 1] }}
          />
        </Source>

        {/* Separate sources (same data) so these lines stack above the fills:
            react-map-gl adds source-less <Layer>s before the <Source> children. */}
        <Source id="states-lines" type="geojson" data={statesGeoJson}>
          <Layer
            id="states-outline"
            type="line"
            layout={{ 'line-sort-key': ['case', ['get', 'isSelected'], 1, 0] }}
            paint={{
              'line-color': ['case', ['get', 'isSelected'], unBlue.dark, '#ffffff'],
              'line-width': ['case', ['get', 'isSelected'], 2.5, 1.5],
            }}
          />
        </Source>
        <Source id="localities-lines" type="geojson" data={localitiesGeoJson as any}>
          <Layer
            id="localities-selected"
            type="line"
            filter={['==', ['get', 'isSelected'], true]}
            paint={{ 'line-color': unBlue.dark, 'line-width': 3 }}
          />
        </Source>

        <Source id="locality-points" type="geojson" data={circlesGeoJson as any}>
          <Layer
            id="locality-circles"
            type="circle"
            paint={{
              'circle-color': CIRCLE_COLOR,
              'circle-opacity': 0.55,
              'circle-radius': ['get', 'radius'],
              'circle-stroke-width': 1,
              'circle-stroke-color': '#ffffff',
            }}
          />
        </Source>

        {popup && (
          <Popup longitude={popup.lng} latitude={popup.lat} onClose={() => setPopup(null)} offset={10} maxWidth="260px">
            <Box sx={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.75rem', lineHeight: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {popup.name}
              </Typography>
              <Box sx={{ color: 'text.secondary', mb: 0.5 }}>
                {popup.state} · {periodLabel}
              </Box>
              <div><strong>Events:</strong> {popup.events.toLocaleString()}</div>
              <div><strong>Fatalities:</strong> {popup.fatalities.toLocaleString()}</div>
            </Box>
          </Popup>
        )}
      </MapGL>

      <Box sx={{ position: 'absolute', bottom: 20, left: 20, zIndex: 500, p: 1.5, ...floatingPanelSx }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
          {metricLabel(metric)} by {selectedState ? 'Locality' : 'State'}
        </Typography>
        <Box sx={{ display: 'flex' }}>
          {legendBuckets.map((bucket, i) => (
            <Box key={i} sx={{ width: 56, textAlign: 'center' }}>
              <Box
                sx={{
                  height: 12,
                  bgcolor: bucket.color,
                  borderTopLeftRadius: i === 0 ? 4 : 0,
                  borderBottomLeftRadius: i === 0 ? 4 : 0,
                  borderTopRightRadius: i === legendBuckets.length - 1 ? 4 : 0,
                  borderBottomRightRadius: i === legendBuckets.length - 1 ? 4 : 0,
                }}
              />
              <Typography variant="caption" sx={{ fontSize: '0.62rem', display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                {bucket.range}
              </Typography>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: `${CIRCLE_COLOR}8c`, border: '1px solid white' }} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
            Circle size = {metricLabel(metric).toLowerCase()} per locality
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
