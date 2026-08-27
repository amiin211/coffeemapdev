'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import MapGL, { Source, Layer, Marker, Popup, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { StateAggregate, LocalityAggregate } from '@/utils/threew';
import { ThreeWMetric, metricLabels } from '@/utils/threewMetric';
import { unBlue, unChoroplethRamp } from '@/theme/unColors';

interface ThreeWMapProps {
  stateAggregates: StateAggregate[];
  localityAggregates: LocalityAggregate[];
  selectedState: string | null;
  metric: ThreeWMetric;
  onStateSelect: (state: string | null) => void;
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

// Computed once the real boundary data loads, rather than a hand-tuned
// center/zoom, so the whole country fits regardless of the map's aspect ratio.
function computeBounds(geojson: any): [[number, number], [number, number]] {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;

  const visit = (coords: any): void => {
    if (typeof coords[0] === 'number') {
      const [lng, lat] = coords;
      if (lng < west) west = lng;
      if (lng > east) east = lng;
      if (lat < south) south = lat;
      if (lat > north) north = lat;
    } else {
      coords.forEach(visit);
    }
  };

  geojson.features.forEach((f: any) => visit(f.geometry.coordinates));
  return [[west, south], [east, north]];
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
}: ThreeWMapProps) {
  const [admin1, setAdmin1] = useState<any>(null);
  const [admin2, setAdmin2] = useState<any>(null);
  const [hovered, setHovered] = useState<{ lng: number; lat: number; properties: any } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    fetch('/data/sdn_admin1.geojson')
      .then((res) => res.json())
      .then(setAdmin1);
    fetch('/data/sdn_admin2.geojson')
      .then((res) => res.json())
      .then(setAdmin2);
  }, []);

  useEffect(() => {
    if (mapLoaded && admin1 && mapRef.current) {
      mapRef.current.fitBounds(computeBounds(admin1), { padding: 30, duration: 0 });
    }
  }, [mapLoaded, admin1]);

  const byState = useMemo(() => new Map(stateAggregates.map((s) => [s.state, s])), [stateAggregates]);
  const maxValue = useMemo(() => Math.max(0, ...stateAggregates.map((s) => s[metric])), [stateAggregates, metric]);
  const maxLocalityCount = useMemo(() => Math.max(0, ...localityAggregates.map((l) => l.activities)), [localityAggregates]);

  const enrichedGeoJson = useMemo(() => {
    if (!admin1) return null;
    return {
      ...admin1,
      features: admin1.features.map((feature: any) => {
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
      features: admin2.features.filter((f: any) => f.properties.adm1_name === selectedState),
    };
  }, [admin2, selectedState]);

  const fillColorExpression: ExpressionSpecification = [
    'case',
    ['<=', ['get', 'ratio'], 0], RAMP_NONE,
    ['>=', ['get', 'ratio'], 0.66], RAMP_HIGH,
    ['>=', ['get', 'ratio'], 0.33], RAMP_MEDIUM,
    RAMP_LOW,
  ];

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature) onStateSelect(feature.properties?.adm1_name ?? null);
  };

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature) {
      setHovered({ lng: event.lngLat.lng, lat: event.lngLat.lat, properties: feature.properties });
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
        initialViewState={{ longitude: 28, latitude: 16, zoom: 5 }}
        minZoom={4}
        maxZoom={8}
        maxBounds={[15, 5, 45, 26]}
        mapStyle={osmStyle}
        interactiveLayerIds={enrichedGeoJson ? [STATES_FILL_LAYER] : []}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHovered(null)}
        onLoad={() => setMapLoaded(true)}
        reuseMaps
        style={{ width: '100%', height: '100%' }}
      >
        {enrichedGeoJson && (
          <Source id="states" type="geojson" data={enrichedGeoJson}>
            <Layer
              id={STATES_FILL_LAYER}
              type="fill"
              paint={{
                'fill-color': fillColorExpression,
                'fill-opacity': ['case', ['>', ['get', 'value'], 0], 0.75, 0.3],
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

        {visibleLocalities.map((l, idx) => (
          <Marker key={`loc-${idx}`} longitude={l.locality.lon as number} latitude={l.locality.lat as number}>
            <div
              title={`${l.locality.name}: ${l.activities} activities`}
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
            <strong>{hovered.properties.adm1_name}</strong>
            <br />
            {hovered.properties.activities} activities · {hovered.properties.orgs} orgs · {hovered.properties.clusters} clusters
          </Popup>
        )}
      </MapGL>

      <Box sx={{ position: 'absolute', bottom: 20, left: 20, zIndex: 500, p: 1.5, ...floatingPanelSx }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.75 }}>
          {metricLabels[metric]} by State
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
      </Box>
    </Box>
  );
}
