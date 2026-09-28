export interface Insight {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  href?: string; // article page; cards without one are not yet written
}

export const insights: Insight[] = [
  {
    id: 'serverless-geoai-architecture',
    title: 'Serverless GeoAI: The Architecture Behind CoffeeMap.dev',
    summary: 'How three satellite dashboards run with no VPS, no database and no Python at runtime: two routes, six patterns and one rule for where each computation belongs.',
    category: 'geoai',
    date: '2026-09-28',
    href: '/insights/serverless-geoai-architecture',
  },
  {
    id: 'blue-nile-flood-risk',
    title: 'Flood Risk Mapping on the Blue Nile, Entirely in the Browser',
    summary: 'Sentinel-1 radar, terrain tiles, rainfall and OpenStreetMap rivers become a flood-risk screening model for Sennar and Gezira, with no server at all.',
    category: 'geoai',
    date: '2026-09-28',
    href: '/insights/blue-nile-flood-risk',
  },
  {
    id: 'riyadh-urban-heat',
    title: 'Where Riyadh Needs Trees Most',
    summary: 'Landsat heat, Sentinel-2 vegetation, WorldCover and OpenStreetMap on a 1.6-million-cell grid, client-side, to rank the blocks where one more tree matters most.',
    category: 'geoai',
    date: '2026-09-28',
    href: '/insights/riyadh-urban-heat',
  },
  {
    id: 'al-jouf-crop-monitoring',
    title: 'Crop Monitoring for Al Jouf Without a Server',
    summary: 'Centre-pivot detection, NDVI/EVI time series, crop classification and anomaly alerts, built offline in Python and served as static files plus live tiles.',
    category: 'geoai',
    date: '2026-09-28',
    href: '/insights/al-jouf-crop-monitoring',
  },
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
