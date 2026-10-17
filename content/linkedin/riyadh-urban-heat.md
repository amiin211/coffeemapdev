Where does Riyadh need trees most? I asked the browser.

Summer surface temperatures in Riyadh pass 50 °C, but the heat isn't shared equally. My new dashboard scores every block of the city for tree canopy equity: how much vegetation residents can reach, compared with how much heat they face. It runs entirely client-side, with no VPS, no backend and no database.

Inside the browser:
→ Landsat 8/9 land surface temperature, converted to °C by server-side band math and decoded pixel by pixel
→ Sentinel-2 NDVI and ESA WorldCover land cover on a 70 m grid of 1.6 million cells
→ OpenStreetMap trees and parks, plus NASA POWER air temperature and solar radiation
→ k-means clustering to find heat hotspots
→ Exact distance transforms to the nearest tree canopy and park
→ A TensorFlow.js heat-risk model (surface temperature, building density, lack of vegetation) running on the GPU through WebGL
→ Priority planting zones: the top 15% of the city by risk × poor access

Summer 2025 results:
• Mean urban surface temperature 49.2 °C
• Urban tree canopy ~5%
• 216 km² of priority planting zones
• As-Sulayy (east) hottest at 50.4 °C; Ad-Diriyah coolest at 47.3 °C with over 25% canopy
• By day the city is slightly cooler than the surrounding desert (−0.6 °C), which is why the analysis compares districts within the city

The stack: Next.js 14 · React · TypeScript · Material UI · MapLibre GL JS · TensorFlow.js · Microsoft Planetary Computer · ESA WorldCover · NASA POWER · Overpass API

Try it: https://coffeemap.dev/projects/riyadh-urban-heat
How it works, library by library: https://coffeemap.dev/insights/riyadh-urban-heat

#GeoAI #UrbanHeatIsland #Riyadh #SaudiArabia #TensorFlowJS #RemoteSensing #Landsat #Sentinel2 #WebGIS #MapLibre #ClimateAdaptation #GreenRiyadh
