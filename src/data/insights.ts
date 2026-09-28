export interface Insight {
  id: string;
  title: string;
  summary: string;
  category: string;
  date: string;
  href: string; // article page
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
];
