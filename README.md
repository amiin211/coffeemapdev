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

- Next.js 16
- React 19
- TypeScript
- Material UI (MUI)
- MapLibre GL JS (via react-map-gl) for all web maps
- Three.js (3D Mosque Viewer)
- Chart.js, TensorFlow.js
- Microsoft Planetary Computer, Overpass, Open-Meteo, NASA POWER (client-side data)

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

## Riyadh Urban Heat & Tree Canopy Equity

`/projects/riyadh-urban-heat` maps urban heat and tree canopy equity for Riyadh
(46.4–47.4° E, 24.3–25.0° N), entirely client-side (`src/lib/urbanHeat.ts`, shared raster
tools in `src/lib/geoRaster.ts`) on a ~70 m Web Mercator grid (zoom 11):

- **Heat:** Landsat 8/9 Collection 2 surface temperature (band 10 → °C) and **NDVI** from
  Sentinel-2 L2A (2022+ offset corrected), least-cloudy mosaics from Planetary Computer.
- **Land cover:** ESA WorldCover 2021 (building density, tree cover, urban mask).
- **OSM:** trees (`natural=tree`) and parks (`leisure=park`) via Overpass, starting from the
  snapshots in `public/data/urban-heat/` and swapping in the live result.
- **Air climate:** NASA POWER daily air temperature and solar radiation.
- **Model:** k-means heat hotspots; exact distance transforms to tree canopy and parks;
  vegetation access vs heat exposure gives **equity = access − heat**; a TensorFlow.js
  heat-risk model (w1·LST + w2·building density + w3·(1 − NDVI)); priority zones are the top 15%
  of built-up cells by risk × (1 − access). District summaries for Ishbiliyah, Al-Malaz,
  Al-Murabba, Ad-Diriyah, Wadi Hanifa and eastern districts.

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

- BIM: click any of the 674 Revit elements for its properties, or download the schedule as CSV.
  The model opens coloured by BIM category (with a legend); a button switches to realistic colours.
  The GLB only kept Revit names (family, type, element ID), so `public/data/3d/bim.json` is an
  **illustrative** Saudi-market dataset: SBC / SASO references, construction, U-values,
  quantities measured from the geometry, indicative SAR costs, levels, zones, Hijri dates:

  ```bash
  node scripts/build-bim-data.mjs
  ```

The local `3d/` folder stays git-ignored because of its multi-GB source rasters.

## License

MIT
