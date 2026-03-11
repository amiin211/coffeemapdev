import { Project } from '@/data/projects';
import { Insight } from '@/data/insights';

export const filterProjectsByCategory = (
  projects: Project[],
  category: string | null
): Project[] => {
  if (!category) return projects;
  return projects.filter((project) => project.category === category);
};

export const filterInsightsByCategory = (
  insights: Insight[],
  category: string | null
): Insight[] => {
  if (!category) return insights;
  return insights.filter((insight) => insight.category === category);
};

export const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    'enterprise-gis': 'Enterprise GIS',
    'web-mapping': 'Web Mapping',
    'geoai': 'GeoAI',
    'gis-bim': 'GIS-BIM',
  };
  return labels[category] || category;
};
