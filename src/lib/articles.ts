// Articles are Markdown files in content/articles/<slug>.md, read at build
// time by the /insights/[slug] pages (server-side only).
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

export function articleSlugs(): string[] {
  return fs.readdirSync(ARTICLES_DIR).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
}

export function getArticle(slug: string): Article | null {
  const file = path.join(ARTICLES_DIR, `${slug}.md`);
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
