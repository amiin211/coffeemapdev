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
  'enterprise-gis': { en: 'QA/QC & Data Quality', ar: 'ضبط الجودة' },
  'web-mapping': { en: 'Web Mapping', ar: 'خرائط الويب' },
  'geoai': { en: 'GeoAI', ar: 'ذكاء جيومكاني' },
  'gis-bim': { en: 'BIM & Digital Twins', ar: 'BIM والتوائم الرقمية' },
  humanitarian: { en: 'Humanitarian', ar: 'العمل الإنساني' },
  surveying: { en: 'Surveying & Geodesy', ar: 'المساحة والجيوديسيا' },
};

export const getCategoryLabel = (category: string, locale: 'en' | 'ar' = 'en'): string =>
  CATEGORY_LABELS[category]?.[locale] ?? category;
