'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import MapGL, { Source, Layer, Marker, Popup, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { StateAggregate, LocalityAggregate } from '@/utils/threew';

export type ThreeWMetric = 'activities' | 'orgs' | 'clusters';

const metricLabels: Record<ThreeWMetric, string> = {
  activities: 'Activities',
  orgs: 'Organizations',
  clusters: 'Clusters',
};

interface ThreeWMapProps {
  stateAggregates: StateAggregate[];
  localityAggregates: LocalityAggregate[];
  selectedState: string | null;
  metric: ThreeWMetric;
  onMetricChange: (metric: ThreeWMetric) => void;
  onStateSelect: (state: string | null) => void;
}

const STATES_FILL_LAYER = 'states-fill';

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
  layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
};

function getRadius(count: number, max: number): number {
  if (max <= 0 || count <= 0) return 0;
  return Math.max(6, Math.min(28, (count / max) * 28));
}

export default function ThreeWMap({
  stateAggregates,
  localityAggregates,
  selectedState,
  metric,
  onMetricChange,
  onStateSelect,
}: ThreeWMapProps) {
  const [admin1, setAdmin1] = useState<any>(null);
  const [hovered, setHovered] = useState<{ lng: number; lat: number; properties: any } | null>(null);

  useEffect(() => {
    fetch('/data/sdn_admin1.geojson')
      .then((res) => res.json())
      .then(setAdmin1);
  }, []);

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

  const fillColorExpression: ExpressionSpecification = [
    'case',
    ['<=', ['get', 'ratio'], 0], '#e0e0e0',
    ['>=', ['get', 'ratio'], 0.66], '#7f0000',
    ['>=', ['get', 'ratio'], 0.33], '#e34a33',
    '#fdbb84',
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

  return (
    <Box sx={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 600 }}>
          Interactive Map - Click State for Details
        </Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          value={metric}
          onChange={(_, value) => value && onMetricChange(value)}
        >
          {(Object.keys(metricLabels) as ThreeWMetric[]).map((m) => (
            <ToggleButton key={m} value={m} sx={{ fontFamily: 'Fira Code, monospace', fontSize: '0.7rem', px: 1.5 }}>
              {metricLabels[m]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ position: 'relative', flex: 1 }}>
        <MapGL
          initialViewState={{ longitude: 28, latitude: 16, zoom: 5 }}
          minZoom={4.5}
          maxZoom={8}
          maxBounds={[18, 8, 42, 24]}
          mapStyle={osmStyle}
          interactiveLayerIds={enrichedGeoJson ? [STATES_FILL_LAYER] : []}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
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
                  'line-color': ['case', ['get', 'isSelected'], '#333', '#fff'],
                  'line-width': ['case', ['get', 'isSelected'], 3, 2],
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
                  background: 'rgba(21, 101, 192, 0.6)',
                  border: '1px solid #0d47a1',
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

        <Box
          sx={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 1000,
            bgcolor: 'white',
            p: 2,
            borderRadius: 1,
            boxShadow: 2,
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
            {metricLabels[metric]} by State
          </Typography>
          {[
            { label: 'High', color: '#7f0000' },
            { label: 'Medium', color: '#e34a33' },
            { label: 'Low', color: '#fdbb84' },
            { label: 'None', color: '#e0e0e0' },
          ].map((item) => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: item.color, borderRadius: 1 }} />
              <Typography variant="caption">{item.label}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
