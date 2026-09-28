# CoffeeMap.dev

> *Brewing Data into Actionable Geospatial Insights. Because great ideas often begin with a cup.*

CoffeeMap.dev is a geospatial engineering platform and portfolio. It explores how modern web technologies and GIS can work together to turn complex spatial data into clear, interactive tools, and it collects ideas, notes and working demos showing how geospatial systems can run directly in the browser.

The site is built by **Amin Adnan Gasim**, a Sudanese geospatial engineer based in Saudi Arabia with over 10 years of experience in GIS, remote sensing and spatial data systems. Amin has worked with organizations such as UNEP, UN‑Habitat and UNOPS on infrastructure, environmental monitoring and emergency response projects. The work focuses on practical, data‑driven geospatial solutions.

---

## Contents

1. [Site map](#site-map)
2. [Expertise areas](#expertise-areas)
3. [Projects](#projects)
4. [Data sources](#data-sources)
5. [Technology](#technology)
6. [Repository structure](#repository-structure)
7. [Data build scripts](#data-build-scripts)
8. [Running the site](#running-the-site)
9. [Conventions for new projects](#conventions-for-new-projects)
10. [Contact](#contact)

---

## Site map

| Route | Page |
|---|---|
| `/` | Home: introduction, expertise (capabilities), featured projects, insights and contact |
| `/about` | About CoffeeMap.dev and its author |
| `/expertise/[category]` | Projects and insights for one expertise area |
| `/projects/[category]` | Project listing filtered by category |
| `/projects/sudan-flood-dashboard` | Sudan Flood Dashboard |
| `/projects/3w-humanitarian-mapping` | 3W Humanitarian Mapping |
| `/projects/acled-conflict-dashboard` | Sudan Conflicts (ACLED) |
| `/projects/geoai-crop-monitoring` | GeoAI Crop Monitoring |
| `/projects/blue-nile-flood-risk` | Blue Nile Flood Risk |
| `/projects/riyadh-urban-heat` | Riyadh Urban Heat & Tree Canopy Equity |
| `/projects/3d-mosque-viewer` | 3D Mosque Viewer |
| `/projects/serverless-geoai-architecture` | Serverless GeoAI Architecture |
| `/insights/[slug]` | Insight articles |

The navigation bar links to Home, About, Expertise (`/#capabilities`) and Contact (`/#contact`).

---

## Expertise areas

Projects and insights are grouped into four categories (`src/data/capabilities.ts`):

| Category id | Area | Focus | Typical tools |
|---|---|---|---|
| `enterprise-gis` | **Enterprise GIS** | Scalable geospatial infrastructure for mission-critical operations | ArcGIS, ArcGIS Online, ArcGIS Dashboards, QGIS, PostGIS, Power BI |
| `web-mapping` | **Web Mapping** | Interactive web mapping platforms and data visualization | Leaflet, Mapbox / MapLibre, Cesium, Three.js, D3.js, React |
| `geoai` | **GeoAI & Remote Sensing** | Machine learning and satellite analysis for actionable intelligence | Google Earth Engine, Python, Planetary Computer, Pix4D |
| `gis-bim` | **BIM & Infrastructure** | 3D infrastructure management bridging CAD, BIM and GIS for digital twins | Revit, Blender, Cesium, Three.js, Civil 3D, AutoCAD Map 3D |

---

## Projects

### Live dashboards

#### Sudan Flood Dashboard — *Web Mapping*
`/projects/sudan-flood-dashboard`

An interactive humanitarian dashboard of the 2024 rainy-season floods and the cholera outbreak that followed, from OCHA's Flash Update No. 04 (5 September 2024) and Federal Ministry of Health figures. A MapLibre choropleth of people affected (or cholera cases) by state with proportional cholera circles and hover figures; clicking a state (on the map, in the ranked state list or in a chart) zooms to it, outlines its localities, highlights the flood-affected ones and switches the stat tiles, details panel and housing chart to that state.

*Next.js · TypeScript · MapLibre GL JS · Chart.js · Material UI · GeoJSON · OCHA data*

#### 3W Humanitarian Mapping — *Web Mapping*
`/projects/3w-humanitarian-mapping`

A *Who does What Where* dashboard of Sudan's humanitarian response: activities, active partners and coverage gaps from OCHA 3W response monitoring data. Selecting a state fades the others and shows its admin‑2 (locality) boundaries.

*Next.js · TypeScript · MapLibre GL JS · Chart.js · Material UI · Node.js · OCHA 3W data*

#### Sudan Conflicts (ACLED) — *Web Mapping*
`/projects/acled-conflict-dashboard`

Conflict monitoring that maps ACLED political violence events and fatalities across Sudan since April 2023, by state, locality and month, with filters and trend charts.

*Next.js · TypeScript · MapLibre GL JS · Chart.js · Material UI · Node.js · ACLED data*

#### GeoAI Crop Monitoring — *GeoAI*
`/projects/geoai-crop-monitoring`

Sentinel‑2 crop monitoring for irrigated farms in Al Jouf, Saudi Arabia. Centre‑pivot fields are detected automatically; NDVI / EVI time series, a rule‑based crop classification and anomaly alerts are computed per field, with index layers streamed from Microsoft Planetary Computer.

*Python · OpenCV · Rasterio · NumPy · STAC API · Planetary Computer · Sentinel‑2 · Next.js · MapLibre GL JS · Chart.js*

#### Blue Nile Flood Risk — *GeoAI*
`/projects/blue-nile-flood-risk`

A fully client‑side GeoAI flood risk model for the Blue Nile in Sennar and Gezira, Sudan (32–35° E, 12–15° N). With no backend, the browser:

- decodes elevation from terrain tiles and derives slope and height above the nearest river;
- fetches Sentinel‑1 VV/VH radar for a pre‑flood and a flood date (keyless from Planetary Computer, or Sentinel Hub / Copernicus Data Space with a token) and detects new flood water by thresholding with change detection;
- sums recent rainfall from Open‑Meteo;
- fetches the OpenStreetMap river network from Overpass and runs an exact distance transform;
- combines everything in a transparent weighted risk model (Low / Medium / High / Very High).

Users can change the dates, radar thresholds and model weights, recompute the map, and click any cell to inspect its values. It defaults to the record flood of September 2020.

*Sentinel‑1 SAR · MapLibre GL JS · Planetary Computer · Sentinel Hub · Open‑Meteo · Overpass API · Next.js · TypeScript*

#### Riyadh Urban Heat & Tree Canopy Equity — *GeoAI*
`/projects/riyadh-urban-heat`

A fully client-side urban heat island and tree canopy equity analysis for Riyadh. The browser fetches Landsat 8/9 land surface temperature and Sentinel-2 NDVI (Planetary Computer), ESA WorldCover land cover, OpenStreetMap trees and parks (Overpass) and NASA POWER air climate, then on a ~70 m grid:

- finds heat hotspots with k-means clustering of urban surface temperature;
- builds a tree canopy raster from NDVI, WorldCover and OSM trees, and measures distance to canopy and parks with exact distance transforms;
- scores **tree canopy equity = vegetation access − heat exposure** for every built-up cell;
- runs a TensorFlow.js heat-risk model (land surface temperature, building density, lack of vegetation) with adjustable weights, and flags the top 15% of cells as priority planting zones;
- summarizes focus districts (Ishbiliyah, Al-Malaz, Al-Murabba, Ad-Diriyah, Wadi Hanifa, eastern districts).

*Landsat 8/9 · Sentinel-2 · TensorFlow.js · MapLibre GL JS · Planetary Computer · ESA WorldCover · NASA POWER · Overpass API · Next.js · TypeScript*

#### 3D Mosque Viewer — *BIM & Infrastructure*
`/projects/3d-mosque-viewer`

An interactive 3D environment of a mosque site in Aseer, Saudi Arabia. The mosque model is colored per mesh; the ground switches between grass and a 0.5 m DTM draped with the site orthophoto. Trees, palms, site traffic and parked cars fill the scene, and it switches between a daytime HDRI sky and night lighting (pole lights and floodlights). It opens in terrain mode at night.

Every one of the 674 Revit-derived elements is clickable: it highlights and opens a BIM properties panel (English / Arabic names, IFC class, UniFormat code, level and zone, construction, Saudi Building Code and SASO references, U-values, quantities measured from the geometry, indicative SAR costs, Gregorian / Hijri install dates, warranty and maintenance). The model opens coloured by BIM category (walls, windows, doors, roofs, domes, lighting, site structures and more, with a legend), and a button switches back to realistic colours. The full schedule downloads as CSV. The BIM data is illustrative, generated for the Saudi market by `scripts/build-bim-data.mjs`, because the model itself only kept Revit names.

*Three.js · BIM · Revit · glTF · WebGL · DTM · GDAL · Next.js · TypeScript*

#### Serverless GeoAI Architecture — *GeoAI*
`/projects/serverless-geoai-architecture`

An interactive diagram of how the GeoAI dashboards run with no VPS, database or Python at runtime: compute in the browser, or precompute once and stream imagery.

### Insights

Articles listed on the home page (`src/data/insights.ts`), written in Markdown in `content/articles/` and rendered to static pages at `/insights/<slug>`:

- Serverless GeoAI: The Architecture Behind CoffeeMap.dev
- Flood Risk Mapping on the Blue Nile, Entirely in the Browser
- Where Riyadh Needs Trees Most
- Crop Monitoring for Al Jouf Without a Server

---

## Data sources

| Source | Used by | Access |
|---|---|---|
| OCHA humanitarian data (floods, cholera, 3W) | Sudan Flood Dashboard, 3W Mapping | Prebuilt JSON in `public/data/` |
| ACLED Sudan political violence export | Sudan Conflicts | Prebuilt `public/data/acled_data.json` |
| Sudan COD administrative boundaries (admin 1–2) | Sudan dashboards | `public/data/sdn_admin*.geojson` |
| Sentinel‑2 L2A (ESA Copernicus) via Microsoft Planetary Computer | GeoAI Crop Monitoring | Prebuilt field data + live index tiles |
| Sentinel‑1 RTC via Microsoft Planetary Computer | Blue Nile Flood Risk | Live, keyless mosaic tiles |
| Sentinel Hub / Copernicus Data Space Process API | Blue Nile Flood Risk (optional) | Live, user‑supplied token |
| AWS Terrain Tiles (Terrarium) / MapTiler Terrain‑RGB | Blue Nile Flood Risk, Riyadh Urban Heat | Live tiles |
| Landsat 8/9 C2 L2 surface temperature, Sentinel‑2 L2A, ESA WorldCover via Planetary Computer | Riyadh Urban Heat | Live, keyless mosaic tiles |
| NASA POWER daily point API | Riyadh Urban Heat | Live, keyless |
| Open‑Meteo historical weather API | Blue Nile Flood Risk | Live, keyless |
| OpenStreetMap via Overpass API | Blue Nile Flood Risk, Riyadh Urban Heat | Live, with bundled snapshot fallbacks |
| Aseer mosque model, DTM and orthophoto | 3D Mosque Viewer | Static assets in `public/data/3d/` |
| OpenStreetMap / MapLibre demotiles basemaps | All maps | Live tiles |

---

## Technology

**Framework:** Next.js 16 (App Router), React 19, TypeScript

**UI:** Material UI (MUI) 5 with Emotion; Roboto typography; per‑dashboard color themes (UN blue, agricultural green, water blue)

**Mapping & 3D:** MapLibre GL JS through `react-map-gl` for every map, Three.js for 3D; label glyphs self-hosted in `public/fonts/`, and the MapLibre web worker copied into `public/maplibre/` before dev and build (`scripts/copy-maplibre-worker.mjs`)

**Charts:** Chart.js through `react-chartjs-2`

**Client-side ML:** TensorFlow.js (core + WebGL / CPU backends)

**Data tooling (offline):** Node.js scripts, Python with GDAL, Rasterio, NumPy and OpenCV

**Wider expertise showcased:** ArcGIS / ArcGIS Online, QGIS, PostGIS, Google Earth Engine, Cesium, Mapbox, D3.js, Power BI, Revit, Blender, Civil 3D, AutoCAD Map 3D, Pix4D

---

## Repository structure

```
.
├── public/
│   ├── data/                 # Prebuilt datasets and static assets per project
│   │   ├── 3d/               # Mosque GLB, BIM data, DTM heightmap, orthophoto, models, HDRI
│   │   ├── crop/             # Crop fields GeoJSON and index time series
│   │   ├── flood-risk/       # OSM rivers snapshot for Blue Nile Flood Risk
│   │   ├── urban-heat/       # OSM trees and parks snapshots for Riyadh Urban Heat
│   │   └── *.json / *.geojson
│   └── images/               # Project card thumbnails
├── scripts/                  # Offline data builders (see below)
├── src/
│   ├── app/                  # Next.js routes (home, about, expertise, projects/*)
│   ├── components/           # Shared layout, cards, and per-dashboard maps / charts / panels
│   ├── data/                 # Site content: projects, capabilities, insights, tech stack
│   ├── lib/                  # Client-side engines (geoRaster.ts shared raster tools, floodRisk.ts, urbanHeat.ts, mosqueEnvironment.ts, mosqueBim.ts)
│   ├── theme/                # MUI theme, fonts and dashboard color palettes
│   └── utils/                # Data helpers per dashboard and category filters
├── README.md
└── COFFEEMAP.md              # This document
```

The local `3d/` folder (the standalone Vite viewer and its multi‑GB source rasters) is git‑ignored.

---

## Data build scripts

| Script | Purpose |
|---|---|
| `node scripts/build-acled-data.mjs <xlsx>` | Builds `acled_data.json` from an ACLED Sudan export, joined to COD boundaries by pcode |
| `node scripts/build-threew-data.mjs <csv>` | Builds `threew_data.json` from an OCHA 3W response monitoring CSV |
| `python scripts/build-crop-data.py [AOI.geojson]` | Detects centre pivots and builds crop fields and NDVI / EVI time series from Sentinel‑2 |
| `node scripts/build-bim-data.mjs` | Builds the illustrative Saudi-market BIM dataset (`public/data/3d/bim.json`) for the 3D Mosque Viewer |
| `python3 scripts/build-dtm16.py <dtm.tif> <out.png>` | Encodes the Aseer DTM as a 16‑bit (R·256 + G) heightmap PNG for the 3D viewer |

---

## Running the site

```bash
npm install        # install dependencies
npm run dev        # development server on http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run typecheck  # TypeScript check
npm run lint       # ESLint
```

Optional environment variable:

| Variable | Effect |
|---|---|
| `NEXT_PUBLIC_MAPTILER_KEY` | Blue Nile Flood Risk uses MapTiler Terrain‑RGB instead of AWS Terrain Tiles |

---

## Conventions for new projects

1. Add an entry to `src/data/projects.ts` (`id`, `title`, `description`, `category`, `tags`, `image`, `externalUrl`). The card links to `externalUrl`.
2. Create the page at `src/app/projects/<id>/page.tsx`, wrapped in `AppLayout` with a `DashboardHeader` (title, subtitle, icon, source, author, date, gradient).
3. Load map components with `next/dynamic` and `ssr: false`; MapLibre and Three.js need the browser.
4. Put heavy processing in `src/lib/` and prebuilt data in `public/data/<project>/`.
5. Add a thumbnail at `public/images/<name>.png` and a short section to `README.md`.
6. Dashboards use a desktop layout (stat tiles, a sidebar of controls, a map) and a stacked mobile layout.

---

## Contact

- **Email:** [info@coffeemap.dev](mailto:info@coffeemap.dev)
- **X:** [@coffeemapdev](https://x.com/coffeemapdev)
- **LinkedIn:** [amiin211](https://linkedin.com/in/amiin211)
- **GitHub:** [amiin211](https://github.com/amiin211)

© 2026 CoffeeMap.dev. All rights reserved.
