Flood risk mapping for the Blue Nile, with no server behind it. Not even a small one.

I built a GeoAI flood-risk dashboard for Sennar and Gezira, Sudan, that runs entirely in the browser. The site is static files on shared hosting. No VPS, no backend, no Python or GDAL at runtime. Every raster is fetched from a public API, and every calculation happens on the visitor's device.

What the browser does:
→ Decodes elevation from terrain tiles (RGB → metres) and derives slope and height above the nearest river
→ Pulls Sentinel-1 radar (VV/VH) for a pre-flood and a flood date and detects new flood water by thresholding with change detection
→ Sums rainfall from 49 points in a single API call
→ Fetches the OpenStreetMap river network and runs an exact Euclidean distance transform over 1.2 million cells
→ Combines everything in a transparent weighted risk model, with sliders and a Recompute button

The stack:
• Next.js 14 · React 18 · TypeScript · Material UI
• MapLibre GL JS (WebGL) via react-map-gl
• Microsoft Planetary Computer (Sentinel-1 RTC, keyless) or Sentinel Hub / Copernicus Data Space (token)
• AWS Terrain Tiles / MapTiler Terrain-RGB
• Open-Meteo · Overpass API
• Typed arrays, Canvas 2D and createImageBitmap, with no GIS library in the bundle

The trick that removes the GIS stack: analyse on the Web Mercator pixel grid of one zoom level. Every tile pixel lands on exactly one cell, so there's no reprojection, and results drop onto the map as image overlays that line up perfectly.

For the record September 2020 flood, it detects ~172 km² of new flood water, and the full pipeline runs in about 13 seconds on a laptop.

Try it: https://coffeemap.dev/projects/blue-nile-flood-risk
Full write-up of the libraries and methods: https://coffeemap.dev/insights/blue-nile-flood-risk

#GeoAI #RemoteSensing #Sentinel1 #SAR #FloodMapping #WebGIS #MapLibre #JavaScript #TypeScript #OpenData #Sudan #GIS
