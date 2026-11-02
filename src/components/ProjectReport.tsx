'use client';

// A4 report for any dashboard, saved as PDF through the browser's print
// dialog (vector text, real Arabic shaping, selectable and searchable).
//
// Structure (the criteria every project report follows):
//   1. Header band: project title and subtitle, author, site.
//   2. Scope: what this report covers (period, area, filters, data as of).
//   3. Summary and key findings, written from the numbers on screen.
//   4. Key figures as tiles.
//   5. Figures: a snapshot of the map exactly as configured, with legend and caption.
//   6. Tables of the ranked results behind the findings.
//   7. Method, limitations, and sources with licences and attribution.
//   8. Footer: generated date, link back to the live dashboard, contact.
// The same DOM is the on-screen preview and the print target: everything
// else on the page is hidden by @media print while it is open.

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Box, Button, Typography } from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import CloseIcon from '@mui/icons-material/Close';
import { useI18n } from '@/i18n';

export interface ReportTable {
  title: string;
  columns: string[];
  rows: (string | number)[][];
  numeric?: boolean[]; // right-align (end-align) these columns
  note?: string;
}

export interface ReportFigure {
  image: string | null; // data URL of the map or chart
  caption: string;
  legend?: { color: string; label: string }[];
}

export interface ReportSpec {
  title: string;
  subtitle: string;
  color: string; // the dashboard's brand colour
  path: string; // live dashboard, e.g. /projects/acled-conflict-dashboard
  scope: [string, string][];
  summary: string;
  findings: string[];
  kpis: { label: string; value: string; note?: string }[];
  figures: ReportFigure[];
  tables: ReportTable[];
  method: string[];
  limits: string[];
  sources: string[];
}

/** Snapshot of a WebGL or 2D canvas on the page (the first match), or null. */
export function captureCanvas(selector: string, quality = 0.92): string | null {
  try {
    const canvas = document.querySelector<HTMLCanvasElement>(selector);
    if (!canvas || !canvas.width) return null;
    // Flatten onto a light background: transparent pixels would turn black in a JPEG.
    const flat = document.createElement('canvas');
    flat.width = canvas.width;
    flat.height = canvas.height;
    const ctx = flat.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#f4f2ee';
    ctx.fillRect(0, 0, flat.width, flat.height);
    ctx.drawImage(canvas, 0, 0);
    return flat.toDataURL('image/jpeg', quality);
  } catch {
    return null; // a tainted canvas (cross-origin tiles without CORS)
  }
}

const fmtNumber = (v: string | number) => (typeof v === 'number' ? v.toLocaleString('en-US') : v);

const PRINT_CSS = `
@media screen {
  .cm-report-root { position: fixed; inset: 0; z-index: 2000; overflow: auto; background: #5f6368; }
}
@media print {
  @page { size: A4; margin: 14mm 13mm 16mm; }
  @page { @bottom-center { content: counter(page) " / " counter(pages); font: 8pt Roboto, Arial, sans-serif; color: #888; } }
  html, body { background: #fff !important; }
  body > *:not(.cm-report-root) { display: none !important; }
  .cm-report-root { position: static !important; overflow: visible !important; background: #fff !important; }
  .cm-report-toolbar { display: none !important; }
  .cm-report-sheet { box-shadow: none !important; margin: 0 !important; width: auto !important; padding: 0 !important; }
}
.cm-report-root, .cm-report-root * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cm-report-sheet h2 { break-after: avoid; page-break-after: avoid; }
.cm-report-sheet figure, .cm-report-sheet .cm-keep, .cm-report-sheet tr { break-inside: avoid; page-break-inside: avoid; }
.cm-report-sheet thead { display: table-header-group; }
`;

function Section({ title, children, color }: { title: string; children: React.ReactNode; color: string }) {
  return (
    <Box component="section" sx={{ mt: 3 }}>
      <Typography component="h2" sx={{ fontSize: '12.5pt', fontWeight: 700, color, borderBottom: `1.5px solid ${color}`, pb: 0.5, mb: 1.25, fontFamily: 'inherit' }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

export default function ProjectReport({ spec, onClose }: { spec: ReportSpec; onClose: () => void }) {
  const { isAr, tr, locale } = useI18n();
  const generated = new Date().toLocaleString(isAr ? 'ar-EG-u-nu-latn' : 'en-GB', { dateStyle: 'long', timeStyle: 'short' });
  const url = `https://coffeemap.dev${isAr ? '/ar' : ''}${spec.path}`;

  // Name the saved PDF after the project, and close with Escape.
  useEffect(() => {
    const previous = document.title;
    document.title = `${spec.title} – ${new Date().toISOString().slice(0, 10)} – CoffeeMap.dev`;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => {
      document.title = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [spec.title, onClose]);

  const p = { fontSize: '9.5pt', lineHeight: 1.55, m: 0, mb: 0.75, fontFamily: 'inherit', color: '#222' } as const;
  const list = (items: string[]) => (
    <Box component="ul" sx={{ m: 0, paddingInlineStart: '1.2em' }}>
      {items.map((t, i) => (
        <Typography component="li" key={i} sx={{ ...p, mb: 0.4 }}>
          {t}
        </Typography>
      ))}
    </Box>
  );

  return createPortal(
    <Box className="cm-report-root" dir={isAr ? 'rtl' : 'ltr'} lang={locale} role="dialog" aria-label={tr('Report preview', 'معاينة التقرير')}>
      <style>{PRINT_CSS}</style>
      <Box
        className="cm-report-toolbar"
        sx={{ position: 'sticky', top: 0, zIndex: 1, display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1, bgcolor: '#202124', color: 'white', flexWrap: 'wrap' }}
      >
        <Typography sx={{ flex: 1, fontSize: '0.9rem', fontWeight: 600 }}>
          {tr('Report preview', 'معاينة التقرير')}
          <Typography component="span" sx={{ fontSize: '0.78rem', opacity: 0.75, ml: 1.5, mr: 1.5 }}>
            {tr('In the print dialog choose "Save as PDF" as the destination.', 'في نافذة الطباعة اختر «حفظ بتنسيق PDF» وجهةً.')}
          </Typography>
        </Typography>
        <Button variant="contained" startIcon={<PictureAsPdfIcon />} onClick={() => window.print()} sx={{ textTransform: 'none', bgcolor: spec.color, '&:hover': { bgcolor: spec.color, filter: 'brightness(1.1)' } }}>
          {tr('Save as PDF', 'حفظ PDF')}
        </Button>
        <Button variant="outlined" startIcon={<CloseIcon />} onClick={onClose} sx={{ textTransform: 'none', color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}>
          {tr('Close', 'إغلاق')}
        </Button>
      </Box>

      <Box
        className="cm-report-sheet"
        sx={{ width: '210mm', maxWidth: 'calc(100% - 24px)', mx: 'auto', my: 3, bgcolor: 'white', boxShadow: 6, px: '14mm', py: '12mm', color: '#222', fontFamily: isAr ? 'Cairo, Roboto, sans-serif' : 'Roboto, Arial, sans-serif' }}
      >
        {/* 1. Header band */}
        <Box className="cm-keep" sx={{ bgcolor: spec.color, color: 'white', borderRadius: '6px', px: 2.5, py: 2, display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
          <Box>
            <Typography sx={{ fontSize: '8pt', letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.85, fontFamily: 'inherit' }}>
              {tr('Dashboard report', 'تقرير لوحة المعلومات')}
            </Typography>
            <Typography component="h1" sx={{ fontSize: '19pt', fontWeight: 800, lineHeight: 1.15, mt: 0.25, fontFamily: 'inherit' }}>
              {spec.title}
            </Typography>
            <Typography sx={{ fontSize: '10pt', opacity: 0.92, mt: 0.5, fontFamily: 'inherit' }}>{spec.subtitle}</Typography>
          </Box>
          <Box sx={{ textAlign: 'end', flexShrink: 0 }}>
            <Typography sx={{ fontSize: '11pt', fontWeight: 800, fontFamily: 'inherit' }}>CoffeeMap.dev</Typography>
            <Typography sx={{ fontSize: '8.5pt', opacity: 0.9, fontFamily: 'inherit' }}>{tr('Amin Adnan Gasim', 'أمين عدنان قاسم')}</Typography>
            <Typography sx={{ fontSize: '8pt', opacity: 0.8, fontFamily: 'inherit' }}>{tr('Geomatics & GeoAI Engineer', 'مهندس جيوماتكس وذكاء جيومكاني')}</Typography>
          </Box>
        </Box>

        {/* 2. Scope */}
        <Box className="cm-keep" component="table" sx={{ width: '100%', borderCollapse: 'collapse', mt: 1.5, '& td': { fontSize: '8.5pt', py: 0.4, px: 0.75, borderBottom: '1px solid #e6e6e6', verticalAlign: 'top' } }}>
          <tbody>
            {[[tr('Generated', 'تاريخ الإنشاء'), generated], ...spec.scope].map(([k, v]) => (
              <tr key={k}>
                <td style={{ width: '28%', color: '#666' }}>{k}</td>
                <td style={{ fontWeight: 600 }}>{v}</td>
              </tr>
            ))}
          </tbody>
        </Box>

        {/* 3. Summary and findings */}
        <Section title={tr('Summary', 'الملخص')} color={spec.color}>
          <Typography sx={{ ...p, fontSize: '10pt' }}>{spec.summary}</Typography>
          {spec.findings.length > 0 && (
            <Box className="cm-keep" sx={{ mt: 1, p: 1.25, bgcolor: '#f6f7f9', borderInlineStart: `3px solid ${spec.color}`, borderRadius: '4px' }}>
              <Typography sx={{ fontSize: '9pt', fontWeight: 700, mb: 0.5, fontFamily: 'inherit' }}>{tr('Key findings', 'أبرز النتائج')}</Typography>
              {list(spec.findings)}
            </Box>
          )}
        </Section>

        {/* 4. Key figures */}
        {spec.kpis.length > 0 && (
          <Box className="cm-keep" sx={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(4, spec.kpis.length)}, 1fr)`, gap: 1, mt: 2 }}>
            {spec.kpis.map((k) => (
              <Box key={k.label} sx={{ border: '1px solid #e2e2e2', borderTop: `3px solid ${spec.color}`, borderRadius: '4px', px: 1.25, py: 1 }}>
                <Typography sx={{ fontSize: '7.5pt', color: '#666', lineHeight: 1.25, fontFamily: 'inherit' }}>{k.label}</Typography>
                <Typography sx={{ fontSize: '14pt', fontWeight: 800, color: '#111', lineHeight: 1.3, fontFamily: 'inherit' }}>
                  <bdi>{k.value}</bdi>
                </Typography>
                {k.note && <Typography sx={{ fontSize: '7pt', color: '#777', lineHeight: 1.3, fontFamily: 'inherit' }}>{k.note}</Typography>}
              </Box>
            ))}
          </Box>
        )}

        {/* 5. Figures */}
        {spec.figures.filter((f) => f.image).map((f, i) => (
          <Box component="figure" key={i} sx={{ m: 0, mt: 2.5 }}>
            <Box component="img" src={f.image!} alt={f.caption} sx={{ width: '100%', aspectRatio: '16 / 9', maxHeight: '95mm', objectFit: 'cover', display: 'block', border: '1px solid #ddd', borderRadius: '4px' }} />
            {f.legend && f.legend.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mt: 0.75 }}>
                {f.legend.map((l) => (
                  <Box key={l.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: l.color, border: '1px solid rgba(0,0,0,0.15)' }} />
                    <Typography sx={{ fontSize: '7.5pt', fontFamily: 'inherit' }}>{l.label}</Typography>
                  </Box>
                ))}
              </Box>
            )}
            <Typography component="figcaption" sx={{ fontSize: '8pt', color: '#555', mt: 0.5, fontStyle: 'italic', fontFamily: 'inherit' }}>
              {tr(`Figure ${i + 1}. `, `الشكل ${i + 1}. `)}
              {f.caption}
            </Typography>
          </Box>
        ))}

        {/* 6. Tables */}
        {spec.tables.map((t) => (
          <Section key={t.title} title={t.title} color={spec.color}>
            <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', '& th, & td': { fontSize: '8.5pt', px: 0.75, py: 0.45, borderBottom: '1px solid #e6e6e6' }, '& th': { bgcolor: '#f3f4f6', fontWeight: 700, textAlign: 'start' }, '& tbody tr:nth-of-type(even) td': { bgcolor: '#fafafa' } }}>
              <thead>
                <tr>
                  {t.columns.map((c, j) => (
                    <th key={c} style={{ textAlign: t.numeric?.[j] ? 'end' : 'start' }}>
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((v, j) => (
                      <td key={j} style={{ textAlign: t.numeric?.[j] ? 'end' : 'start', fontVariantNumeric: 'tabular-nums' }}>
                        <bdi>{fmtNumber(v)}</bdi>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Box>
            {t.note && <Typography sx={{ fontSize: '7.5pt', color: '#666', mt: 0.5, fontFamily: 'inherit' }}>{t.note}</Typography>}
          </Section>
        ))}

        {/* 7. Method, limits, sources */}
        <Section title={tr('Method', 'المنهجية')} color={spec.color}>
          {list(spec.method)}
        </Section>
        <Section title={tr('Limitations', 'القيود')} color={spec.color}>
          {list(spec.limits)}
        </Section>
        <Section title={tr('Data sources and attribution', 'مصادر البيانات والإسناد')} color={spec.color}>
          {list(spec.sources)}
        </Section>

        {/* 8. Footer */}
        <Box className="cm-keep" sx={{ mt: 3, pt: 1.25, borderTop: '1px solid #ddd', display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap' }}>
          <Typography sx={{ fontSize: '7.5pt', color: '#666', fontFamily: 'inherit' }}>
            {tr('Live dashboard:', 'اللوحة الحية:')} <bdi>{url}</bdi>
          </Typography>
          <Typography sx={{ fontSize: '7.5pt', color: '#666', fontFamily: 'inherit' }}>
            <bdi>info@coffeemap.dev</bdi> · {tr('Screening analysis, not an official statistic.', 'تحليل فرز أولي، وليس إحصاءً رسميًا.')}
          </Typography>
        </Box>
      </Box>
    </Box>,
    document.body,
  );
}
