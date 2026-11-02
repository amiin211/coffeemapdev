'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import MapGL, { Source, Layer, Marker, Popup, MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { StateAggregate, LocalityAggregate } from '@/utils/threew';
import { ThreeWMetric, metricLabels, metricLabelsAr } from '@/utils/threewMetric';
import { unBlue, unChoroplethRamp } from '@/theme/unColors';
import { Admin1Collection, Admin2Collection, collectionBounds } from '@/utils/geo';
import { MAPLIBRE_WORKER_URL } from '@/lib/maplibre';
import { useI18n } from '@/i18n';
import { useSudanNames } from '@/utils/sudanNamesAr';
import { localityKey } from '@/utils/threewInsights';

interface ThreeWMapProps {
  stateAggregates: StateAggregate[];
  localityAggregates: LocalityAggregate[];
  selectedState: string | null;
  metric: ThreeWMetric;
  onStateSelect: (state: string | null) => void;
  /** ACLED conflict events per locality key over the 3W months, drawn as red 3D bars. */
  events?: Map<string, number> | null;
  eventPeriod?: string;
}

const EVENT_BAR_COLOR = '#C62828';
const BAR_HALF = 0.06; // half the bar side, degrees of latitude (~6.5 km)
const BAR_MAX_HEIGHT = 260_000; // metres at zoom 5, for the deadliest locality

// Centroid of a polygon's outer ring (or the largest part of a multipolygon).
function ringCentroid(geometry: GeoJSON.Geometry): [number, number] | null {
  const rings = geometry.type === 'Polygon' ? [geometry.coordinates[0]] : geometry.type === 'MultiPolygon' ? geometry.coordinates.map((p) => p[0]) : [];
  if (!rings.length) return null;
  const ring = rings.reduce((a, b) => (b.length > a.length ? b : a));
  let x = 0, y = 0;
  for (const [lon, lat] of ring) { x += lon; y += lat; }
  return [x / ring.length, y / ring.length];
}

const STATES_FILL_LAYER = 'states-fill';

const [RAMP_NONE, RAMP_LOW, RAMP_MEDIUM, RAMP_HIGH] = unChoroplethRamp;

// No Mapbox account/token in use — compose a minimal raster style against
// the same OpenStreetMap tile server the Leaflet-based FloodMap uses.
const osmStyle: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: 'raster',
      tiles: ['https://a.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png', 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: 'osm',
      type: 'raster',
      source: 'osm',
      paint: {
        // Plain gray basemap: desaturate the OSM tiles so the choropleth
        // colors are the only color on the map.
        'raster-saturation': -1,
        'raster-brightness-min': 0.35,
        'raster-brightness-max': 1,
      },
    },
  ],
};

function getRadius(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0;
  return Math.max(6, Math.min(28, (count / max) * 28));
}

// Properties of the enriched state features shown in the hover popup.
interface HoveredState {
  adm1_name: string;
  activities: number;
  orgs: number;
  clusters: number;
}

const floatingPanelSx = {
  bgcolor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  borderRadius: 1.5,
  boxShadow: 2,
};

export default function ThreeWMap({
  stateAggregates,
  localityAggregates,
  selectedState,
  metric,
  onStateSelect,
  events = null,
  eventPeriod = '',
}: ThreeWMapProps) {
  const [view3d, setView3d] = useState(false);
  const [hoveredLocality, setHoveredLocality] = useState<{ lng: number; lat: number; text: string } | null>(null);
  const [admin1, setAdmin1] = useState<Admin1Collection | null>(null);
  const [admin2, setAdmin2] = useState<Admin2Collection | null>(null);
  const [hovered, setHovered] = useState<{ lng: number; lat: number; properties: HoveredState } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<MapRef>(null);
  const { isAr, tr } = useI18n();
  const names = useSudanNames(isAr);

  useEffect(() => {
    fetch('/data/sdn_admin1.geojson')
      .then((res) => res.json())
      .then(setAdmin1);
    fetch('/data/sdn_admin2.geojson')
      .then((res) => res.json())
      .then(setAdmin2);
  }, []);

  // Fit to the real boundary data once it loads, rather than a hand-tuned
  // center/zoom, so the whole country fits regardless of the map's aspect ratio.
  useEffect(() => {
    if (mapLoaded && admin1 && mapRef.current) {
      mapRef.current.fitBounds(collectionBounds(admin1), { padding: 30, duration: 0 });
    }
  }, [mapLoaded, admin1]);

  // Tilt the camera for the 3D view, flatten it for 2D.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    mapRef.current.easeTo({ pitch: view3d ? 50 : 0, bearing: view3d ? -12 : 0, duration: 800 });
  }, [mapLoaded, view3d]);

  // One red column per locality at its centroid, height ∝ conflict events.
  const barsGeoJson = useMemo<GeoJSON.FeatureCollection<GeoJSON.Polygon> | null>(() => {
    if (!admin2 || !events) return null;
    const max = Math.max(1, ...events.values());
    const features: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
    for (const f of admin2.features) {
      const key = localityKey(f.properties.adm1_name, f.properties.adm2_name);
      const value = events.get(key) ?? 0;
      const c = ringCentroid(f.geometry as GeoJSON.Geometry);
      if (!value || !c) continue;
      const k = BAR_HALF / Math.cos((c[1] * Math.PI) / 180);
      features.push({
        type: 'Feature',
        geometry: { type: 'Polygon', coordinates: [[[c[0] - k, c[1] - BAR_HALF], [c[0] + k, c[1] - BAR_HALF], [c[0] + k, c[1] + BAR_HALF], [c[0] - k, c[1] + BAR_HALF], [c[0] - k, c[1] - BAR_HALF]]] },
        properties: { key, name: f.properties.adm2_name, state: f.properties.adm1_name, value, ratio: value / max },
      });
    }
    return { type: 'FeatureCollection', features };
  }, [admin2, events]);
  const maxEvents = events ? Math.max(0, ...events.values()) : 0;
  const barHeight = (scale: number): ExpressionSpecification => ['*', ['get', 'ratio'], scale];
  const barHeightExpression: ExpressionSpecification = [
    'interpolate', ['exponential', 2], ['zoom'], 3, barHeight(BAR_MAX_HEIGHT * 4), 10, barHeight(BAR_MAX_HEIGHT / 32),
  ];

  const byState = useMemo(() => new Map(stateAggregates.map((s) => [s.state, s])), [stateAggregates]);
  const maxValue = useMemo(() => Math.max(0, ...stateAggregates.map((s) => s[metric])), [stateAggregates, metric]);
  const maxLocalityCount = useMemo(() => Math.max(0, ...localityAggregates.map((l) => l.activities)), [localityAggregates]);

  const enrichedGeoJson = useMemo(() => {
    if (!admin1) return null;
    return {
      ...admin1,
      features: admin1.features.map((feature) => {
        const agg = byState.get(feature.properties.adm1_name);
        const value = agg?.[metric] ?? 0;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            value,
            ratio: maxValue > 0 ? value / maxValue : 0,
            isSelected: feature.properties.adm1_name === selectedState,
            activities: agg?.activities ?? 0,
            orgs: agg?.orgs ?? 0,
            clusters: agg?.clusters ?? 0,
          },
        };
      }),
    };
  }, [admin1, byState, metric, maxValue, selectedState]);

  // Locality (admin2) boundaries within the selected state only — the full
  // admin2 file covers all 188 localities nationwide, too dense to show
  // until the user has drilled into one state.
  const selectedAdmin2GeoJson = useMemo(() => {
    if (!admin2 || !selectedState) return null;
    return {
      ...admin2,
      features: admin2.features.filter((f) => f.properties.adm1_name === selectedState),
    };
  }, [admin2, selectedState]);

  const fillColorExpression: ExpressionSpecification = [
    'case',
    ['<=', ['get', 'ratio'], 0], RAMP_NONE,
    ['>=', ['get', 'ratio'], 0.66], RAMP_HIGH,
    ['>=', ['get', 'ratio'], 0.33], RAMP_MEDIUM,
    RAMP_LOW,
  ];

  // Once a state is selected, fade every other state's fill to near-transparent
  // so the selected state (and its admin2 localities) stand out on their own.
  const fillOpacityExpression: ExpressionSpecification = selectedState
    ? ['case', ['get', 'isSelected'], 0.75, 0.05]
    : ['case', ['>', ['get', 'value'], 0], 0.75, 0.3];

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature?.layer.id === 'event-bars') return;
    if (feature) onStateSelect(feature.properties?.adm1_name ?? null);
  };

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = feature ? 'pointer' : '';
    if (feature?.layer.id === 'event-bars') {
      const p = feature.properties;
      setHovered(null);
      setHoveredLocality({
        lng: event.lngLat.lng,
        lat: event.lngLat.lat,
        text: tr(`${names.locality(p.name)} · ${names.state(p.state)}\n${Number(p.value).toLocaleString()} conflict events (ACLED, ${eventPeriod})`, `${names.locality(p.name)} · ${names.state(p.state)}\n${Number(p.value).toLocaleString()} حدث نزاع (ACLED، ${eventPeriod})`),
      });
      return;
    }
    setHoveredLocality(null);
    if (feature) {
      setHovered({ lng: event.lngLat.lng, lat: event.lngLat.lat, properties: feature.properties as HoveredState });
    } else {
      setHovered(null);
    }
  };

  const visibleLocalities = selectedState
    ? localityAggregates.filter((l) => l.locality.state === selectedState)
    : [];

  const lowMax = Math.floor(maxValue * 0.33);
  const mediumMax = Math.floor(maxValue * 0.66);
  const legendBuckets = [
    { label: 'None', color: RAMP_NONE, range: '0' },
    { label: 'Low', color: RAMP_LOW, range: lowMax > 0 ? `1–${lowMax}` : '0' },
    { label: 'Medium', color: RAMP_MEDIUM, range: `${lowMax + 1}–${mediumMax}` },
    { label: 'High', color: RAMP_HIGH, range: `${mediumMax + 1}+` },
  ];

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <MapGL
        ref={mapRef}
        workerUrl={MAPLIBRE_WORKER_URL}
        canvasContextAttributes={{ preserveDrawingBuffer: true }} // lets the PDF report snapshot the map
        initialViewState={{ longitude: 28, latitude: 16, zoom: 5 }}
        minZoom={4}
        maxZoom={8}
        maxBounds={[15, 5, 45, 26]}
        mapStyle={osmStyle}
        maxPitch={70}
        interactiveLayerIds={
          enrichedGeoJson
            ? [...(view3d && barsGeoJson ? ['event-bars'] : []), STATES_FILL_LAYER]
            : []
        }
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          setHovered(null);
          setHoveredLocality(null);
        }}
        onLoad={() => setMapLoaded(true)}
        style={{ width: '100%', height: '100%' }}
      >
        {enrichedGeoJson && (
          <Source id="states" type="geojson" data={enrichedGeoJson}>
            <Layer
              id={STATES_FILL_LAYER}
              type="fill"
              paint={{
                'fill-color': fillColorExpression,
                'fill-opacity': fillOpacityExpression,
              }}
            />
            <Layer
              id="states-outline"
              type="line"
              paint={{
                'line-color': ['case', ['get', 'isSelected'], unBlue.dark, '#fff'],
                'line-width': ['case', ['get', 'isSelected'], 3, 2],
              }}
            />
          </Source>
        )}

        {selectedAdmin2GeoJson && (
          <Source id="admin2" type="geojson" data={selectedAdmin2GeoJson}>
            <Layer
              id="admin2-outline"
              type="line"
              paint={{
                'line-color': unBlue.dark,
                'line-width': 1,
                'line-dasharray': [2, 2],
                'line-opacity': 0.7,
              }}
            />
          </Source>
        )}

        {view3d && barsGeoJson && (
          <Source id="event-bars" type="geojson" data={barsGeoJson}>
            <Layer
              id="event-bars"
              type="fill-extrusion"
              paint={{
                'fill-extrusion-color': EVENT_BAR_COLOR,
                'fill-extrusion-height': barHeightExpression,
                'fill-extrusion-opacity': 0.92,
                'fill-extrusion-vertical-gradient': true,
              }}
            />
          </Source>
        )}
        {hoveredLocality && (
          <Popup longitude={hoveredLocality.lng} latitude={hoveredLocality.lat} closeButton={false} closeOnClick={false} offset={12} maxWidth="260px">
            <Box sx={{ fontSize: '0.75rem', lineHeight: 1.45, whiteSpace: 'pre-line' }}>{hoveredLocality.text}</Box>
          </Popup>
        )}

        {visibleLocalities.map((l, idx) => (
          <Marker key={`loc-${idx}`} longitude={l.locality.lon as number} latitude={l.locality.lat as number}>
            <div
              title={tr(`${l.locality.name}: ${l.activities} activities`, `${names.locality(l.locality.name)}: ${l.activities} نشاطًا`)}
              style={{
                width: getRadius(l.activities, maxLocalityCount) * 2,
                height: getRadius(l.activities, maxLocalityCount) * 2,
                borderRadius: '50%',
                background: '#00BCD499',
                border: '1px solid #00838F',
              }}
            />
          </Marker>
        ))}

        {hovered && (
          <Popup
            longitude={hovered.lng}
            latitude={hovered.lat}
            closeButton={false}
            closeOnClick={false}
            offset={12}
          >
            <strong>{names.state(hovered.properties.adm1_name)}</strong>
            <br />
            {tr(
              `${hovered.properties.activities} activities · ${hovered.properties.orgs} orgs · ${hovered.properties.clusters} clusters`,
              `${hovered.properties.activities} نشاطًا · ${hovered.properties.orgs} منظمة · ${hovered.properties.clusters} قطاعًا`,
            )}
          </Popup>
        )}
      </MapGL>

      {events && (
        <Box sx={{ position: 'absolute', top: { xs: 12, md: 78 }, left: 12, zIndex: 500, ...floatingPanelSx }}>
          <ToggleButtonGroup
            size="small"
            exclusive
            value={view3d ? '3d' : '2d'}
            onChange={(_, v) => v && setView3d(v === '3d')}
            aria-label={tr('Map view', 'عرض الخريطة')}
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.72rem', py: 0.4, px: 1, gap: 0.5 } }}
          >
            <ToggleButton value="2d">
              <MapOutlinedIcon sx={{ fontSize: 16 }} />
              {tr('2D', 'ثنائي الأبعاد')}
            </ToggleButton>
            <ToggleButton value="3d">
              <ViewInArIcon sx={{ fontSize: 16 }} />
              {tr('3D events', 'الأحداث ثلاثية الأبعاد')}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      <Box sx={{ position: 'absolute', bottom: 20, left: 20, zIndex: 500, p: 1.5, ...floatingPanelSx }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
          {tr(`${metricLabels[metric]} by State`, `${metricLabelsAr[metric]} حسب الولاية`)}
        </Typography>
        <Box sx={{ display: 'flex' }}>
          {legendBuckets.map((bucket, i) => (
            <Box key={bucket.label} sx={{ width: 56, textAlign: 'center' }}>
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
        {view3d && barsGeoJson && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 10, height: 18, borderRadius: '2px', bgcolor: EVENT_BAR_COLOR, flexShrink: 0 }} />
            <Typography variant="caption" sx={{ fontSize: '0.65rem', lineHeight: 1.35 }}>
              {tr(`Conflict events (ACLED), ${eventPeriod} · tallest = ${maxEvents.toLocaleString()}`, `أحداث النزاع (ACLED)، ${eventPeriod} · الأطول = ${maxEvents.toLocaleString()}`)}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
