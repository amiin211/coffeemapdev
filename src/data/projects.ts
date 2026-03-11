export interface Project {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  image: string;
}

export const projects: Project[] = [
  {
    id: 'sudan-conflict-map',
    title: 'Sudan Conflict Map',
    description: 'Real-time humanitarian crisis mapping tracking conflict zones, displacement routes, and aid accessibility in Sudan.',
    category: 'geoai',
    tags: ['ArcGIS', 'QGIS', 'PostGIS', 'Leaflet'],
    image: '/images/project-1.jpg',
  },
  {
    id: '3w-humanitarian-mapping',
    title: '3W Humanitarian Mapping',
    description: 'Who What Where platform for visualizing humanitarian activities, resource allocation, and coverage gaps.',
    category: 'enterprise-gis',
    tags: ['ArcGIS Online', 'Dashboard', 'PowerBI'],
    image: '/images/project-2.jpg',
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
