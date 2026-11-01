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
| `/` | Home: introduction, services, featured projects, insights and contact |
| `/about` | About me, CoffeeMap.dev and consulting availability |
| `/expertise/[category]` | One service: what I deliver, who it is for, and the projects and articles that prove it |
| `/projects/[category]` | Project listing filtered by category |
| `/projects/sudan-flood-dashboard` | Sudan Flood Dashboard |
| `/projects/3w-humanitarian-mapping` | 3W Humanitarian Mapping |
| `/projects/acled-conflict-dashboard` | Sudan Conflicts (ACLED) |
| `/projects/geoai-crop-monitoring` | GeoAI Crop Monitoring |
| `/projects/riyadh-urban-heat` | Riyadh Urban Heat & Tree Canopy Equity |
| `/projects/3d-mosque-viewer` | 3D Mosque Viewer & 4D BIM |
| `/projects/serverless-geoai-architecture` | Serverless GeoAI Architecture |
| `/projects/geospatial-qaqc-workbench` | Geospatial QA/QC Workbench |
| `/insights/[slug]` | Insight articles |

The navigation bar links to Home, About, Services (`/#capabilities`) and Contact (`/#contact`).

---

## Services

The services I offer are defined in `src/data/capabilities.ts`. Each one has a page at `/expertise/<category>` with an introduction, deliverables, audience and tools, and links to the projects (`projectIds`) and articles (`insightIds`) that prove it:

| Category id | Service |
|---|---|
| `geoai` | **Satellite Analytics & GeoAI** — crop and water monitoring, urban heat and greening plans, change detection |
| `humanitarian` | **Humanitarian Information Management** — conflict analysis, 3W and response-gap mapping, situation dashboards |
| `web-mapping` | **WebGIS Dashboards & Apps** — bilingual dashboards on static hosting |
| `surveying` | **Surveying, Geodesy & Mapping** — control networks, GNSS and total station, drone photogrammetry, DTMs |
| `enterprise-gis` | **Geospatial QA/QC & Data Quality** — ISO 19157 quality control, sampling plans, training |
| `gis-bim` | **3D, BIM & Digital Twins** — 3D/4D site models with BIM data, schedules and costs |

---|---|---|---|
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

Sentinel‑2 crop monitoring for 181 irrigated fields in Al Jouf, Saudi Arabia. Centre‑pivot fields are detected automatically; NDVI / EVI time series, a rule‑based crop classification and anomaly alerts are computed per field offline, with index layers streamed from Microsoft Planetary Computer. In the browser (`src/lib/cropInsights.ts`) each date adds field health against same-crop peers (robust z-score), harvest and cutting detection, season phenology and vigour ranks, irrigation demand (Kc from NDVI × ET₀ from NASA POWER, Hargreaves), look-alike fields by NDVI correlation, map modes for health / change / water / crop, timeline playback and a written farm brief.

*Python · OpenCV · Rasterio · NumPy · STAC API · Planetary Computer · Sentinel‑2 · Next.js · MapLibre GL JS · Chart.js*

#### Riyadh Urban Heat & Tree Canopy Equity — *GeoAI*
`/projects/riyadh-urban-heat`

A fully client-side urban heat island and tree canopy equity analysis for Riyadh. The browser fetches Landsat 8/9 land surface temperature and Sentinel-2 NDVI (Planetary Computer), ESA WorldCover land cover, OpenStreetMap trees and parks (Overpass) and NASA POWER air climate, then on a ~70 m grid:

- finds heat hotspots with k-means clustering of urban surface temperature;
- builds a tree canopy raster from NDVI, WorldCover and OSM trees, and measures distance to canopy and parks with exact distance transforms;
- scores **tree canopy equity = vegetation access − heat exposure** for every built-up cell;
- runs a TensorFlow.js heat-risk model (land surface temperature, building density, lack of vegetation) with adjustable weights, and flags the top 15% of cells as priority planting zones;
- summarizes focus districts (Ishbiliyah, Al-Malaz, Al-Murabba, Ad-Diriyah, Wadi Hanifa, eastern districts);
- fits a least-squares cooling model to the loaded city (surface temperature against cell canopy, canopy within 300 m, building density and elevation) and writes a city brief;
- runs a greening simulator (`src/lib/urbanCooling.ts`): auto-sites a tree budget on the highest heat-risk × lack-of-access cells, or places street trees, pocket parks and cool roofs by clicking the map, then reports cooling, canopy, priority zones, equity, water, indicative cost and progress toward Green Riyadh targets.

*Landsat 8/9 · Sentinel-2 · TensorFlow.js · MapLibre GL JS · Planetary Computer · ESA WorldCover · NASA POWER · Overpass API · Next.js · TypeScript*

#### 3D Mosque Viewer & 4D BIM — *BIM & Infrastructure*
`/projects/3d-mosque-viewer`

An interactive 3D environment of a mosque site in Aseer, Saudi Arabia. The mosque model is colored per mesh; the ground switches between grass and a 0.5 m DTM draped with the site orthophoto. Trees, palms, site traffic and parked cars fill the scene, and it switches between a daytime HDRI sky and night lighting (pole lights and floodlights). It opens in terrain mode at night.

Every one of the 674 Revit-derived elements is clickable: it highlights and opens a BIM properties panel (English / Arabic names, IFC class, UniFormat code, level and zone, construction, Saudi Building Code and SASO references, U-values, quantities measured from the geometry, indicative SAR costs, Gregorian / Hijri install dates, warranty and maintenance). The model opens coloured by BIM category (walls, windows, doors, roofs, domes, lighting, site structures and more, with a legend), and a button switches back to realistic colours. The full schedule downloads as CSV. The BIM data is illustrative, generated for the Saudi market by `scripts/build-bim-data.mjs`, because the model itself only kept Revit names.

*Three.js · BIM · Revit · glTF · WebGL · DTM · GDAL · Next.js · TypeScript*

#### Serverless GeoAI Architecture — *GeoAI*
`/projects/serverless-geoai-architecture`

An interactive diagram of how the GeoAI dashboards run with no VPS, database or Python at runtime: compute in the browser, or precompute once and stream imagery.

#### Geospatial QA/QC Workbench — *Enterprise GIS*
`/projects/geospatial-qaqc-workbench`

A hands-on guide to checking delivered geospatial data against its specification, for four products: orthoimage mosaics, elevation models (DTM / DSM), topographic vector data and land cover maps. Each workflow step (receive, automated checks, sample review, accuracy test, decide and report) shows what to check, how to do it in ArcGIS Pro, QGIS and code (GDAL, Python, PostGIS SQL), the ISO 19157-1 quality element and an example tolerance, with an illustrated gallery of typical errors. Calculators cover ISO 2859-1 sample sizes, RMSE / CE90 / LE90 from check points, and land cover confusion matrices. It is a self-contained page in `public/projects-static/`, embedded in an iframe.

*ISO 19157-1 · ISO 2859-1 · ArcGIS Pro · QGIS · PostGIS · GDAL · Python*

### Insights

Articles listed on the home page (`src/data/insights.ts`), written in Markdown in `content/articles/` and rendered to static pages at `/insights/<slug>`:

- Serverless GeoAI: The Architecture Behind CoffeeMap.dev
- Where Riyadh Needs Trees Most
- Crop Monitoring for Al Jouf Without a Server
- A Practical QA/QC Workbench for Geospatial Data
- Reading Sudan's Conflict Data: Surges, Hotspots and Trends in the Browser
- Finding the Gaps in Sudan's Humanitarian Response
- From Drone Survey to Handover: a 4D BIM Mosque in the Browser

---

## Data sources

| Source | Used by | Access |
|---|---|---|
| OCHA humanitarian data (floods, cholera, 3W) | Sudan Flood Dashboard, 3W Mapping | Prebuilt JSON in `public/data/` |
| ACLED Sudan political violence export | Sudan Conflicts | Prebuilt `public/data/acled_data.json` |
| Sudan COD administrative boundaries (admin 1–2) | Sudan dashboards | `public/data/sdn_admin*.geojson` |
| Sentinel‑2 L2A (ESA Copernicus) via Microsoft Planetary Computer | GeoAI Crop Monitoring | Prebuilt field data + live index tiles |
| AWS Terrain Tiles (Terrarium) / MapTiler Terrain‑RGB | Riyadh Urban Heat | Live tiles |
| Landsat 8/9 C2 L2 surface temperature, Sentinel‑2 L2A, ESA WorldCover via Planetary Computer | Riyadh Urban Heat | Live, keyless mosaic tiles |
| NASA POWER daily point API | Riyadh Urban Heat, GeoAI Crop Monitoring | Live, keyless (crop falls back to an Al Jouf ET₀ climatology) |
| OpenStreetMap via Overpass API | Riyadh Urban Heat | Live, with bundled snapshot fallbacks |
| Aseer mosque model, DTM and orthophoto | 3D Mosque Viewer | Static assets in `public/data/3d/` |
| OpenStreetMap / MapLibre demotiles basemaps | All maps | Live tiles |

---

## Technology

**Framework:** Next.js 16 (App Router), React 19, TypeScript

**UI:** Material UI (MUI) 5 with Emotion; Roboto typography; per‑dashboard color themes (UN blue, agricultural green, and others)

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
│   │   ├── urban-heat/       # OSM trees and parks snapshots for Riyadh Urban Heat
│   │   └── *.json / *.geojson
│   └── images/               # Project card thumbnails
├── scripts/                  # Offline data builders (see below)
├── src/
│   ├── app/                  # Next.js routes (home, about, expertise, projects/*)
│   ├── components/           # Shared layout, cards, and per-dashboard maps / charts / panels
│   ├── data/                 # Site content: projects, capabilities, insights, tech stack
│   ├── lib/                  # Client-side engines (geoRaster.ts shared raster tools, urbanHeat.ts, urbanCooling.ts, cropInsights.ts, mosqueEnvironment.ts, mosqueBim.ts)
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
| `NEXT_PUBLIC_MAPTILER_KEY` | Riyadh Urban Heat uses MapTiler Terrain‑RGB instead of AWS Terrain Tiles |
| `NEXT_PUBLIC_AI_URL` | Enables the optional AI assistant on Sudan Conflicts (Cloudflare Worker in `workers/ai-gateway/`) |

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
