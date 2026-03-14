'use client';

import { useEffect, useState, useRef } from 'react';
import { Box, Typography, Paper, IconButton } from '@mui/material';
import { MapContainer, TileLayer, GeoJSON, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

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

function getColor(affected: number | null): string {
  if (affected === null) return '#e0e0e0';
  if (affected >= 50000) return '#7f0000';
  if (affected >= 15000) return '#fd8d3c';
  return '#feb24c';
}

function getRadius(affected: number | null): number {
  if (affected === null) return 0;
  if (affected >= 50000) return 40;
  if (affected >= 15000) return 30;
  return 20;
}

function getCholeraRadius(cases: number): number {
  if (cases >= 1000) return 35;
  if (cases >= 500) return 25;
  if (cases >= 100) return 18;
  return 12;
}

export default function FloodMap({ statesData, localitiesData, onStateSelect, choleraData }: FloodMapProps) {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [localityGeoJsonData, setLocalityGeoJsonData] = useState<any>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const mapRef = useRef<L.Map>(null);
  
  useEffect(() => {
    fetch('/data/sdn_admin1.geojson')
      .then(res => res.json())
      .then(data => {
        const enrichedData = {
          ...data,
          features: data.features.map((feature: any) => {
            const stateName = feature.properties.adm1_name;
            const stateInfo = statesData.find(s => s.name === stateName);
            return {
              ...feature,
              properties: {
                ...feature.properties,
                affected: stateInfo?.affected ?? null,
                has_data: stateInfo?.has_data ?? false,
                deaths: stateInfo?.deaths ?? null,
                homes_destroyed: stateInfo?.homes_destroyed ?? null,
                homes_damaged: stateInfo?.homes_damaged ?? null,
              }
            };
          })
        };
        setGeoJsonData(enrichedData);
      });
  }, [statesData]);

  useEffect(() => {
    fetch('/data/sdn_admin2.geojson')
      .then(res => res.json())
      .then(data => {
        const enrichedData = {
          ...data,
          features: data.features.map((feature: any) => {
            const locName = feature.properties.adm2_name;
            const locData = localitiesData.find(l => l.name === locName);
            return {
              ...feature,
              properties: {
                ...feature.properties,
                affected: locData?.affected ?? null,
              }
            };
          })
        };
        setLocalityGeoJsonData(enrichedData);
      });
  }, [localitiesData]);

  const handleStateClick = (properties: any) => {
    const stateInfo = statesData.find(s => s.name === properties.adm1_name);
    if (stateInfo) {
      const stateLocalities = localitiesData.filter(l => l.state === stateInfo.name);
      onStateSelect(stateInfo, stateLocalities);
    }
  };

  const style = (feature: any) => {
    const affected = feature.properties.affected;
    const hasData = feature.properties.has_data;
    return {
      fillColor: getColor(affected),
      weight: 2,
      opacity: 1,
      color: hasData ? '#fff' : '#999',
      dashArray: hasData ? '' : '3,3',
      fillOpacity: hasData ? 0.7 : 0.3,
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    layer.on({
      mouseover: (e) => {
        const layer = e.target;
        layer.setStyle({
          weight: 3,
          color: '#666',
          fillOpacity: 0.9,
        });
        setHoveredState(feature.properties.adm1_name);
      },
      mouseout: (e) => {
        const layer = e.target;
        layer.setStyle(style(feature));
        setHoveredState(null);
      },
      click: () => {
        handleStateClick(feature.properties);
      },
    });
  };

  return (
    <Box sx={{ height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid #eee' }}>
        <Typography variant="h6" sx={{ fontFamily: 'Fira Code, monospace', fontWeight: 600 }}>
          Interactive Map - Click State for Details
        </Typography>
      </Box>
      
      <Box sx={{ position: 'relative', flex: 1 }}>
        <MapContainer
          center={[16, 28]}
          zoom={5}
          minZoom={5}
          maxZoom={8}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
          ref={mapRef}
          maxBounds={[
            [8, 18],
            [24, 42]
          ]}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {geoJsonData && (
            <GeoJSON
              data={geoJsonData}
              style={style}
              onEachFeature={onEachFeature}
            />
          )}
          
          {choleraData && choleraData.map((cholera, idx) => (
            <CircleMarker
              key={`cholera-${idx}`}
              center={[cholera.lat, cholera.lon]}
              radius={getCholeraRadius(cholera.cases)}
              pathOptions={{
                fillColor: 'transparent',
                fillOpacity: 0,
                color: '#9c27b0',
                weight: 2,
              }}
            />
          ))}
        </MapContainer>
        
        <Box sx={{ 
          position: 'absolute', 
          bottom: 20, 
          left: 20, 
          zIndex: 1000,
          bgcolor: 'white',
          p: 2,
          borderRadius: 1,
          boxShadow: 2,
        }}>
          <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
            Flood Affected
          </Typography>
          {[
            { label: 'High (> 50,000)', color: '#7f0000' },
            { label: 'Medium (15,000 - 50,000)', color: '#fd8d3c' },
            { label: 'Low (< 15,000)', color: '#feb24c' },
            { label: 'No Data', color: '#e0e0e0' },
          ].map(item => (
            <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Box sx={{ width: 16, height: 16, bgcolor: item.color, borderRadius: 1 }} />
              <Typography variant="caption">{item.label}</Typography>
            </Box>
          ))}
        </Box>

        {choleraData && choleraData.length > 0 && (
          <Box sx={{ 
            position: 'absolute', 
            bottom: 20, 
            right: 20, 
            zIndex: 1000,
            bgcolor: 'white',
            p: 1.5,
            borderRadius: 1,
            boxShadow: 2,
          }}>
            <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
              Cholera Cases
            </Typography>
            {[
              { label: '> 1,000', r: 35 },
              { label: '500-1,000', r: 25 },
              { label: '100-500', r: 18 },
              { label: '< 100', r: 12 },
            ].map(item => (
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
          </Box>
        )}
      </Box>
    </Box>
  );
}
