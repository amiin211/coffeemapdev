export type ThreeWMetric = 'activities' | 'orgs' | 'clusters';

export const metricLabels: Record<ThreeWMetric, string> = {
  activities: 'Activities',
  orgs: 'Organizations',
  clusters: 'Clusters',
};

export const metricLabelsAr: Record<ThreeWMetric, string> = {
  activities: 'الأنشطة',
  orgs: 'المنظمات',
  clusters: 'القطاعات',
};

// Humanitarian clusters and organization types as named in the 3W data.
const CLUSTERS_AR: Record<string, string> = {
  'Coordination and Common Services': 'التنسيق والخدمات المشتركة',
  Education: 'التعليم',
  'Emergency Telecommunications': 'اتصالات الطوارئ',
  'Food Security and Livelihoods': 'الأمن الغذائي وسبل العيش',
  Health: 'الصحة',
  Logistics: 'اللوجستيات',
  'Multi-Purpose Cash': 'النقد متعدد الأغراض',
  Nutrition: 'التغذية',
  Protection: 'الحماية',
  'Refugee Consultative Forum': 'المنتدى التشاوري للاجئين',
  'Shelter and NFIs': 'المأوى والمواد غير الغذائية',
  'Site Management': 'إدارة المواقع',
  WASH: 'المياه والصرف الصحي والنظافة',
};

const ORG_TYPES_AR: Record<string, string> = {
  NNGO: 'منظمة وطنية',
  INGO: 'منظمة دولية',
  'UN Agency': 'وكالة أممية',
  'Red Cross': 'الصليب الأحمر',
};

export const clusterLabel = (cluster: string, ar: boolean) => (ar ? CLUSTERS_AR[cluster] ?? cluster : cluster);
export const orgTypeLabel = (type: string, ar: boolean) => (ar ? ORG_TYPES_AR[type] ?? type : type);
