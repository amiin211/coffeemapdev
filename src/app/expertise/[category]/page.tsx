import { capabilities } from '@/data/capabilities';
import ExpertiseContent from './ExpertiseContent';

// Static export: one pre-built page per capability category.
export const dynamicParams = false;

export function generateStaticParams() {
  return capabilities.map((cap) => ({ category: cap.category }));
}

export default async function ExpertisePage({ params }: { params: Promise<{ category: string }> }) {
  return <ExpertiseContent category={(await params).category} />;
}
