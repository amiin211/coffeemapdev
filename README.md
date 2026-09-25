# CoffeeMap.dev

A geospatial engineering platform exploring how modern web technologies and GIS can work together to build practical spatial tools.

## About

CoffeeMap.dev is a small space for experimenting with geospatial engineering. It brings together web technologies and GIS to create clear, interactive tools from complex spatial data. It also collects ideas, notes, and small demos showing how geospatial systems can run directly in the browser.

## Features

- **Enterprise GIS** - Scalable geospatial infrastructure solutions
- **Web Mapping** - Interactive web mapping platforms
- **GeoAI & Remote Sensing** - Machine learning and satellite analysis
- **BIM & Infrastructure** - 3D infrastructure management

## Tech Stack

- Next.js 14
- React 18
- TypeScript
- Material UI (MUI)
- Leaflet, Mapbox, Cesium
- Google Earth Engine
- PostGIS

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Sudan Conflicts (ACLED)

`/projects/acled-conflict-dashboard` reads `public/data/acled_data.json`, built
from ACLED's *Sudan HRP political violence events and fatalities by month-year*
Excel export (events and fatalities per locality per month, joined to the COD
boundaries by pcode, from April 2023 on). To refresh it with a newer export:

```bash
node scripts/build-acled-data.mjs <path-to-xlsx>
```

## GeoAI Crop Monitoring

`/projects/geoai-crop-monitoring` reads `public/data/crop/fields.geojson` and
`public/data/crop/timeseries.json`, built from Sentinel-2 L2A on Microsoft
Planetary Computer for the polygon in `AOI.geojson`:

- **Fields** are detected automatically: centre pivots via a Hough transform
  on a multi-year max-NDVI composite, plus the remaining vegetated blocks.
- **NDVI / EVI** per field for every scene since April 2023 (SCL cloud-masked).
- **Crop type** per season from a rule-based phenology classifier.
- **Anomalies**: NDVI < seasonal mean − 2σ (same month, the field's other years).

The map's NDVI/EVI and true-colour layers are Planetary Computer tiles, so
they need no backend. To rebuild the data (resumable; scenes cache in `.cache/`):

```bash
~/.qgis_geoai/venv_py3.14/bin/python scripts/build-crop-data.py [AOI.geojson]
```

## Project Structure

```
src/
├── app/              # Next.js App Router pages
├── components/       # Reusable UI components
├── sections/         # Page sections
├── data/             # Static data
├── theme/            # MUI theme configuration
└── utils/            # Utility functions
```

## License

MIT
