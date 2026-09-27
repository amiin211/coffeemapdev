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

## Blue Nile Flood Risk

`/projects/blue-nile-flood-risk` is a client-side GeoAI flood risk model for the Blue Nile
in Sennar and Gezira, Sudan (32–35° E, 12–15° N). There is no backend: everything is
fetched from public APIs and processed in the browser (`src/lib/floodRisk.ts`) on a ~300 m
Web Mercator grid (zoom 9), so results overlay the map with no resampling.

- **DEM:** AWS Terrain Tiles (Terrarium), or MapTiler Terrain-RGB when `NEXT_PUBLIC_MAPTILER_KEY`
  is set. RGB is decoded to elevation, then slope is derived; MapLibre draws the hillshade.
- **SAR:** Sentinel-1 VV/VH gamma0 for a pre-flood and a flood date, keyless from Microsoft
  Planetary Computer (RTC mosaic tiles), or the Sentinel Hub / Copernicus Data Space Process
  API with a token or client credentials entered in the page (never stored). Read at ~150 m;
  water = VV and VH below the thresholds, flood = water that was not water before.
- **Rainfall:** Open-Meteo historical daily precipitation on a 7 × 7 lattice, interpolated.
- **Rivers:** OpenStreetMap `waterway=river` via Overpass (mirrors tried in turn). The page
  starts from `public/data/flood-risk/rivers-osm.geojson` and swaps in the live result.
  Distance to river uses an exact Euclidean distance transform.
- **Risk:** weighted mean of low height above river, flat slope, river proximity, relative
  rainfall and the SAR water share, binned into Low / Medium / High / Very High. Thresholds
  and weights are adjustable; **Recompute Risk** reruns the model.

## 3D Mosque Viewer

`/projects/3d-mosque-viewer` is a Three.js scene (`src/lib/mosqueEnvironment.ts`,
ported from the standalone `~/environment` Vite project) with assets in `public/data/3d/`:

- Mosque GLB with colors assigned per mesh name; grass ground with a hole under the site.
- Terrain mode: the Aseer DTM as a displacement map with `ortho2.jpg` draped on it.
  `dtm16.png` is a 16-bit (R * 256 + G) encoding of the DTM so the ~449 m relief doesn't terrace:

  ```bash
  python3 scripts/build-dtm16.py "3d/data/Aseer - DTM.tif" public/data/3d/dtm16.png
  ```

- Trees and palms, site traffic on a `CatmullRomCurve3` loop, and parked cars.
- Day (HDRI sky) / night (dark sky, pole and flood point lights) and grass / terrain toggles;
  it opens in terrain mode at night (`START_IN_TERRAIN` / `START_AT_NIGHT` in `CONFIG`).

The local `3d/` folder stays git-ignored because of its multi-GB source rasters.

## License

MIT
