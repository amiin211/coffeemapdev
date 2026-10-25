'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import MapGL, { Source, Layer, Popup, NavigationControl, FullscreenControl, MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type { ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { AreaRef, LocalityTotals, NamedTotals } from '@/utils/acled';
import { Admin1Collection, Admin2Collection, featuresBounds } from '@/utils/geo';
import { MAPLIBRE_WORKER_URL } from '@/lib/maplibre';
import { unBlue, unChoroplethRamp } from '@/theme/unColors';
import { useI18n } from '@/i18n';
import { useSudanNames } from '@/utils/sudanNamesAr';

export type AcledMetric = 'events' | 'fatalities';
export type AcledMapMode = '2d' | '3d';

/** Fixed colour/height scale maxima (month-by-month views share one scale). */
export interface ScaleMax {
  state: number;
  locality: number;
  national: number;
}

interface AcledMapProps {
  admin1: Admin1Collection;
  admin2: Admin2Collection;
  stateTotals: Map<string, NamedTotals>;
  localityTotals: LocalityTotals[]; // within the selected state, if any
  nationalLocalityTotals: LocalityTotals[]; // every locality (3D view)
  scaleMax?: ScaleMax | null; // else each period is scaled to its own maximum
  periodLabel: string;
  metric: AcledMetric;
  mode: AcledMapMode;
  selectedState: string | null;
  selectedLocality: string | null;
  highlight: AreaRef | null; // hovered in a chart (or on the map)
  transitionMs: number;
  onStateSelect: (state: string | null) => void;
  onLocalitySelect: (locality: string | null, state: string) => void;
  onHover: (area: AreaRef | null) => void;
}

// MapLibre's demotiles basemap (https://demotiles.maplibre.org/style.json),
// served locally with only its sea, land fills and country labels: its own
// border/coastline/graticule lines don't align with the COD boundaries and
// read as doubled borders, and the demo server rate-limits style requests —
// a local style keeps the admin layers rendering even when tiles are throttled.
const BASEMAP = '/data/basemap_style.json';
const CIRCLE_COLOR = '#D32F2F';
const HIGHLIGHT_COLOR = '#F2A900';
const MUTED_COLOR = '#D5DBE3';
const MAX_RADIUS = 26;
const MAX_HEIGHT = 260_000; // metres at zoom 5, for the busiest locality
const PITCH_3D = 50;
const BEARING_3D = -12;
const [RAMP_NONE, RAMP_LOW, RAMP_MEDIUM, RAMP_HIGH] = unChoroplethRamp;

const metricLabel = (metric: AcledMetric, ar = false) => (metric === 'events' ? (ar ? 'الأحداث' : 'Events') : ar ? 'الوفيات' : 'Fatalities');

// Values change by tweening feature-state (set per animation frame below), so
// the boundary sources are added once and never re-tiled while playing.
const fs = (key: string): ExpressionSpecification => ['coalesce', ['feature-state', key], 0];
const rampColor = (ratio: ExpressionSpecification): ExpressionSpecification => [
  'interpolate', ['linear'], ratio, 0, RAMP_NONE, 0.001, RAMP_LOW, 0.5, RAMP_MEDIUM, 1, RAMP_HIGH,
];

const floatingPanelSx = {
  bgcolor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  borderRadius: 1.5,
  boxShadow: 2,
};

interface PopupInfo {
  view: string; // the selection/period/metric it was opened under
  lng: number;
  lat: number;
  pcode: string;
  name: string;
  state: string;
}

// Animated values: `r` = ratio for the choropleth (by state / within the
// selected state), `n` = ratio nationwide (3D heights), `v` = circle shown.
type Values = Map<string, number>;
interface Frame {
  state: Values; // by adm1_name
  locality: Values; // by pcode
  national: Values;
  visible: Values;
}

const ease = (p: number) => 1 - Math.pow(1 - p, 3);
const lerpMaps = (a: Values, b: Values, p: number) => {
  const out: Values = new Map();
  new Set([...a.keys(), ...b.keys()]).forEach((k) => out.set(k, (a.get(k) ?? 0) * (1 - p) + (b.get(k) ?? 0) * p));
  return out;
};

const sameArea = (a: AreaRef | null, b: AreaRef | null) => a?.state === b?.state && a?.pcode === b?.pcode;

export default function AcledMap({
  admin1,
  admin2,
  stateTotals,
  localityTotals,
  nationalLocalityTotals,
  scaleMax,
  periodLabel,
  metric,
  mode,
  selectedState,
  selectedLocality,
  highlight,
  transitionMs,
  onStateSelect,
  onLocalitySelect,
  onHover,
}: AcledMapProps) {
  const [popup, setPopup] = useState<PopupInfo | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<MapRef>(null);
  const shown = useRef<Frame>({ state: new Map(), locality: new Map(), national: new Map(), visible: new Map() });
  const lastHover = useRef<AreaRef | null>(null);
  const is3d = mode === '3d';

  // Fly to the selected locality, else the selected state, else all of Sudan;
  // the 3D view tilts the camera.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const target: GeoJSON.Feature[] =
      (selectedLocality &&
        admin2.features.filter((f) => f.properties.adm2_name === selectedLocality && f.properties.adm1_name === selectedState)) ||
      (selectedState && admin1.features.filter((f) => f.properties.adm1_name === selectedState)) ||
      admin1.features;
    if (target.length)
      mapRef.current.fitBounds(featuresBounds(target), {
        padding: is3d ? { top: 90, bottom: 40, left: 40, right: 40 } : 40,
        duration: 900,
        pitch: is3d ? PITCH_3D : 0,
        bearing: is3d ? BEARING_3D : 0,
      });
  }, [mapLoaded, admin1, admin2, selectedState, selectedLocality, is3d]);

  // A popup belongs to the view it was opened in; changing the selection,
  // period or metric hides it.
  const view = [selectedState, selectedLocality, periodLabel, metric, mode].join('|');
  const { isAr, tr } = useI18n();
  const names = useSudanNames(isAr);
  // Arabic mirrors the map chrome: controls on the left, legend on the right.
  const side = isAr ? 'left' : 'right';
  const visiblePopup = popup?.view === view ? popup : null;

  const maxOf = (values: number[]) => Math.max(0, ...values);
  const stateMax = scaleMax?.state ?? maxOf(Array.from(stateTotals.values(), (s) => s[metric]));
  const localityMax = scaleMax?.locality ?? maxOf(localityTotals.map((l) => l[metric]));
  const nationalMax = scaleMax?.national ?? maxOf(nationalLocalityTotals.map((l) => l[metric]));
  const localityByPcode = useMemo(() => new Map(localityTotals.map((l) => [l.locality.pcode, l])), [localityTotals]);

  const target = useMemo<Frame>(() => {
    const ratio = (v: number, max: number) => (max > 0 ? Math.min(1, v / max) : 0);
    return {
      state: new Map(Array.from(stateTotals.values(), (s) => [s.name, ratio(s[metric], stateMax)])),
      locality: new Map(localityTotals.map((l) => [l.locality.pcode, ratio(l[metric], localityMax)])),
      national: new Map(nationalLocalityTotals.map((l) => [l.locality.pcode, ratio(l[metric], nationalMax)])),
      visible: new Map(localityTotals.map((l) => [l.locality.pcode, l[metric] > 0 ? 1 : 0])),
    };
  }, [stateTotals, localityTotals, nationalLocalityTotals, metric, stateMax, localityMax, nationalMax]);

  // Tween from what is on screen now to the new values: areas fade between
  // periods, circles grow/shrink in and out.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!mapLoaded || !map) return;
    const from = shown.current;
    const start = performance.now();
    let frame = 0;
    const paint = (f: Frame) => {
      f.state.forEach((r, id) => map.setFeatureState({ source: 'states', id }, { r }));
      f.locality.forEach((r, id) => {
        const n = f.national.get(id) ?? 0;
        const v = f.visible.get(id) ?? 0;
        map.setFeatureState({ source: 'localities', id }, { r, n });
        map.setFeatureState({ source: 'locality-points', id }, { r, v });
      });
    };
    const step = (now: number) => {
      const p = transitionMs > 0 ? Math.min(1, (now - start) / transitionMs) : 1;
      const k = ease(p);
      const next: Frame = {
        state: lerpMaps(from.state, target.state, k),
        locality: lerpMaps(from.locality, target.locality, k),
        national: lerpMaps(from.national, target.national, k),
        visible: lerpMaps(from.visible, target.visible, k),
      };
      shown.current = next;
      paint(next);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [mapLoaded, target, transitionMs]);

  // Every locality as a point (fixed set; sizes come from feature-state).
  const pointsGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Point>>(
    () => ({
      type: 'FeatureCollection',
      features: nationalLocalityTotals.map((l) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [l.locality.lon, l.locality.lat] },
        properties: { pcode: l.locality.pcode, name: l.locality.name, state: l.locality.state },
      })),
    }),
    // Built once: the locality list never changes, only the values.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const hl = highlight;
  const isSelectedState: ExpressionSpecification = ['==', ['get', 'adm1_name'], selectedState ?? ''];
  const isHlState: ExpressionSpecification = ['all', ['==', ['get', 'adm1_name'], hl?.state ?? ''], hl?.pcode == null];
  const isHlLocality: ExpressionSpecification = ['==', ['get', 'adm2_pcode'], hl?.pcode ?? ''];

  const statesOpacity: ExpressionSpecification | number = selectedState
    ? ['case', isSelectedState, 0, 0.15]
    : hl
      ? ['case', ['==', ['get', 'adm1_name'], hl.state], 0.95, 0.45]
      : 0.8;

  // A hovered locality turns amber; a hovered (or selected) state keeps its
  // colours and mutes the others, so the heights stay readable.
  const focusState = hl && hl.pcode == null ? hl.state : selectedState;
  const extrusionColor: ExpressionSpecification = [
    'case',
    isHlLocality,
    HIGHLIGHT_COLOR,
    focusState ? ['case', ['==', ['get', 'adm1_name'], focusState], rampColor(fs('n')), MUTED_COLOR] : rampColor(fs('n')),
  ];
  // Halve the height per zoom level so the bars keep the same screen height
  // when the camera flies to a state. With a state selected only its
  // localities stand up; the rest lie flat as context and can't block the view.
  const height = (scale: number): ExpressionSpecification =>
    selectedState ? ['case', isSelectedState, ['*', fs('n'), scale], 0] : ['*', fs('n'), scale];
  const extrusionHeight: ExpressionSpecification = [
    'interpolate', ['exponential', 2], ['zoom'], 3, height(MAX_HEIGHT * 4), 10, height(MAX_HEIGHT / 32),
  ];

  const circleRadius: ExpressionSpecification = ['*', fs('v'), ['max', 3, ['*', ['sqrt', fs('r')], MAX_RADIUS]]];
  const isHlPoint: ExpressionSpecification = ['any', ['==', ['get', 'pcode'], hl?.pcode ?? ''], ['all', hl?.pcode == null, ['==', ['get', 'state'], hl?.state ?? '']]];

  const visibility = (on: boolean) => ({ visibility: on ? ('visible' as const) : ('none' as const) });

  const areaOf = (event: MapLayerMouseEvent): AreaRef | null => {
    const feature = event.features?.[0];
    if (!feature) return null;
    const p = feature.properties;
    if (feature.layer.id === 'locality-circles') return { state: p.state, pcode: p.pcode };
    if (feature.layer.id === 'localities-fill' || feature.layer.id === 'localities-3d') return { state: p.adm1_name, pcode: p.adm2_pcode };
    return { state: p.adm1_name, pcode: null };
  };

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const p = feature.properties;
    if (feature.layer.id === 'locality-circles') {
      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
      setPopup({ view, lng, lat, pcode: p.pcode, name: p.name, state: p.state });
    } else if (feature.layer.id === 'localities-fill' || feature.layer.id === 'localities-3d') {
      onLocalitySelect(p.adm2_name === selectedLocality ? null : p.adm2_name, p.adm1_name);
    } else if (feature.layer.id === 'states-fill' && p.adm1_name !== selectedState) {
      onStateSelect(p.adm1_name);
    }
  };

  const handleMove = (event: MapLayerMouseEvent) => {
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = event.features?.length ? 'pointer' : '';
    const area = areaOf(event);
    if (!sameArea(area, lastHover.current)) {
      lastHover.current = area;
      onHover(area);
    }
  };

  const handleLeave = () => {
    if (lastHover.current) {
      lastHover.current = null;
      onHover(null);
    }
  };

  const legendMax = is3d ? nationalMax : selectedState ? localityMax : stateMax;
  const legendBuckets = [
    { color: RAMP_NONE, range: '0' },
    { color: RAMP_LOW, range: '1' },
    { color: RAMP_MEDIUM, range: Math.round(legendMax / 2).toLocaleString() },
    { color: RAMP_HIGH, range: legendMax.toLocaleString() },
  ];
  const popupTotals = visiblePopup ? localityByPcode.get(visiblePopup.pcode) : undefined;

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <MapGL
        ref={mapRef}
        workerUrl={MAPLIBRE_WORKER_URL}
        initialViewState={{ longitude: 30, latitude: 15, zoom: 5 }}
        minZoom={3}
        maxZoom={10}
        maxPitch={70}
        mapStyle={BASEMAP}
        interactiveLayerIds={is3d ? ['localities-3d'] : ['locality-circles', 'localities-fill', 'states-fill']}
        onClick={handleClick}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        onLoad={() => setMapLoaded(true)}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl key={mode} position={`top-${side}`} showCompass={is3d} visualizePitch />
        <FullscreenControl position={`top-${side}`} />

        {/* Fills first, then admin 2 lines, then admin 1 lines on top, so every
            border is drawn once, from the COD boundary files only. */}
        <Source id="states" type="geojson" data={admin1} promoteId="adm1_name">
          <Layer
            id="states-fill"
            type="fill"
            layout={visibility(!is3d)}
            paint={{ 'fill-color': rampColor(fs('r')), 'fill-opacity': statesOpacity }}
          />
        </Source>

        <Source id="localities" type="geojson" data={admin2} promoteId="adm2_pcode">
          {/* Locality choropleth only inside the selected state — nationwide, 189
              localities are too dense to read as fills; the circles cover that view. */}
          <Layer
            id="localities-fill"
            type="fill"
            filter={isSelectedState}
            layout={visibility(!is3d && !!selectedState)}
            paint={{ 'fill-color': rampColor(fs('r')), 'fill-opacity': 0.85 }}
          />
          <Layer
            id="admin2-outline"
            type="line"
            layout={visibility(!is3d)}
            paint={{ 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.4, 8, 1] }}
          />
          <Layer
            id="localities-3d"
            type="fill-extrusion"
            layout={visibility(is3d)}
            paint={{
              'fill-extrusion-color': extrusionColor,
              'fill-extrusion-height': extrusionHeight,
              'fill-extrusion-opacity': 0.92,
              'fill-extrusion-vertical-gradient': true,
            }}
          />
        </Source>

        {/* Separate sources (same data) so these lines stack above the fills:
            react-map-gl adds source-less <Layer>s before the <Source> children. */}
        <Source id="states-lines" type="geojson" data={admin1}>
          <Layer
            id="states-outline"
            type="line"
            layout={{ 'line-sort-key': ['case', isSelectedState, 1, 0] }}
            paint={{
              'line-color': ['case', isSelectedState, unBlue.dark, '#ffffff'],
              'line-width': ['case', isSelectedState, 2.5, 1.5],
            }}
          />
          <Layer id="states-highlight" type="line" filter={isHlState} paint={{ 'line-color': HIGHLIGHT_COLOR, 'line-width': 3.5 }} />
        </Source>
        <Source id="localities-lines" type="geojson" data={admin2}>
          <Layer
            id="localities-selected"
            type="line"
            filter={['all', isSelectedState, ['==', ['get', 'adm2_name'], selectedLocality ?? '']]}
            paint={{ 'line-color': unBlue.dark, 'line-width': 3 }}
          />
          <Layer id="localities-highlight" type="line" filter={isHlLocality} layout={visibility(!is3d)} paint={{ 'line-color': HIGHLIGHT_COLOR, 'line-width': 3 }} />
        </Source>

        <Source id="locality-points" type="geojson" data={pointsGeoJson} promoteId="pcode">
          <Layer
            id="locality-circles"
            type="circle"
            layout={visibility(!is3d)}
            paint={{
              'circle-color': CIRCLE_COLOR,
              'circle-opacity': ['*', 0.55, fs('v')],
              'circle-radius': circleRadius,
              'circle-stroke-width': ['case', isHlPoint, 3, 1],
              'circle-stroke-color': ['case', isHlPoint, HIGHLIGHT_COLOR, '#ffffff'],
              'circle-stroke-opacity': fs('v'),
            }}
          />
        </Source>

        {visiblePopup && popupTotals && (
          <Popup longitude={visiblePopup.lng} latitude={visiblePopup.lat} onClose={() => setPopup(null)} offset={10} maxWidth="260px">
            <Box sx={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.75rem', lineHeight: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {names.locality(visiblePopup.name)}
              </Typography>
              <Box sx={{ color: 'text.secondary', mb: 0.5 }}>
                {names.state(visiblePopup.state)} · {periodLabel}
              </Box>
              <div><strong>{metricLabel('events', isAr)}:</strong> {popupTotals.events.toLocaleString()}</div>
              <div><strong>{metricLabel('fatalities', isAr)}:</strong> {popupTotals.fatalities.toLocaleString()}</div>
            </Box>
          </Popup>
        )}
      </MapGL>

      <Box sx={{ position: 'absolute', bottom: 20, left: 20, zIndex: 500, p: 1.5, ...floatingPanelSx }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
          {is3d
            ? tr(`${metricLabel(metric)} by locality (height & colour)`, `${metricLabel(metric, true)} حسب المحلية (الارتفاع واللون)`)
            : tr(`${metricLabel(metric)} by ${selectedState ? 'Locality' : 'State'}`, `${metricLabel(metric, true)} حسب ${selectedState ? 'المحلية' : 'الولاية'}`)}
        </Typography>
        <Box sx={{ display: 'flex' }} dir="ltr">
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
        {scaleMax && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem', mt: 0.5 }}>
            {tr('Same scale for every month of the range', 'مقياس واحد لكل أشهر الفترة')}
          </Typography>
        )}
        {!is3d && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 1 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: `${CIRCLE_COLOR}8c`, border: '1px solid white' }} />
            <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
              {tr(`Circle size = ${metricLabel(metric).toLowerCase()} per locality`, `حجم الدائرة = ${metricLabel(metric, true)} في كل محلية`)}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
