export interface TechCategory {
  id: string;
  name: string;
  nameAr: string;
  technologies: string[];
}

export const techCategories: TechCategory[] = [
  {
    id: 'gis-platforms',
    name: 'GIS Platforms',
    nameAr: 'منصات نظم المعلومات الجغرافية',
    technologies: ['ArcGIS', 'ArcGIS Online', 'QGIS', 'PostGIS', 'AutoCAD Map 3D'],
  },
  {
    id: 'web-mapping',
    name: 'Web Mapping',
    nameAr: 'خرائط الويب',
    technologies: ['Leaflet', 'Mapbox', 'Cesium', 'Three.js'],
  },
  {
    id: 'remote-sensing',
    name: 'Remote Sensing & AI',
    nameAr: 'الاستشعار عن بعد والذكاء الاصطناعي',
    technologies: ['Google Earth Engine', 'Pix4D', 'D3.js', 'Chart.js'],
  },
  {
    id: 'cad-bim',
    name: 'CAD & BIM',
    nameAr: 'التصميم بالحاسوب و BIM',
    technologies: ['Revit', 'Blender', 'Autodesk Civil 3D'],
  },
  {
    id: 'visualization',
    name: 'Visualization & BI',
    nameAr: 'العرض المرئي وذكاء الأعمال',
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
