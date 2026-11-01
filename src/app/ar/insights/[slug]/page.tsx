import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleBody from '@/components/ArticleBody';
import { articleSlugs, getArticle } from '@/lib/articles';

// Arabic articles: content/articles/ar/<slug>.md, rendered at build time.
export const dynamicParams = false;

export function generateStaticParams() {
  return articleSlugs('ar').map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = getArticle((await params).slug, 'ar');
  if (!article) return {};
  return {
    title: `${article.meta.title} | CoffeeMap.dev`,
    description: article.meta.description,
    openGraph: { title: article.meta.title, description: article.meta.description, type: 'article', locale: 'ar', publishedTime: article.meta.date, authors: article.meta.author ? [article.meta.author] : undefined },
  };
}

export default async function InsightPageAr({ params }: { params: Promise<{ slug: string }> }) {
  const article = getArticle((await params).slug, 'ar');
  if (!article) notFound();
  return <ArticleBody meta={article.meta} title={article.title} blocks={article.blocks} readingTime={article.readingTime} />;
}
