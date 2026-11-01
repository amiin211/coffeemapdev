// Articles are Markdown files in content/articles/<slug>.md (Arabic in
// content/articles/ar/<slug>.md), read at build time by the /insights/[slug]
// pages (server-side only).
import fs from 'fs';
import path from 'path';
import { Block, FrontMatter, parseFrontMatter, parseMarkdown } from '@/lib/markdown';

const ARTICLES_DIR = path.join(process.cwd(), 'content', 'articles');

export interface Article {
  slug: string;
  meta: FrontMatter;
  title: string;
  blocks: Block[];
  readingTime: string;
}

export function articleSlugs(locale: 'en' | 'ar' = 'en'): string[] {
  return fs.readdirSync(locale === 'ar' ? path.join(ARTICLES_DIR, 'ar') : ARTICLES_DIR).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
}

export function getArticle(slug: string, locale: 'en' | 'ar' = 'en'): Article | null {
  const file = path.join(ARTICLES_DIR, locale === 'ar' ? 'ar' : '', `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const { meta, body } = parseFrontMatter(fs.readFileSync(file, 'utf8'));
  const { title, blocks } = parseMarkdown(body);
  const words = body.split(/\s+/).filter(Boolean).length;
  return {
    slug,
    meta,
    title: title ?? meta.title,
    blocks,
    readingTime: meta.readingTime ?? `${Math.max(1, Math.round(words / 220))} min`,
  };
}
