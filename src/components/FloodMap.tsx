'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography, ToggleButton, ToggleButtonGroup } from '@mui/material';
import MapGL, { Source, Layer, Marker, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { StyleSpecification, ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

interface StateData {
  name: string;
  arabic_name: string;
  pcode: string;
  affected: number | null;
  deaths: number | null;
  injured?: number | null;
  homes_destroyed: number | null;
  homes_damaged: number | null;
  lat: number;
  lon: number;
  has_data: boolean;
}

interface LocalityData {
  name: string;
  state: string;
  state_pcode: string;
  lat: number;
  lon: number;
  affected: number | null;
}

interface CholeraData {
  name: string;
  cases: number;
  lat: number;
  lon: number;
}

interface FloodMapProps {
  statesData: StateData[];
  localitiesData: LocalityData[];
  onStateSelect: (state: StateData | null, localities: LocalityData[]) => void;
  choleraData?: CholeraData[];
}

const STATES_FILL_LAYER = 'flood-states-fill';

type LayerMode = 'floods' | 'cholera' | 'both';

// Blue ramp for flood-affected population (High / Medium / Low).
const floodRamp = ['#08306b', '#2171b5', '#6baed6'];
// Brown ramp for cholera case counts (High / Medium / Low).
const choleraRamp = ['#4a2410', '#8a4b22', '#b9834e'];

// No Mapbox account/token in use — compose a minimal raster style against the
// same OpenStreetMap tile server the previous Leaflet-based map used.
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
        // Plain gray basemap: desaturate the OSM tiles so the flood
        // choropleth colors are the only color on the map.
        'raster-saturation': -1,
        'raster-brightness-min': 0.35,
        'raster-brightness-max': 1,
      },
    },
  ],
};

// Blue flood choropleth color by affected population.
function getFloodColor(affected: number | null): string {
  if (affected === null) return '#e0e0e0';
  if (affected >= 50000) return floodRamp[0];
  if (affected >= 15000) return floodRamp[1];
  return floodRamp[2];
}

// Brown cholera choropleth color by case count.
function getCholeraColor(cases: number | null): string {
  if (cases === null || cases <= 0) return '#e0e0e0';
  if (cases >= 1000) return choleraRamp[0];
  if (cases >= 500) return choleraRamp[1];
  if (cases >= 100) return choleraRamp[2];
  return choleraRamp[2];
}

function getCholeraRadius(cases: number): number {
  if (cases >= 1000) return 35;
  if (cases >= 500) return 25;
  if (cases >= 100) return 18;
  return 12;
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

export default function FloodMap({ statesData, localitiesData, onStateSelect, choleraData }: FloodMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [hovered, setHovered] = useState<{ lng: number; lat: number; properties: any } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mode, setMode] = useState<LayerMode>('both');
  const mapRef = useRef<any>(null);

  const choleraByState = useMemo(() => {
    const map = new Map<string, number>();
    (choleraData ?? []).forEach((c) => map.set(c.name, c.cases));
    return map;
  }, [choleraData]);

  useEffect(() => {
    fetch('/data/sdn_admin1.geojson')
      .then((res) => res.json())
      .then((data) => {
        const enrichedData = {
          ...data,
          features: data.features.map((feature: any) => {
            const stateName = feature.properties.adm1_name;
            const stateInfo = statesData.find((s) => s.name === stateName);
            const choleraCases = choleraByState.get(stateName) ?? null;
            return {
              ...feature,
              properties: {
                ...feature.properties,
                affected: stateInfo?.affected ?? null,
                has_data: stateInfo?.has_data ?? false,
                deaths: stateInfo?.deaths ?? null,
                homes_destroyed: stateInfo?.homes_destroyed ?? null,
                homes_damaged: stateInfo?.homes_damaged ?? null,
                cholera_cases: choleraCases,
                has_cholera: choleraCases !== null && choleraCases > 0,
              },
            };
          }),
        };
        setGeoJsonData(enrichedData);
      });
  }, [statesData, choleraByState]);

  useEffect(() => {
    if (mapLoaded && geoJsonData && mapRef.current) {
      const container = mapRef.current.getContainer?.();
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        mapRef.current.fitBounds(computeBounds(geoJsonData), { padding: 30, duration: 0 });
      }
    }
  }, [mapLoaded, geoJsonData]);

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature) {
      const stateInfo = statesData.find((s) => s.name === feature.properties?.adm1_name);
      if (stateInfo) {
        const stateLocalities = localitiesData.filter((l) => l.state === stateInfo.name);
        onStateSelect(stateInfo, stateLocalities);
      }
    }
  };

  const handleMouseMove = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (feature) {
      setHovered({ lng: event.lngLat.lng, lat: event.lngLat.lat, properties: feature.properties });
    } else {
      setHovered(null);
    }
  };

  // Flood choropleth by affected population (blue).
  const floodColorExpression: ExpressionSpecification = [
    'case',
    ['>=', ['get', 'affected'], 50000], floodRamp[0],
    ['>=', ['get', 'affected'], 15000], floodRamp[1],
    ['>', ['get', 'affected'], 0], floodRamp[2],
    '#e0e0e0',
  ];

  // Cholera choropleth by case count (brown).
  const choleraColorExpression: ExpressionSpecification = [
    'case',
    ['>=', ['get', 'cholera_cases'], 1000], choleraRamp[0],
    ['>=', ['get', 'cholera_cases'], 500], choleraRamp[1],
    ['>', ['get', 'cholera_cases'], 0], choleraRamp[2],
    '#e0e0e0',
  ];

  const fillColorExpression: ExpressionSpecification =
    mode === 'cholera' ? choleraColorExpression : floodColorExpression;

  const fillOpacityExpression: ExpressionSpecification = [
    'case',
    ['get', 'has_data'], 0.7,
    0.3,
  ];

  const lineColorExpression: ExpressionSpecification = [
    'case',
    ['get', 'has_data'], '#fff',
    '#999',
  ];

  const visibleCholeraMarkers = mode === 'cholera' || mode === 'both' ? (choleraData ?? []) : [];

  return (
    <Box sx={{ height: '100%', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee', flexShrink: 0 }}>
        <Typography variant="h6" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 600 }}>
          Interactive Map - Click State for Details
        </Typography>
      </Box>

      <Box sx={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <MapGL
          ref={mapRef}
          initialViewState={{ longitude: 30.2, latitude: 15.85, zoom: 4.5 }}
          minZoom={4}
          maxZoom={8}
          mapStyle={osmStyle}
          interactiveLayerIds={geoJsonData ? [STATES_FILL_LAYER] : []}
          onClick={handleClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHovered(null)}
          onLoad={() => setMapLoaded(true)}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        >
          {geoJsonData && (
            <Source id="flood-states" type="geojson" data={geoJsonData}>
              <Layer
                id={STATES_FILL_LAYER}
                type="fill"
                paint={{
                  'fill-color': fillColorExpression,
                  'fill-opacity': hovered ? [
                    'case',
                    ['==', ['get', 'adm1_name'], hovered.properties.adm1_name], 0.9,
                    ['get', 'has_data'], 0.7,
                    0.3,
                  ] : fillOpacityExpression,
                }}
              />
              <Layer
                id="flood-states-outline"
                type="line"
                paint={{
                  'line-color': lineColorExpression,
                  'line-width': ['case', ['==', ['get', 'adm1_name'], hovered?.properties?.adm1_name ?? ''], 3, 2],
                  'line-opacity': 1,
                }}
              />
            </Source>
          )}

          {visibleCholeraMarkers.map((cholera, idx) => (
            <Marker
              key={`cholera-${idx}`}
              longitude={cholera.lon}
              latitude={cholera.lat}
            >
              <div
                title={`${cholera.name}: ${cholera.cases} cases`}
                style={{
                  width: getCholeraRadius(cholera.cases) * 2,
                  height: getCholeraRadius(cholera.cases) * 2,
                  borderRadius: '50%',
                  border: '2px solid #9c27b0',
                  background: 'transparent',
                }}
              />
            </Marker>
          ))}
        </MapGL>

        <Box sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 500 }}>
          <ToggleButtonGroup
            exclusive
            value={mode}
            onChange={(_e, val) => { if (val) setMode(val); }}
            size="small"
            sx={{ bgcolor: 'white', boxShadow: 2, borderRadius: 1 }}
          >
            <ToggleButton value="cholera">Cholera</ToggleButton>
            <ToggleButton value="floods">Floods</ToggleButton>
            <ToggleButton value="both">Both</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {(mode === 'floods' || mode === 'both') && (
          <Box sx={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            zIndex: 500,
            bgcolor: 'white',
            p: 2,
            borderRadius: 1,
            boxShadow: 2,
          }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Flood Affected
            </Typography>
            {[
              { label: 'High (> 50,000)', color: getFloodColor(50000) },
              { label: 'Medium (15,000 - 50,000)', color: getFloodColor(20000) },
              { label: 'Low (< 15,000)', color: getFloodColor(5000) },
              { label: 'No Data', color: '#e0e0e0' },
            ].map((item) => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box sx={{ width: 16, height: 16, bgcolor: item.color, borderRadius: 1 }} />
                <Typography variant="caption">{item.label}</Typography>
              </Box>
            ))}
          </Box>
        )}

        {(mode === 'cholera' || mode === 'both') && choleraData && choleraData.length > 0 && (
          <Box sx={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            zIndex: 500,
            bgcolor: 'white',
            p: 1.5,
            borderRadius: 1,
            boxShadow: 2,
          }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Cholera Cases
            </Typography>
            {mode === 'cholera' ? (
              <>
                {[
                  { label: '> 1,000', color: getCholeraColor(1000) },
                  { label: '500-1,000', color: getCholeraColor(600) },
                  { label: '100-500', color: getCholeraColor(200) },
                  { label: 'No Data', color: '#e0e0e0' },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Box sx={{ width: 16, height: 16, bgcolor: item.color, borderRadius: 1 }} />
                    <Typography variant="caption">{item.label}</Typography>
                  </Box>
                ))}
              </>
            ) : (
              <>
                {[
                  { label: '> 1,000', r: 35 },
                  { label: '500-1,000', r: 25 },
                  { label: '100-500', r: 18 },
                  { label: '< 100', r: 12 },
                ].map((item) => (
                  <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Box sx={{
                      width: item.r * 2,
                      height: item.r * 2,
                      border: '2px solid #9c27b0',
                      borderRadius: '50%',
                      bgcolor: 'transparent',
                    }} />
                    <Typography variant="caption">{item.label}</Typography>
                  </Box>
                ))}
              </>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
