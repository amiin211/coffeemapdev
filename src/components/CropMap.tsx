'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Typography } from '@mui/material';
import MapGL, { Source, Layer, Popup, NavigationControl, FullscreenControl, MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import type { ExpressionSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  CROP_COLORS,
  CropIndex,
  CropTimeSeries,
  FieldsCollection,
  INDEX_LABEL,
  formatDate,
  indexTileUrl,
  trueColorTileUrl,
  valueAt,
  anomalyAt,
  cropOn,
} from '@/utils/crop';

interface CropMapProps {
  fields: FieldsCollection;
  series: CropTimeSeries;
  dateIndex: number;
  index: CropIndex;
  showIndexLayer: boolean;
  cropFilter: string | null;
  selectedField: string | null;
  onFieldSelect: (id: string | null) => void;
}

// MapLibre demotiles basemap (served locally, fills + labels only).
const BASEMAP = '/data/basemap_style.json';
const ANOMALY_COLOR = '#D50000';

function bounds(geometry: GeoJSON.Polygon): [[number, number], [number, number]] {
  const ring = geometry.coordinates[0];
  const xs = ring.map((c) => c[0]);
  const ys = ring.map((c) => c[1]);
  return [[Math.min(...xs), Math.min(...ys)], [Math.max(...xs), Math.max(...ys)]];
}

const floatingPanelSx = {
  bgcolor: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(8px)',
  borderRadius: 1.5,
  boxShadow: 2,
};

// RdYlGn over 0–0.8, matching the tile rescale.
const RAMP = ['#a50026', '#f46d43', '#fee08b', '#d9ef8b', '#66bd63', '#006837'];

export default function CropMap({
  fields,
  series,
  dateIndex,
  index,
  showIndexLayer,
  cropFilter,
  selectedField,
  onFieldSelect,
}: CropMapProps) {
  const [popup, setPopup] = useState<{ lng: number; lat: number; id: string } | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [minZoom, setMinZoom] = useState(8);
  const mapRef = useRef<MapRef>(null);

  const item = series.items[dateIndex];
  const date = series.dates[dateIndex];

  // The initial AOI view is as far out as the map goes: zooming out past it
  // only shows scene outside the monitored area.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const camera = mapRef.current.cameraForBounds(bounds(series.aoi), { padding: 30 });
    if (camera?.zoom) setMinZoom(camera.zoom);
  }, [mapLoaded, series.aoi]);

  // Centre on the AOI, or the selected field.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const target = selectedField ? fields.features.find((f) => f.properties.id === selectedField)?.geometry : series.aoi;
    if (target) mapRef.current.fitBounds(bounds(target), { padding: selectedField ? 120 : 30, duration: 800, maxZoom: 14 });
  }, [mapLoaded, selectedField, fields, series.aoi]);

  const fieldsGeoJson = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      ...fields,
      features: fields.features.map((f) => {
        const s = series.fields[f.properties.id];
        const reading = valueAt(s[index], series.dates, dateIndex);
        return {
          ...f,
          properties: {
            id: f.properties.id,
            crop: f.properties.crop,
            value: reading?.value ?? -1,
            anomaly: anomalyAt(s, series.dates, dateIndex),
            dimmed: !!cropFilter && f.properties.crop !== cropFilter,
            selected: f.properties.id === selectedField,
          },
        };
      }),
    }),
    [fields, series, index, dateIndex, cropFilter, selectedField]
  );

  // Everything outside the AOI is shaded so the scene's surroundings recede.
  const outsideMask = useMemo<GeoJSON.Feature<GeoJSON.Polygon>>(
    () => ({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
          [...series.aoi.coordinates[0]].reverse(),
        ],
      },
      properties: {},
    }),
    [series.aoi]
  );

  const cropColor = ['match', ['get', 'crop'], ...Object.entries(CROP_COLORS).flat(), '#BDBDBD'] as unknown as ExpressionSpecification;

  const valueColor: ExpressionSpecification = [
    'case',
    ['<', ['get', 'value'], 0], 'rgba(0,0,0,0)',
    ['interpolate', ['linear'], ['get', 'value'], ...RAMP.flatMap((c, i) => [(i / (RAMP.length - 1)) * 0.8, c])],
  ] as unknown as ExpressionSpecification;

  const handleClick = (event: MapLayerMouseEvent) => {
    const feature = event.features?.[0];
    if (!feature) {
      setPopup(null);
      return;
    }
    const id = feature.properties?.id as string;
    setPopup({ lng: event.lngLat.lng, lat: event.lngLat.lat, id });
    onFieldSelect(id);
  };

  const popupField = popup ? fields.features.find((f) => f.properties.id === popup.id)?.properties : null;
  const popupSeries = popup ? series.fields[popup.id] : null;
  const popupReading = popupSeries ? valueAt(popupSeries[index], series.dates, dateIndex) : null;
  const popupAnomaly = popupSeries ? anomalyAt(popupSeries, series.dates, dateIndex) : false;
  const popupCrop = popupField ? cropOn(popupField, date) : null;

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <MapGL
        ref={mapRef}
        initialViewState={{ longitude: 38.29, latitude: 29.93, zoom: 11 }}
        minZoom={minZoom}
        maxZoom={16}
        mapStyle={BASEMAP}
        interactiveLayerIds={['fields-fill']}
        onClick={handleClick}
        onMouseMove={(e) => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) canvas.style.cursor = e.features?.length ? 'pointer' : '';
        }}
        onLoad={() => setMapLoaded(true)}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="top-right" showCompass={false} />
        <FullscreenControl position="top-right" />

        <Source id="true-color" type="raster" tiles={[trueColorTileUrl(item)]} tileSize={256} attribution="Sentinel-2 L2A © ESA / Copernicus, via Microsoft Planetary Computer">
          <Layer id="true-color" type="raster" paint={{ 'raster-fade-duration': 300 }} />
        </Source>

        <Source id="index" type="raster" tiles={[indexTileUrl(item, index)]} tileSize={256}>
          <Layer
            id="index"
            type="raster"
            layout={{ visibility: showIndexLayer ? 'visible' : 'none' }}
            paint={{ 'raster-opacity': 0.85, 'raster-fade-duration': 300 }}
          />
        </Source>

        <Source id="outside-aoi" type="geojson" data={outsideMask}>
          <Layer id="outside-aoi" type="fill" paint={{ 'fill-color': '#0b1a2e', 'fill-opacity': 0.45 }} />
        </Source>

        <Source id="fields" type="geojson" data={fieldsGeoJson}>
          {/* Transparent over the index raster; the field's own mean shows when the raster is off. */}
          <Layer
            id="fields-fill"
            type="fill"
            paint={{
              'fill-color': showIndexLayer ? '#ffffff' : valueColor,
              'fill-opacity': showIndexLayer ? ['case', ['get', 'dimmed'], 0.55, 0.01] : ['case', ['get', 'dimmed'], 0.1, 0.85],
              'fill-opacity-transition': { duration: 300 },
            }}
          />
          <Layer
            id="fields-outline"
            type="line"
            layout={{ 'line-sort-key': ['case', ['get', 'selected'], 3, ['get', 'anomaly'], 2, 1] }}
            paint={{
              'line-color': ['case', ['get', 'anomaly'], ANOMALY_COLOR, ['get', 'selected'], '#ffffff', cropColor],
              'line-width': ['case', ['get', 'selected'], 3.5, ['get', 'anomaly'], 3, 1.5],
              'line-opacity': ['case', ['get', 'dimmed'], 0.25, 1],
            }}
          />
        </Source>

        {popup && popupField && (
          <Popup longitude={popup.lng} latitude={popup.lat} onClose={() => setPopup(null)} offset={8} maxWidth="260px">
            <Box sx={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.75rem', lineHeight: 1.55 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {popupField.name}
              </Typography>
              <Box sx={{ color: 'text.secondary', mb: 0.5 }}>
                {popupField.type === 'pivot' ? 'Centre pivot' : 'Block'} · {popupField.area_ha} ha
              </Box>
              <div><strong>Date:</strong> {formatDate(date)}</div>
              <div>
                <strong>{INDEX_LABEL[index]}:</strong>{' '}
                {popupReading ? popupReading.value.toFixed(2) : 'no clear view'}
                {popupReading && popupReading.date !== date && (
                  <Box component="span" sx={{ color: 'text.secondary' }}> (as of {formatDate(popupReading.date)})</Box>
                )}
              </div>
              <div>
                <strong>Crop:</strong> {popupCrop ? `${popupCrop.crop} (${Math.round(popupCrop.confidence * 100)}%)` : 'Unclassified'}
                {popupCrop && <Box component="span" sx={{ color: 'text.secondary' }}> · {popupCrop.season}</Box>}
              </div>
              <div>
                <strong>Anomaly:</strong>{' '}
                <Box component="span" sx={{ color: popupAnomaly ? ANOMALY_COLOR : 'success.main', fontWeight: 600 }}>
                  {popupAnomaly ? 'Below seasonal range' : 'Normal'}
                </Box>
              </div>
            </Box>
          </Popup>
        )}
      </MapGL>

      <Box sx={{ position: 'absolute', bottom: 20, left: 20, zIndex: 500, p: 1.5, ...floatingPanelSx }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          {INDEX_LABEL[index]} · {formatDate(date)}
        </Typography>
        <Box sx={{ width: 200, height: 10, borderRadius: 1, background: `linear-gradient(90deg, ${RAMP.join(',')})` }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', width: 200 }}>
          {['0', '0.4', '0.8+'].map((t) => (
            <Typography key={t} variant="caption" sx={{ fontSize: '0.62rem' }}>
              {t}
            </Typography>
          ))}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.75 }}>
          <Box sx={{ width: 14, height: 10, border: `2.5px solid ${ANOMALY_COLOR}`, borderRadius: 0.5 }} />
          <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
            Anomaly (NDVI &lt; seasonal mean − 2σ)
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
