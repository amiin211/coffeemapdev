'use client';

import { useEffect, useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
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

function colorForRatio(ratio: number): string {
  if (ratio <= 0) return '#e0e0e0';
  if (ratio >= 0.66) return '#7f0000';
  if (ratio >= 0.33) return '#e34a33';
  return '#fdbb84';
}

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
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  useEffect(() => {
    fetch('/data/sdn_admin1.geojson')
      .then((res) => res.json())
      .then((data) => setGeoJsonData(data));
  }, []);

  const byState = new Map(stateAggregates.map((s) => [s.state, s]));
  const maxValue = Math.max(0, ...stateAggregates.map((s) => s[metric]));
  const maxLocalityCount = Math.max(0, ...localityAggregates.map((l) => l.activities));

  const style = (feature: any) => {
    const agg = byState.get(feature.properties.adm1_name);
    const value = agg?.[metric] ?? 0;
    const isSelected = feature.properties.adm1_name === selectedState;
    return {
      fillColor: colorForRatio(maxValue > 0 ? value / maxValue : 0),
      weight: isSelected ? 3 : 2,
      opacity: 1,
      color: isSelected ? '#333' : '#fff',
      fillOpacity: value > 0 ? 0.75 : 0.3,
    };
  };

  const onEachFeature = (feature: any, layer: any) => {
    const agg = byState.get(feature.properties.adm1_name);
    layer.bindTooltip(
      `<strong>${feature.properties.adm1_name}</strong><br/>${agg?.activities ?? 0} activities · ${agg?.orgs ?? 0} orgs · ${agg?.clusters ?? 0} clusters`
    );
    layer.on({
      mouseover: (e: any) => e.target.setStyle({ weight: 3, color: '#666', fillOpacity: 0.9 }),
      mouseout: (e: any) => e.target.setStyle(style(feature)),
      click: () => onStateSelect(feature.properties.adm1_name),
    });
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
        <MapContainer
          center={[16, 28]}
          zoom={5}
          minZoom={5}
          maxZoom={8}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          maxBounds={[
            [8, 18],
            [24, 42],
          ]}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {geoJsonData && <GeoJSON key={metric} data={geoJsonData} style={style} onEachFeature={onEachFeature} />}

          {visibleLocalities.map((l, idx) => (
            <CircleMarker
              key={`loc-${idx}`}
              center={[l.locality.lat as number, l.locality.lon as number]}
              radius={getRadius(l.activities, maxLocalityCount)}
              pathOptions={{ fillColor: '#1565c0', fillOpacity: 0.6, color: '#0d47a1', weight: 1 }}
            >
              <LeafletTooltip>
                {l.locality.name}: {l.activities} activities
              </LeafletTooltip>
            </CircleMarker>
          ))}
        </MapContainer>

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
