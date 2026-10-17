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

const CATEGORY_LABELS: Record<string, { en: string; ar: string }> = {
  'enterprise-gis': { en: 'Enterprise GIS', ar: 'نظم معلومات جغرافية مؤسسية' },
  'web-mapping': { en: 'Web Mapping', ar: 'خرائط الويب' },
  'geoai': { en: 'GeoAI', ar: 'ذكاء جيومكاني' },
  'gis-bim': { en: 'GIS-BIM', ar: 'نظم المعلومات الجغرافية و BIM' },
};

export const getCategoryLabel = (category: string, locale: 'en' | 'ar' = 'en'): string =>
  CATEGORY_LABELS[category]?.[locale] ?? category;
