'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
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
  /** Response Gap Explorer overlay: locality key (state|name) → fill colour, with its legend. */
  overlayFill?: Map<string, string> | null;
  overlayLegend?: { color: string; label: string }[] | null;
  overlayTitle?: string | null;
  overlayTooltip?: (key: string) => string | null;
  selectedLocality?: string | null; // locality key, outlined on the map
  onLocalityClick?: (key: string) => void;
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
  overlayFill = null,
  overlayLegend = null,
  overlayTitle = null,
  overlayTooltip,
  selectedLocality = null,
  onLocalityClick,
}: ThreeWMapProps) {
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

  // Localities flagged by the response-gap panel, drawn nationwide.
  const overlayGeoJson = useMemo(() => {
    if (!admin2 || !overlayFill || overlayFill.size === 0) return null;
    const features = admin2.features.flatMap((f) => {
      const color = overlayFill.get(localityKey(f.properties.adm1_name, f.properties.adm2_name));
      const key = localityKey(f.properties.adm1_name, f.properties.adm2_name);
      return color ? [{ ...f, properties: { ...f.properties, color, key } }] : [];
    });
    return { ...admin2, features };
  }, [admin2, overlayFill]);
  const overlayOn = !!overlayGeoJson && overlayGeoJson.features.length > 0;
  const selectedGeoJson = useMemo(() => {
    if (!admin2 || !selectedLocality) return null;
    return { ...admin2, features: admin2.features.filter((f) => localityKey(f.properties.adm1_name, f.properties.adm2_name) === selectedLocality) };
  }, [admin2, selectedLocality]);

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
    if (feature?.layer.id === 'gap-overlay-fill' && onLocalityClick) onLocalityClick(feature.properties.key);
    else if (feature) onStateSelect(feature.properties?.adm1_name ?? null);
  };

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    const canvas = mapRef.current?.getCanvas();
    if (canvas) canvas.style.cursor = feature ? 'pointer' : '';
    if (feature?.layer.id === 'gap-overlay-fill') {
      const text = overlayTooltip?.(feature.properties.key) ?? null;
      setHovered(null);
      setHoveredLocality(text ? { lng: event.lngLat.lng, lat: event.lngLat.lat, text } : null);
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
        initialViewState={{ longitude: 28, latitude: 16, zoom: 5 }}
        minZoom={4}
        maxZoom={8}
        maxBounds={[15, 5, 45, 26]}
        mapStyle={osmStyle}
        interactiveLayerIds={enrichedGeoJson ? (overlayOn ? ['gap-overlay-fill', STATES_FILL_LAYER] : [STATES_FILL_LAYER]) : []}
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
                'fill-opacity': overlayOn ? 0.25 : fillOpacityExpression,
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

        {overlayOn && (
          <Source id="gap-overlay" type="geojson" data={overlayGeoJson}>
            <Layer id="gap-overlay-fill" type="fill" paint={{ 'fill-color': ['get', 'color'], 'fill-opacity': 0.75 }} />
            <Layer id="gap-overlay-line" type="line" paint={{ 'line-color': '#ffffff', 'line-width': 0.6 }} />
          </Source>
        )}
        {selectedGeoJson && selectedGeoJson.features.length > 0 && (
          <Source id="selected-locality" type="geojson" data={selectedGeoJson}>
            <Layer id="selected-locality-casing" type="line" paint={{ 'line-color': '#ffffff', 'line-width': 5 }} />
            <Layer id="selected-locality-line" type="line" paint={{ 'line-color': '#0D2B52', 'line-width': 2.5 }} />
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
        {overlayOn && overlayLegend && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            {overlayTitle && (
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.25 }}>
                {overlayTitle}
              </Typography>
            )}
            {overlayLegend.map((item) => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '2px', bgcolor: item.color, opacity: 0.85, border: '1px solid rgba(0,0,0,0.1)' }} />
                <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
