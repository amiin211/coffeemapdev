import { capabilities } from '@/data/capabilities';
import FilterPage from './FilterPage';

// Static export: one pre-built page per capability category. The filter
// itself reads ?category= and ?tech= in the browser.
export const dynamicParams = false;

export function generateStaticParams() {
  return capabilities.map((cap) => ({ category: cap.category }));
}

export default function ProjectsFilterPage() {
  return <FilterPage />;
}
