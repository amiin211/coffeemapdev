export interface Capability {
  id: string;
  title: string;
  description: string;
  titleAr: string;
  descriptionAr: string;
  icon: string;
  category: string;
  technologies: string[];
}

export const capabilities: Capability[] = [
  {
    id: 'enterprise-gis',
    title: 'Enterprise GIS',
    description: 'Scalable geospatial infrastructure solutions powered by ArcGIS and PostGIS for mission-critical operations.',
    titleAr: 'نظم المعلومات الجغرافية المؤسسية',
    descriptionAr: 'بنية جيومكانية قابلة للتوسع مبنية على ArcGIS وPostGIS للعمليات الحرجة.',
    icon: 'Map',
    category: 'enterprise-gis',
    technologies: ['ArcGIS', 'ArcGIS Online', 'ArcGIS Dashboards', 'QGIS', 'PostGIS', 'PowerBI'],
  },
  {
    id: 'web-mapping',
    title: 'Web Mapping',
    description: 'Interactive web mapping platforms using Leaflet, Mapbox, and Cesium for immersive data visualization.',
    titleAr: 'الخرائط التفاعلية على الويب',
    descriptionAr: 'منصات خرائط تفاعلية على الويب باستخدام Leaflet وMapbox وCesium لعرض البيانات بأسلوب غامر.',
    icon: 'Public',
    category: 'web-mapping',
    technologies: ['Leaflet', 'Mapbox', 'Cesium', 'Three.js', 'D3.js', 'React'],
  },
  {
    id: 'geoai',
    title: 'GeoAI & Remote Sensing',
    description: 'Machine learning and satellite analysis using Google Earth Engine for actionable intelligence.',
    titleAr: 'الذكاء الجيومكاني والاستشعار عن بعد',
    descriptionAr: 'تعلّم الآلة وتحليل صور الأقمار الصناعية باستخدام Google Earth Engine لاستخلاص معلومات قابلة للتنفيذ.',
    icon: 'Analytics',
    category: 'geoai',
    technologies: ['Google Earth Engine', 'Python', 'D3.js', 'Chart.js', 'Pix4D'],
  },
  {
    id: 'gis-bim',
    title: 'BIM & Infrastructure',
    description: 'Unified 3D infrastructure management bridging CAD, BIM (Revit), and GIS for digital twins.',
    titleAr: 'نمذجة معلومات البناء والبنية التحتية',
    descriptionAr: 'إدارة موحّدة للبنية التحتية ثلاثية الأبعاد تربط CAD وBIM (Revit) ونظم المعلومات الجغرافية لبناء التوائم الرقمية.',
    icon: 'Architecture',
    category: 'gis-bim',
    technologies: ['Revit', 'Blender', 'Cesium', 'Three.js', 'Autodesk Civil 3D', 'AutoCAD Map 3D'],
  },
];
