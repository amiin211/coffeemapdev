A crop-monitoring WebGIS with no server to run.

My GeoAI Crop Monitoring dashboard follows the centre-pivot farms of Al Jouf, Saudi Arabia, through every Sentinel-2 scene since April 2023: vegetation indices, crop type per season and anomaly alerts. Hosting it needs nothing but static files.

The idea: split the work in two.

1) An offline Python pipeline, run occasionally
→ pystac-client + planetary-computer to search and sign Sentinel-2 L2A scenes
→ Rasterio windowed reads from cloud-optimised GeoTIFFs, downloading only the pixels inside the area
→ OpenCV Hough circle transform plus a rim-contrast test to detect pivots automatically, with no training data
→ NumPy NDVI/EVI time series per field, cloud-masked with the Scene Classification Layer
→ A rule-based phenology classifier (winter cereal, summer crop, double crop, alfalfa, orchard, fallow)
→ Anomalies when a field falls below its peers' mean − 2σ (same crop, same season)
Output: two static files, fields.geojson and timeseries.json.

2) A static WebGIS in the browser
→ Next.js · React · TypeScript · Material UI
→ MapLibre GL JS for the fields and imagery, Chart.js for the time series
→ Live NDVI, EVI and true-colour tiles for any date, straight from Planetary Computer's tile API with band-math expressions

The heavy work runs once, not per visitor. The imagery stays live. No VPS, no database, no tile server to maintain.

Try it: https://coffeemap.dev/projects/geoai-crop-monitoring
Full write-up of the pipeline and libraries: https://coffeemap.dev/insights/al-jouf-crop-monitoring

#GeoAI #PrecisionAgriculture #Sentinel2 #RemoteSensing #Python #OpenCV #Rasterio #STAC #PlanetaryComputer #WebGIS #MapLibre #SaudiArabia
