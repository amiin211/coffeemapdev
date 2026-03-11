export interface Insight {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
}

export const insights: Insight[] = [
  {
    id: 'integrating-bim-into-web-gis',
    title: 'Integrating BIM into Web GIS',
    summary: 'Exploring methodologies for seamlessly bridging Building Information Models with web-based geospatial platforms to create digital twins.',
    category: 'gis-bim',
    date: '2024-01-15',
  },
  {
    id: 'satellite-ndvi-monitoring',
    title: 'Satellite NDVI Monitoring with Earth Engine',
    summary: 'Leveraging Google Earth Engine for large-scale vegetation analysis and drought assessment agricultural regions in.',
    category: 'geoai',
    date: '2024-01-10',
  },
  {
    id: 'scalable-webgis-platforms',
    title: 'Building Scalable WebGIS Platforms',
    summary: 'Architecture patterns and best practices for developing high-performance, scalable web mapping applications.',
    category: 'web-mapping',
    date: '2024-01-05',
  },
  {
    id: 'postgis-spatial-indexing',
    title: 'PostGIS Spatial Indexing Strategies',
    summary: 'Optimizing spatial queries with advanced indexing techniques for enterprise GIS applications.',
    category: 'enterprise-gis',
    date: '2023-12-20',
  },
];
