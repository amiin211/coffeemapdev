---
title: "Serverless GeoAI: The Architecture Behind CoffeeMap.dev"
date: 2026-10-31
author: Amin Adnan Gasim
category: GeoAI
readingTime: 9 min
description: "How my satellite and humanitarian dashboards for Saudi Arabia and Sudan run with no VPS, no database and no Python at runtime: two routes, seven patterns and one rule for deciding where each computation belongs."
tags: [architecture, serverless GeoAI, remote sensing, MapLibre, Planetary Computer, STAC, static hosting]
---

# Serverless GeoAI: The Architecture Behind CoffeeMap.dev

*Two routes, seven patterns and one rule for deciding where each computation runs*

**My dashboards on CoffeeMap.dev, urban heat and greening in Riyadh, crop and water monitoring in Al Jouf, and conflict and response-gap analysis for Sudan, run with no VPS, no database and no Python at runtime. The site is static files on shared hosting. The heavy lifting happens in three places I don't operate or pay for per request: public tile servers, an occasional offline script, and the visitor's own browser.**

---

## The constraint that shaped everything

Most geospatial web apps follow the same shape: a server with GDAL, a database with PostGIS, a tile server and something to keep them all running. That is a lot of infrastructure for a single analyst, an NGO team or a field office with a weak connection and no IT department.

So I set one rule for every project: **no server of mine at runtime.** Anything the page needs must be a static file I host, a public API anyone can call, or code that runs on the visitor's device.

The articles on each project describe *what* they do. This one describes the architecture they share, and the one decision that splits them into two routes.

## The architecture at a glance

![Serverless GeoAI architecture: public data sources feed two routes, live in the browser and precompute once, which both deliver through static hosting to the visitor's browser.](/images/articles/serverless-geoai-architecture.png)

[Explore the interactive version of this diagram →](/projects/serverless-geoai-architecture)

The diagram has four layers:

1. **Public data.** Microsoft Planetary Computer (Sentinel-2, Landsat, ESA WorldCover), terrain tiles (AWS Terrarium, MapTiler), NASA POWER weather, OpenStreetMap through Overpass, and humanitarian datasets from ACLED and OCHA. All are keyless.
2. **Two compute routes.** Route A computes everything live in the browser. Route B precomputes once, offline, and streams imagery live.
3. **Static hosting.** A Next.js static export: HTML, JavaScript, JSON and bundled snapshots.
4. **The visitor's browser.** MapLibre GL draws the map, Chart.js the charts, and results are painted to a canvas that overlays the map exactly.

## The one decision: where does this computation belong?

Every calculation in these projects answers one question first:

> **If it depends on the visitor's settings, compute it in the browser. If it is the same for everyone, compute it once and ship it as a file.**

| Question | Route A: live in the browser | Route B: precompute once |
| --- | --- | --- |
| Does the result change with user input (dates, weights, budgets, filters)? | Yes | No, or only the display changes |
| How much data per view? | Dozens of tiles or a compact JSON file | Years of scenes × thousands of fields |
| Time per view | Seconds | Would be hours; done once instead |
| Where the heavy maths runs | Tile server band math + the visitor's device | My laptop, occasionally |
| What the host serves | The app | The app + small JSON/GeoJSON files |
| Projects | Riyadh Urban Heat, Sudan Conflicts, 3W Response Gaps | GeoAI Crop Monitoring |

The line is not always between projects. Crop monitoring precomputes its time series once (Route B), then computes field health, harvest detection and water demand in the browser for whichever date the visitor picks (Route A).

## Route A: live in the browser

Riyadh Urban Heat recomputes everything on each visit, so visitors can change dates, model weights or a tree budget and see the result in seconds. Four patterns make that possible without a single GIS library in the bundle.

### Pattern 1: Band math on the tile server

Planetary Computer's data API evaluates an expression on its own servers and returns a PNG tile. I use that to do the unit conversion upstream and receive values the browser only has to unpack:

```
# Landsat Collection 2 surface temperature to °C
expression = lwir11*0.00341802+149.0-273.15
rescale    = 10,70

# Sentinel-2 NDVI, with the +1000 offset of baseline 04.00 removed
expression = (B08-B04)/(B08+B04-2000)
rescale    = -1,1
```

`rescale` maps the physical range onto the 0–255 byte of a PNG channel. The browser reverses it. The precision cost is small and knowable: about 0.24 °C for temperature and 0.008 for NDVI, both finer than the sensors' own noise.

### Pattern 2: Decode exactly

Browsers colour-manage images by default, which is perfect for photos and silently wrong for data. Every data tile is decoded with colour conversion and alpha premultiplication switched off:

```ts
const bitmap = await createImageBitmap(blob, {
  colorSpaceConversion: 'none',
  premultiplyAlpha: 'none',
});
```

Terrain tiles use the same path, with their own decode formulas (Terrarium: h = R × 256 + G + B / 256 − 32768).

### Pattern 3: The tile grid is the analysis grid

This is the decision that removes the GIS stack. Instead of choosing a projection and resampling into it, the analysis runs on the **Web Mercator pixel grid of one zoom level**, the same grid the map tiles already use. For Riyadh that is zoom 11: cells of about 70 m, 1,456 × 1,117 of them, 1.6 million in all.

Every tile pixel lands on exactly one cell: no reprojection library, no resampling. Layers live in typed arrays (`Float32Array`, `Uint8Array`), a dozen layers at a time, comfortably inside browser memory. When a result is ready, it is painted to a canvas and added to MapLibre as an image source with four corner coordinates, and it lines up perfectly.

### Pattern 4: Algorithms that scale linearly

With a million cells, anything slower than linear time is noticeable. The workhorses are:

- **Exact Euclidean distance transforms** (Felzenszwalb & Huttenlocher) in two 1-D passes: distance to parks or tree canopy.
- **Separable box blurs with running sums:** neighbourhood shares such as canopy within a 300 m walk.
- **k-means with quantile initialisation:** repeatable heat hotspots.
- **Least squares by the normal equations:** a five-term regression over every second built-up cell learns how much canopy cools Riyadh's surface, in a fraction of a second.
- **TensorFlow.js as a GPU engine:** scoring 1.6 million cells as one matrix product through WebGL, loaded only on the page that needs it.

The greening simulator reuses all of them. A new plan changes canopy in some cells; one blur gives the neighbourhood change, one distance transform the new distance to shade, and the fitted model the cooling. Re-scoring the whole city takes under a second.

### Pattern 5: Statistics on compact tables

Route A is not only for rasters. Sudan Conflicts and the 3W Response Gap Explorer run on JSON files of under 150 kilobytes: one row per locality and month, with numbers instead of repeated names. Small Node scripts build them from the ACLED export and the OCHA 3W dataset.

Everything analytical then happens in the browser, because it depends on the visitor's filters: Poisson z-scores for surges against each locality's own baseline, Getis-Ord Gi* hotspots, a priority index whose weights are sliders, and a simulation of what coverage would be lost if one partner left. None of it needs a server, and none of it needs an AI model; the optional AI assistant on Sudan Conflicts only explains numbers the browser has already computed.

## Route B: precompute once, stream live

Crop monitoring in Al Jouf follows 181 fields through 442 Sentinel-2 scene dates since April 2023. That is far too much work to repeat for each visitor, and the time series is the same for everyone. So the work is split.

### Pattern 6: Offline pipeline, static outputs

An offline Python pipeline, run occasionally, does the heavy lifting. Three libraries carry it, each with one job: **Rasterio fetches the pixels, NumPy does the maths, OpenCV sees the shapes.**

| Library | Its job | What it does in the Al Jouf pipeline |
| --- | --- | --- |
| **Rasterio** | Read rasters with their georeferencing | Windowed reads of Sentinel-2 cloud-optimised GeoTIFFs over HTTP: only the rectangle over Al Jouf, band by band (B02, B04, B08 and the SCL cloud mask), never the whole scene. Every array stays tied to real-world coordinates. |
| **NumPy** | Maths on whole images at once | Removes the +1000 offset and scales reflectance to 0–1, computes NDVI and EVI for every pixel, applies the cloud mask, builds the maximum-NDVI composite, and uses `np.bincount` to average every field's pixels in one pass. No loops over pixels or fields. |
| **OpenCV** | Computer vision: find shapes in an image | Treats the NDVI composite like a photo: `HoughCircles` finds round pivots, morphology cleans noisy green areas, `connectedComponentsWithStats` separates vegetation blocks, and `findContours` with `approxPolyDP` turns them into polygon outlines. |

They hand off in one chain, with **pystac-client** finding the scenes first and **Shapely** and **pyproj** turning shapes into mapped polygons:

```
pystac-client  find Sentinel-2 scenes in the STAC catalogue
  → Rasterio   read only the Al Jouf window of each band
  → NumPy      NDVI, EVI, cloud mask, maximum-NDVI composite
  → OpenCV     detect centre pivots and block fields
  → Shapely + pyproj   polygons, areas, WGS 84
  → NumPy      mean NDVI/EVI per field, per date
  → fields.geojson + timeseries.json
```

Results are cached, so a rerun only processes new scenes. The two output files are uploaded next to the app like any other asset. None of these libraries ever runs on the website; the browser only receives what they produce.

One honest note: OpenCV here is **classical computer vision**, hand-tuned rules with no training data. It works well because centre pivots are near-perfect circles. The next step is a trained segmentation model for irregular and sector-shaped fields, with the Hough detector as the baseline to beat.

### Pattern 7: Keep the imagery live, and the date-dependent analysis in the browser

The pipeline stores numbers, not pictures. When a visitor moves the time slider, the map asks Planetary Computer for that date's NDVI, EVI or true-colour tile, rendered with band math and a colour map on the tile server. The site never stores a single satellite image, yet every date is one request away.

What depends on the chosen date is computed in the browser from the two static files: each field's health against fields of the same crop, harvest and cutting events, season phenology, and irrigation demand from NDVI-based crop coefficients and NASA POWER weather. It runs for all 181 fields in milliseconds.

## Designing for the real internet

Public services are free, not guaranteed. Four habits keep the dashboards working:

- **Snapshots first, live second.** The Riyadh page ships bundled OpenStreetMap snapshots of trees and parks and swaps in live Overpass data when a mirror answers. During development I saw 504 errors and an 85-second response.
- **Have a fallback for every live input.** If NASA POWER is unreachable, crop water demand falls back to a monthly evapotranspiration climatology for Al Jouf, and the page says which one it used.
- **Say when there is no data.** When a date window has no clear scenes, the page reports it instead of drawing an empty map.
- **Pay for heavy libraries only where they are used.** TensorFlow.js, Three.js and map components load on their own pages only.

## What this architecture is not good at

Being honest about the trade-offs is part of the design:

- **National scale.** A browser handles a few million cells, not a country at 10 m. That work belongs in Route B.
- **Someone else's uptime.** If Planetary Computer or Overpass is down, Route A waits. Snapshots and fallbacks soften this; they don't remove it.
- **Rate limits and fair use.** Keyless APIs are shared. A popular page must cache responsibly and respect each service's terms.
- **Proprietary or sensitive data.** Everything the browser receives, a visitor can see. Confidential data needs a different design.
- **Device variety.** A laptop takes seconds; an old phone takes longer. Grids and zoom levels are chosen with that in mind.

## What's next: Route C, trained models in the browser

Today, most "models" in these projects are transparent rules, weighted indices and simple regressions fitted on the fly. That is deliberate for screening tools, but the next step is trained models, and the architecture already has a place for them:

1. **Train offline** on open benchmarks and hand-labelled local data (a field-boundary segmentation network, a crop-type classifier).
2. **Export to ONNX** and quantise to a few megabytes.
3. **Ship the model as a static file,** like any other asset.
4. **Run inference in the browser** with ONNX Runtime Web on WebGPU, falling back to WebAssembly.

Training is Route B; inference is Route A. The rule stays the same: no server of mine at runtime.

## The projects

- [Riyadh Urban Heat](/projects/riyadh-urban-heat): heat exposure, tree canopy equity and a greening simulator across 1.6 million cells. [Read the article](/insights/riyadh-urban-heat).
- [GeoAI Crop Monitoring](/projects/geoai-crop-monitoring): centre pivots, crop types, field health and water demand in Al Jouf. [Read the article](/insights/al-jouf-crop-monitoring).
- [Sudan Conflicts](/projects/acled-conflict-dashboard): surges, hotspots and trends from ACLED data. [Read the article](/insights/acled-conflict-analytics).
- [3W Humanitarian Mapping](/projects/3w-humanitarian-mapping): response gaps and partner-exit scenarios. [Read the article](/insights/3w-response-gap-explorer).

If you run a team that needs satellite or humanitarian analysis without infrastructure to maintain, for agriculture, urban planning or response coordination, I am available for consulting: [info@coffeemap.dev](mailto:info@coffeemap.dev).

---

*Data: Copernicus Sentinel-2 (ESA), Landsat 8/9 (USGS) and ESA WorldCover via Microsoft Planetary Computer; AWS Terrain Tiles; MapTiler; NASA POWER; ACLED; OCHA; © OpenStreetMap contributors.*
