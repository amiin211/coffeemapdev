export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  image: string;
  externalUrl?: string;
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
    category: 'enterprise-gis',
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
    tags: ['Python', 'OpenCV', 'Rasterio', 'NumPy', 'STAC API', 'Planetary Computer', 'Sentinel-2', 'Next.js', 'TypeScript', 'MapLibre GL JS', 'Chart.js'],
    image: '/images/crop.png',
    externalUrl: '/projects/geoai-crop-monitoring',
  },
  {
    id: 'infrastructure-conflict-webgis',
    title: 'Infrastructure Conflict Detection WebGIS',
    description: 'Web-based platform for detecting and visualizing infrastructure conflicts in urban development projects.',
    category: 'web-mapping',
    tags: ['Mapbox', 'Three.js', 'PostGIS', 'React'],
    image: '/images/project-3.jpg',
  },
  {
    id: 'satellite-drought-monitoring',
    title: 'Satellite Drought Monitoring',
    description: 'NDVI and vegetation index analysis using Google Earth Engine for agricultural early warning systems.',
    category: 'geoai',
    tags: ['Google Earth Engine', 'Python', 'D3.js'],
    image: '/images/project-4.jpg',
  },
  {
    id: '3d-bim-infrastructure-viewer',
    title: '3D BIM Infrastructure Viewer',
    description: 'Web-based 3D viewer integrating Revit models with geospatial context for infrastructure management.',
    category: 'gis-bim',
    tags: ['Cesium', 'Revit', 'Three.js', 'Blender'],
    image: '/images/project-5.jpg',
  },
  {
    id: 'arcgis-online-dashboard',
    title: 'ArcGIS Online Infrastructure Dashboard',
    description: 'Enterprise dashboard for monitoring and managing civil infrastructure assets across multiple regions.',
    category: 'enterprise-gis',
    tags: ['ArcGIS Online', 'ArcGIS Dashboards', 'PostGIS'],
    image: '/images/project-6.jpg',
  },
];
