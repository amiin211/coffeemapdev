export interface Capability {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  technologies: string[];
}

export const capabilities: Capability[] = [
  {
    id: 'enterprise-gis',
    title: 'Enterprise GIS',
    description: 'Scalable geospatial infrastructure solutions powered by ArcGIS and PostGIS for mission-critical operations.',
    icon: 'Map',
    category: 'enterprise-gis',
    technologies: ['ArcGIS', 'ArcGIS Online', 'ArcGIS Dashboards', 'QGIS', 'PostGIS', 'PowerBI'],
  },
  {
    id: 'web-mapping',
    title: 'Web Mapping',
    description: 'Interactive web mapping platforms using Leaflet, Mapbox, and Cesium for immersive data visualization.',
    icon: 'Public',
    category: 'web-mapping',
    technologies: ['Leaflet', 'Mapbox', 'Cesium', 'Three.js', 'D3.js', 'React'],
  },
  {
    id: 'geoai',
    title: 'GeoAI & Remote Sensing',
    description: 'Machine learning and satellite analysis using Google Earth Engine for actionable intelligence.',
    icon: 'Analytics',
    category: 'geoai',
    technologies: ['Google Earth Engine', 'Python', 'D3.js', 'Chart.js', 'Pix4D'],
  },
  {
    id: 'gis-bim',
    title: 'BIM & Infrastructure',
    description: 'Unified 3D infrastructure management bridging CAD, BIM (Revit), and GIS for digital twins.',
    icon: 'Architecture',
    category: 'gis-bim',
    technologies: ['Revit', 'Blender', 'Cesium', 'Three.js', 'Autodesk Civil 3D', 'AutoCAD Map 3D'],
  },
];
