'use client';

import Link from 'next/link';
import { Box, Button, Chip, Container, Paper, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AppLayout from '@/components/AppLayout';
import type { Block, FrontMatter, Inline } from '@/lib/markdown';
import { formatDate, useI18n } from '@/i18n';

function Inlines({ nodes }: { nodes: Inline[] }) {
  const { href } = useI18n();
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'text':
            return <span key={i}>{n.v}</span>;
          case 'b':
            return <strong key={i}><Inlines nodes={n.c} /></strong>;
          case 'i':
            return <em key={i}><Inlines nodes={n.c} /></em>;
          case 'code':
            return <code key={i} dir="ltr">{n.v}</code>;
          case 'a': {
            if (n.href.startsWith('mailto:')) return <a key={i} href={n.href}><Inlines nodes={n.c} /></a>;
            const external = /^https?:/.test(n.href);
            return external ? (
              <a key={i} href={n.href} target="_blank" rel="noopener noreferrer"><Inlines nodes={n.c} /></a>
            ) : (
              <Link key={i} href={href(n.href)}><Inlines nodes={n.c} /></Link>
            );
          }
        }
      })}
    </>
  );
}

function BlockView({ block }: { block: Block }) {
  switch (block.t) {
    case 'h':
      return block.level === 2 ? <h2><Inlines nodes={block.c} /></h2> : <h3><Inlines nodes={block.c} /></h3>;
    case 'p':
      return <p><Inlines nodes={block.c} /></p>;
    case 'img':
      return (
        <figure>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={block.src} alt={block.alt} loading="lazy" />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case 'ul':
      return <ul>{block.items.map((it, i) => <li key={i}><Inlines nodes={it} /></li>)}</ul>;
    case 'ol':
      return <ol>{block.items.map((it, i) => <li key={i}><Inlines nodes={it} /></li>)}</ol>;
    case 'code':
      return <pre dir="ltr"><code>{block.v}</code></pre>;
    case 'quote':
      return <blockquote><Inlines nodes={block.c} /></blockquote>;
    case 'hr':
      return <hr />;
    case 'table':
      return (
        <Box sx={{ overflowX: 'auto', mb: 3 }}>
          <table>
            <thead>
              <tr>{block.head.map((c, i) => <th key={i}><Inlines nodes={c} /></th>)}</tr>
            </thead>
            <tbody>
              {block.rows.map((r, i) => (
                <tr key={i}>{r.map((c, j) => <td key={j}><Inlines nodes={c} /></td>)}</tr>
              ))}
            </tbody>
          </table>
        </Box>
      );
  }
}

interface ArticleBodyProps {
  meta: FrontMatter;
  title: string;
  blocks: Block[];
  readingTime: string;
}

export default function ArticleBody({ meta, title, blocks, readingTime }: ArticleBodyProps) {
  const { locale, isAr, tr, href } = useI18n();
  const date = formatDate(meta.date, locale);
  return (
    <AppLayout>
      <Box sx={{ bgcolor: '#faf7f4', py: { xs: 3, md: 5 } }}>
        <Container maxWidth="md">
          <Button component={Link} href={href('/#insights')} startIcon={<ArrowBackIcon sx={{ transform: isAr ? 'scaleX(-1)' : undefined }} />} size="small" sx={{ mb: 2, textTransform: 'none', color: 'text.secondary', gap: 1 }}>
            {tr('All insights', 'كل المقالات')}
          </Button>

          <Paper elevation={1} sx={{ p: { xs: 3, md: 6 }, borderRadius: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap' }}>
              <Chip label={meta.category} size="small" sx={{ fontWeight: 600, bgcolor: 'accent.light', color: 'primary.main' }} />
              <Typography variant="caption" color="text.secondary">
                {date} · {tr(`${readingTime} read`, `قراءة ${readingTime}`)}{meta.author && <> · <b>{meta.author}</b></>}
              </Typography>
            </Stack>
            <Typography component="h1" sx={{ fontSize: { xs: '1.8rem', md: '2.5rem' }, fontWeight: 800, lineHeight: 1.2, mb: 1.5, fontFamily: 'Roboto, sans-serif' }}>
              {title}
            </Typography>

            <Box
              sx={{
                fontSize: '1.05rem',
                lineHeight: 1.8,
                color: '#2b2b2b',
                '& h2': { fontSize: '1.45rem', fontWeight: 700, mt: 5, mb: 1.5, lineHeight: 1.3 },
                '& h3': { fontSize: '1.15rem', fontWeight: 700, mt: 3.5, mb: 1 },
                '& p': { my: 0, mb: 2.25 },
                '& ul, & ol': { pl: 3, mt: 0, mb: 2.5 },
                '& li': { mb: 0.75 },
                '& a': { color: 'primary.main', fontWeight: 600 },
                '& code': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.88em', bgcolor: '#f2ece6', px: 0.6, py: 0.15, borderRadius: 0.75 },
                '& pre': { bgcolor: '#1f2328', color: '#e6edf3', p: 2, borderRadius: 1.5, overflowX: 'auto', mb: 2.5, fontSize: '0.85rem', lineHeight: 1.6 },
                '& pre code': { bgcolor: 'transparent', p: 0, color: 'inherit' },
                '& table': { width: '100%', borderCollapse: 'collapse', fontSize: '0.92rem' },
                '& th, & td': { textAlign: 'left', verticalAlign: 'top', p: 1, borderBottom: '1px solid #eee' },
                '& th': { bgcolor: '#f7f2ee', fontWeight: 700 },
                '& blockquote': { borderLeft: '4px solid', borderColor: 'primary.main', m: 0, mb: 2.5, pl: 2, color: 'text.secondary' },
                '& hr': { border: 0, borderTop: '1px solid #eee', my: 4 },
                '& > p:first-of-type': { fontSize: '1.2rem', color: 'text.secondary' },
                '& figure': { m: 0, mb: 3.5 },
                '& figure img': { display: 'block', width: '100%', height: 'auto', borderRadius: 1.5, border: '1px solid #eee' },
                '& figcaption': { mt: 1, fontSize: '0.88rem', lineHeight: 1.5, color: 'text.secondary' },
              }}
            >
              {blocks.map((b, i) => <BlockView key={i} block={b} />)}
            </Box>

            <Stack direction="row" spacing={1} sx={{ mt: 4, flexWrap: 'wrap', gap: 1 }}>
              {meta.tags.map((t) => <Chip key={t} label={t} size="small" variant="outlined" />)}
            </Stack>
          </Paper>
        </Container>
      </Box>
    </AppLayout>
  );
}
