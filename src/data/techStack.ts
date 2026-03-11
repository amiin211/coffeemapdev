export interface TechCategory {
  id: string;
  name: string;
  technologies: string[];
}

export const techCategories: TechCategory[] = [
  {
    id: 'gis-platforms',
    name: 'GIS Platforms',
    technologies: ['ArcGIS', 'ArcGIS Online', 'QGIS', 'PostGIS', 'AutoCAD Map 3D'],
  },
  {
    id: 'web-mapping',
    name: 'Web Mapping',
    technologies: ['Leaflet', 'Mapbox', 'Cesium', 'Three.js'],
  },
  {
    id: 'remote-sensing',
    name: 'Remote Sensing & AI',
    technologies: ['Google Earth Engine', 'Pix4D', 'D3.js', 'Chart.js'],
  },
  {
    id: 'cad-bim',
    name: 'CAD & BIM',
    technologies: ['Revit', 'Blender', 'Autodesk Civil 3D'],
  },
  {
    id: 'visualization',
    name: 'Visualization & BI',
    technologies: ['PowerBI', 'D3.js', 'Chart.js', 'Three.js'],
  },
];

export const allTechnologies = [
  'ArcGIS',
  'QGIS',
  'PostGIS',
  'Leaflet',
  'Mapbox',
  'Cesium',
  'Three.js',
  'Google Earth Engine',
  'D3.js',
  'Chart.js',
  'PowerBI',
  'Blender',
  'Revit',
  'Autodesk Civil 3D',
  'AutoCAD Map 3D',
  'Pix4D',
];
