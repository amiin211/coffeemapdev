export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  categoryLabel?: string; // card tag, when more specific than the category's name
  tags: string[];
  image: string;
  externalUrl: string; // project page, or an absolute URL for an external demo
}

export const projects: Project[] = [
  {
    id: 'sudan-flood-dashboard',
    title: 'Sudan Flood Dashboard',
    description: 'Interactive humanitarian dashboard tracking flood crisis, displacement, and disease outbreaks across Sudan states using real OCHA data.',
    category: 'web-mapping',
    tags: ['Next.js', 'TypeScript', 'MapLibre GL JS', 'Chart.js', 'Material UI', 'GeoJSON', 'OCHA Data'],
    image: '/images/flood.png',
    externalUrl: '/projects/sudan-flood-dashboard',
  },
  {
    id: '3w-humanitarian-mapping',
    title: '3W Humanitarian Mapping',
    description: 'Who What Where dashboard tracking Sudan humanitarian activities, active partners, and coverage gaps using real OCHA 3W response monitoring data.',
    category: 'web-mapping',
    tags: ['Next.js', 'TypeScript', 'MapLibre GL JS', 'Chart.js', 'Material UI', 'Node.js', 'GeoJSON', 'OCHA 3W Data'],
    image: '/images/3w.png',
    externalUrl: '/projects/3w-humanitarian-mapping',
  },
  {
    id: 'acled-conflict-dashboard',
    title: 'Sudan Conflicts',
    description: 'Conflict monitoring dashboard mapping ACLED political violence events and fatalities across Sudan since April 2023, by state, locality and month.',
    category: 'web-mapping',
    tags: ['Next.js', 'TypeScript', 'MapLibre GL JS', 'Chart.js', 'Material UI', 'Node.js', 'GeoJSON', 'ACLED Data'],
    image: '/images/acled.png',
    externalUrl: '/projects/acled-conflict-dashboard',
  },
  {
    id: 'geoai-crop-monitoring',
    title: 'GeoAI Crop Monitoring',
    description: 'Sentinel-2 crop monitoring for irrigated farms in Al Jouf, Saudi Arabia — auto-detected centre pivots, NDVI/EVI time series, crop classification and anomaly alerts.',
    category: 'geoai',
    categoryLabel: 'GeoAI - Agriculture',
    tags: ['Python', 'OpenCV', 'Rasterio', 'NumPy', 'STAC API', 'Planetary Computer', 'Sentinel-2', 'Next.js', 'TypeScript', 'MapLibre GL JS', 'Chart.js'],
    image: '/images/crop.png',
    externalUrl: '/projects/geoai-crop-monitoring',
  },
  {
    id: 'serverless-geoai-architecture',
    title: 'Serverless GeoAI Architecture',
    description: 'Interactive architecture of the GeoAI dashboards: two live routes (compute in the browser, or precompute once and stream imagery) and a planned third for trained models, with no VPS, database or Python at runtime.',
    category: 'geoai',
    tags: ['Architecture', 'Serverless GeoAI', 'Planetary Computer', 'STAC', 'MapLibre GL JS', 'TensorFlow.js', 'ONNX Runtime Web', 'Static hosting'],
    image: '/images/serverless-architecture.png',
    externalUrl: '/projects/serverless-geoai-architecture',
  },
  {
    id: 'blue-nile-flood-risk',
    title: 'Blue Nile Flood Risk',
    description: 'Client-side GeoAI flood risk mapping for Sennar and Gezira, Sudan — Sentinel-1 SAR flood detection, DEM slope, rainfall and river distance combined in an adjustable risk model, all computed in the browser.',
    category: 'geoai',
    categoryLabel: 'GeoAI - Hydrology',
    tags: ['Sentinel-1 SAR', 'MapLibre GL JS', 'Planetary Computer', 'Sentinel Hub', 'Open-Meteo', 'Overpass API', 'Next.js', 'TypeScript'],
    image: '/images/flood-risk.png',
    externalUrl: '/projects/blue-nile-flood-risk',
  },
  {
    id: 'riyadh-urban-heat',
    title: 'Riyadh Urban Heat & Tree Canopy Equity',
    description: 'Client-side GeoAI for Riyadh — Landsat surface temperature hotspots, Sentinel-2 NDVI and tree canopy, OSM trees and parks, a TensorFlow.js heat-risk model and canopy-equity priority zones for planting, all computed in the browser.',
    category: 'geoai',
    categoryLabel: 'GeoAI - Environment',
    tags: ['Landsat 8/9', 'Sentinel-2', 'TensorFlow.js', 'MapLibre GL JS', 'Planetary Computer', 'ESA WorldCover', 'NASA POWER', 'Overpass API', 'Next.js', 'TypeScript'],
    image: '/images/urban-heat.png',
    externalUrl: '/projects/riyadh-urban-heat',
  },
  {
    id: '3d-mosque-viewer',
    title: '3D Mosque Viewer',
    description: 'Interactive 3D environment of a mosque site in Aseer, Saudi Arabia — clickable BIM data for every Revit element (Saudi codes, quantities, SAR costs, lifecycle), DTM terrain with orthophoto, live traffic and day / night lighting.',
    category: 'gis-bim',
    tags: ['Three.js', 'BIM', 'Revit', 'glTF', 'WebGL', 'DTM', 'GDAL', 'Next.js', 'TypeScript'],
    image: '/images/3d.png',
    externalUrl: '/projects/3d-mosque-viewer',
  },
];
