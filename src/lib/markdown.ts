// A small Markdown parser for the articles in content/articles: front matter,
// headings, paragraphs, lists, fenced code, tables, block quotes, and inline
// bold / italic / code / links. It returns plain data (serialisable from a
// server component to the client renderer, components/ArticleBody.tsx).

export type Inline =
  | { t: 'text'; v: string }
  | { t: 'b'; c: Inline[] }
  | { t: 'i'; c: Inline[] }
  | { t: 'code'; v: string }
  | { t: 'a'; href: string; c: Inline[] };

export type Block =
  | { t: 'h'; level: 2 | 3; c: Inline[] }
  | { t: 'img'; src: string; alt: string; caption?: string }
  | { t: 'p'; c: Inline[] }
  | { t: 'ul' | 'ol'; items: Inline[][] }
  | { t: 'code'; v: string }
  | { t: 'table'; head: Inline[][]; rows: Inline[][][] }
  | { t: 'quote'; c: Inline[] }
  | { t: 'hr' };

export interface FrontMatter {
  title: string;
  description: string;
  date: string;
  author?: string;
  category: string;
  readingTime?: string;
  tags: string[];
}

// Front matter: simple YAML between --- fences. Values may be quoted or bare
// strings, or [a, b] lists of quoted or bare items.
export function parseFrontMatter(source: string): { meta: FrontMatter; body: string } {
  const match = source.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) throw new Error('Article is missing front matter');
  const unquote = (v: string) => v.trim().replace(/^(["'])(.*)\1$/, '$2');
  const meta: Record<string, unknown> = { tags: [] };
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const value = kv[2].trim();
    meta[kv[1]] = value.startsWith('[') ? value.slice(1, -1).split(',').map(unquote).filter(Boolean) : unquote(value);
  }
  return { meta: meta as unknown as FrontMatter, body: source.replace(/\r\n/g, '\n').slice(match[0].length) };
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  // Order matters: code first (its content is literal), then links, bold, italic.
  const re = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;
  let last = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    if (m.index > last) out.push({ t: 'text', v: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: 'code', v: m[1] });
    else if (m[2] !== undefined) out.push({ t: 'a', href: m[3], c: parseInline(m[2]) });
    else if (m[4] !== undefined) out.push({ t: 'b', c: parseInline(m[4]) });
    else out.push({ t: 'i', c: parseInline(m[5]) });
    last = re.lastIndex;
  }
  if (last < text.length) out.push({ t: 'text', v: text.slice(last) });
  return out;
}

const tableCells = (line: string) => line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());

// Parses the article body. A leading `# Title` is returned separately (the
// page renders it as the heading), and HTML comments are dropped.
export function parseMarkdown(source: string): { title: string | null; blocks: Block[] } {
  const body = source.replace(/\r\n/g, '\n').replace(/<!--[\s\S]*?-->/g, '');
  const lines = body.split('\n');
  let title: string | null = null;
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }

    const h1 = line.match(/^#\s+(.*)$/);
    if (h1) {
      if (title === null && !blocks.length) title = h1[1].trim();
      else blocks.push({ t: 'h', level: 2, c: parseInline(h1[1]) });
      i++;
      continue;
    }
    const img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/);
    if (img) {
      blocks.push({ t: 'img', alt: img[1], src: img[2], caption: img[3] });
      i++;
      continue;
    }
    if (line.startsWith('```')) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      blocks.push({ t: 'code', v: code.join('\n') });
      i++;
      continue;
    }
    const h = line.match(/^(#{2,3})\s+(.*)$/);
    if (h) {
      blocks.push({ t: 'h', level: h[1].length as 2 | 3, c: parseInline(h[2]) });
      i++;
      continue;
    }
    if (/^---+\s*$/.test(line)) { blocks.push({ t: 'hr' }); i++; continue; }
    if (line.startsWith('|')) {
      const rows: string[] = [];
      for (; i < lines.length && lines[i].startsWith('|'); i++) rows.push(lines[i]);
      const [head, , ...rest] = rows; // second row is the |---| separator
      blocks.push({ t: 'table', head: tableCells(head).map(parseInline), rows: rest.map((r) => tableCells(r).map(parseInline)) });
      continue;
    }
    if (/^[-*] /.test(line) || /^\d+\. /.test(line)) {
      const ordered = /^\d+\. /.test(line);
      const items: Inline[][] = [];
      for (; i < lines.length && (ordered ? /^\d+\. /.test(lines[i]) : /^[-*] /.test(lines[i])); i++) {
        items.push(parseInline(lines[i].replace(/^([-*]|\d+\.) /, '')));
      }
      blocks.push({ t: ordered ? 'ol' : 'ul', items });
      continue;
    }
    if (line.startsWith('> ')) {
      const quote: string[] = [];
      for (; i < lines.length && lines[i].startsWith('> '); i++) quote.push(lines[i].slice(2));
      blocks.push({ t: 'quote', c: parseInline(quote.join(' ')) });
      continue;
    }
    const para: string[] = [];
    for (; i < lines.length && lines[i].trim() && !/^(```|#{1,3}\s|!\[|\||[-*] |\d+\. |> )/.test(lines[i]); i++) para.push(lines[i].trim());
    blocks.push({ t: 'p', c: parseInline(para.join(' ')) });
  }
  return { title, blocks };
}
