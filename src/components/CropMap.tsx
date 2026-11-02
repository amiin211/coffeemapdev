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
  cropLabel,
  fieldLabel,
  formatDate,
  indexTileUrl,
  trueColorTileUrl,
  valueAt,
  anomalyAt,
  cropOn,
} from '@/utils/crop';
import { MAPLIBRE_WORKER_URL } from '@/lib/maplibre';
import { FieldHealth, HEALTH_COLORS, HEALTH_LABEL, Health } from '@/lib/cropInsights';
import { CHANGE_RAMP, CropMapMode, ModeLegend, WATER_MAX, WATER_RAMP } from '@/components/CropIntel';
import { useI18n } from '@/i18n';

interface CropMapProps {
  fields: FieldsCollection;
  series: CropTimeSeries;
  dateIndex: number;
  index: CropIndex;
  showIndexLayer: boolean;
  cropFilter: string | null;
  selectedField: string | null;
  onFieldSelect: (id: string | null) => void;
  mode: CropMapMode;
  health: Map<string, FieldHealth>;
  modeValues: Map<string, number | null>; // NDVI change or m³/ha, by field
  highlight: string[]; // look-alike fields
  healthFilter: Health | null;
  compareLabel: string;
}

// Desaturated OpenStreetMap raster basemap shared with the other dashboards.
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
  mode,
  health,
  modeValues,
  highlight,
  healthFilter,
  compareLabel,
}: CropMapProps) {
  const [hover, setHover] = useState<{ x: number; y: number; id: string } | null>(null);
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
            dimmed: (!!cropFilter && f.properties.crop !== cropFilter) || (!!healthFilter && health.get(f.properties.id)?.health !== healthFilter),
            selected: f.properties.id === selectedField,
            health: health.get(f.properties.id)?.health ?? 'nodata',
            mv: modeValues.get(f.properties.id) ?? -999,
            similar: highlight.includes(f.properties.id),
          },
        };
      }),
    }),
    [fields, series, index, dateIndex, cropFilter, selectedField, health, healthFilter, modeValues, highlight]
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

  const healthColor = ['match', ['get', 'health'], ...Object.entries(HEALTH_COLORS).flat(), '#ffffff'] as unknown as ExpressionSpecification;
  const changeColor = [
    'case',
    ['<', ['get', 'mv'], -900], 'rgba(0,0,0,0)',
    ['interpolate', ['linear'], ['get', 'mv'], ...CHANGE_RAMP.flatMap((c, i) => [-0.4 + (i / (CHANGE_RAMP.length - 1)) * 0.8, c])],
  ] as unknown as ExpressionSpecification;
  const waterColor = [
    'case',
    ['<', ['get', 'mv'], -900], 'rgba(0,0,0,0)',
    ['interpolate', ['linear'], ['get', 'mv'], ...WATER_RAMP.flatMap((c, i) => [(i / (WATER_RAMP.length - 1)) * WATER_MAX, c])],
  ] as unknown as ExpressionSpecification;
  const modeFill = mode === 'health' ? healthColor : mode === 'change' ? changeColor : mode === 'water' ? waterColor : cropColor;
  const indexMode = mode === 'index';

  const { isAr, tr } = useI18n();
  // Arabic mirrors the map chrome: controls on the left, legend on the right.
  const side = isAr ? 'left' : 'right';

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

  const hoverText = (id: string) => {
    const f = fields.features.find((x) => x.properties.id === id)?.properties;
    if (!f) return null;
    const h = health.get(id);
    const mv = modeValues.get(id);
    const reading = valueAt(series.fields[id][index], series.dates, dateIndex);
    let body = `${INDEX_LABEL[index]} ${reading ? reading.value.toFixed(2) : '—'}`;
    if (mode === 'health' && h) body = `${HEALTH_LABEL[h.health][isAr ? 1 : 0]}${h.ratio ? ` · ${Math.round(h.ratio * 100)}% ${tr('of peers', 'من النظراء')}` : ''}`;
    if (mode === 'change') body = mv == null ? tr('no clear pair of scenes', 'لا يوجد مشهدان صافيان') : `ΔNDVI ${mv > 0 ? '+' : ''}${mv.toFixed(2)}`;
    if (mode === 'water') body = mv == null ? '—' : `${Math.round(mv).toLocaleString()} m³/ha · ${tr('12 months', '12 شهرًا')}`;
    if (mode === 'crop') body = cropLabel(cropOn(f, date)?.crop ?? f.crop, isAr);
    return { title: `${fieldLabel(f.name, isAr)} · ${f.area_ha} ${tr('ha', 'هكتار')}`, body };
  };

  return (
    <Box sx={{ height: '100%', position: 'relative' }}>
      <MapGL
        ref={mapRef}
        workerUrl={MAPLIBRE_WORKER_URL}
        canvasContextAttributes={{ preserveDrawingBuffer: true }} // lets the PDF report snapshot the map
        initialViewState={{ longitude: 38.29, latitude: 29.93, zoom: 11 }}
        minZoom={minZoom}
        maxZoom={16}
        mapStyle={BASEMAP}
        interactiveLayerIds={['fields-fill']}
        onClick={handleClick}
        onMouseMove={(e) => {
          const canvas = mapRef.current?.getCanvas();
          if (canvas) canvas.style.cursor = e.features?.length ? 'pointer' : '';
          const id = e.features?.[0]?.properties?.id as string | undefined;
          setHover(id ? { x: e.point.x, y: e.point.y, id } : null);
        }}
        onMouseLeave={() => setHover(null)}
        onLoad={() => setMapLoaded(true)}
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position={`top-${side}`} showCompass={false} />
        <FullscreenControl position={`top-${side}`} />

        <Source id="true-color" type="raster" tiles={[trueColorTileUrl(item)]} tileSize={256} attribution="Sentinel-2 L2A © ESA / Copernicus, via Microsoft Planetary Computer">
          <Layer id="true-color" type="raster" paint={{ 'raster-fade-duration': 300 }} />
        </Source>

        <Source id="index" type="raster" tiles={[indexTileUrl(item, index)]} tileSize={256}>
          <Layer
            id="index"
            type="raster"
            layout={{ visibility: showIndexLayer && indexMode ? 'visible' : 'none' }}
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
              'fill-color': !indexMode ? modeFill : showIndexLayer ? '#ffffff' : valueColor,
              'fill-opacity': !indexMode
                ? ['case', ['get', 'dimmed'], 0.12, 0.82]
                : showIndexLayer ? ['case', ['get', 'dimmed'], 0.55, 0.01] : ['case', ['get', 'dimmed'], 0.1, 0.85],
              'fill-opacity-transition': { duration: 300 },
            }}
          />
          <Layer
            id="fields-outline"
            type="line"
            layout={{ 'line-sort-key': ['case', ['get', 'selected'], 4, ['get', 'similar'], 3, ['get', 'anomaly'], 2, 1] }}
            paint={{
              'line-color': ['case', ['get', 'selected'], '#ffffff', ['get', 'similar'], '#00B8D4', ['get', 'anomaly'], ANOMALY_COLOR, indexMode ? cropColor : 'rgba(255,255,255,0.75)'],
              'line-width': ['case', ['get', 'selected'], 3.5, ['get', 'similar'], 3.5, ['get', 'anomaly'], 3, indexMode ? 1.5 : 0.8],
              'line-opacity': ['case', ['get', 'dimmed'], 0.25, 1],
            }}
          />
        </Source>

        {popup && popupField && (
          <Popup longitude={popup.lng} latitude={popup.lat} onClose={() => setPopup(null)} offset={8} maxWidth="260px">
            <Box sx={{ fontFamily: 'Roboto, sans-serif', fontSize: '0.75rem', lineHeight: 1.55 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {fieldLabel(popupField.name, isAr)}
              </Typography>
              <Box sx={{ color: 'text.secondary', mb: 0.5 }}>
                {popupField.type === 'pivot' ? tr('Centre pivot', 'ري محوري') : tr('Block', 'حقل مستطيل')} · {popupField.area_ha} {tr('ha', 'هكتار')}
              </Box>
              <div><strong>{tr('Date:', 'التاريخ:')}</strong> {formatDate(date, isAr)}</div>
              <div>
                <strong>{INDEX_LABEL[index]}:</strong>{' '}
                {popupReading ? popupReading.value.toFixed(2) : tr('no clear view', 'لا توجد رؤية صافية')}
                {popupReading && popupReading.date !== date && (
                  <Box component="span" sx={{ color: 'text.secondary' }}> ({tr('as of', 'حتى')} {formatDate(popupReading.date, isAr)})</Box>
                )}
              </div>
              <div>
                <strong>{tr('Crop:', 'المحصول:')}</strong> {popupCrop ? `${cropLabel(popupCrop.crop, isAr)} (${Math.round(popupCrop.confidence * 100)}%)` : cropLabel('Unclassified', isAr)}
                {popupCrop && <Box component="span" sx={{ color: 'text.secondary' }}> · {popupCrop.season}</Box>}
              </div>
              <div>
                <strong>{tr('Anomaly:', 'الشذوذ:')}</strong>{' '}
                <Box component="span" sx={{ color: popupAnomaly ? ANOMALY_COLOR : 'success.main', fontWeight: 600 }}>
                  {popupAnomaly ? tr('Below seasonal range', 'أقل من النطاق الموسمي') : tr('Normal', 'طبيعي')}
                </Box>
              </div>
            </Box>
          </Popup>
        )}
      </MapGL>

      {hover && hoverText(hover.id) && (
        <Box sx={{ position: 'absolute', left: hover.x + 14, top: hover.y + 14, zIndex: 600, px: 1, py: 0.5, pointerEvents: 'none', ...floatingPanelSx, bgcolor: 'rgba(33,33,33,0.85)', color: 'white' }}>
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, lineHeight: 1.3 }}>{hoverText(hover.id)!.title}</Typography>
          <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.3, opacity: 0.9 }}>{hoverText(hover.id)!.body}</Typography>
        </Box>
      )}

      {!indexMode && (
        <Box sx={{ position: 'absolute', bottom: 20, left: 20, zIndex: 500, p: 1.5, ...floatingPanelSx }}>
          <ModeLegend mode={mode} compareLabel={compareLabel} />
        </Box>
      )}
      {indexMode && <Box sx={{ position: 'absolute', bottom: 20, left: 20, zIndex: 500, p: 1.5, ...floatingPanelSx }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
          {INDEX_LABEL[index]} · {formatDate(date, isAr)}
        </Typography>
        <Box sx={{ width: 200, height: 10, borderRadius: 1, background: `linear-gradient(to right, ${RAMP.join(',')})` }} />
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
            {tr('Anomaly (NDVI < seasonal mean − 2σ)', 'شذوذ (NDVI أقل من المتوسط الموسمي − 2σ)')}
          </Typography>
        </Box>
      </Box>}
    </Box>
  );
}
