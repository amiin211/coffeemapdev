'use client';

import { Box, Dialog, DialogContent, DialogTitle, IconButton, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useI18n } from '@/i18n';

// What the Equity column in the Riyadh district table means. The numbers
// mirror src/lib/urbanHeat.ts (heatAt, accessAt, computeResults).

const EQUITY_RED = '#b2182b';
const EQUITY_GREEN = '#1b7837';

interface Row {
  term: string;
  meaning: string;
}

const TEXT = {
  en: {
    title: 'What does Equity mean?',
    intro: 'Equity compares how much greenery people can reach with how much heat they face. It runs from −1 to +1.',
    formula: 'Equity = vegetation access − heat exposure',
    partsTitle: 'The two parts',
    partsHead: ['Part', 'How it is measured (0–1)'],
    parts: [
      { term: 'Heat exposure', meaning: 'Surface temperature ranked within Riyadh: 0 = as cool as the coolest 5% of the city, 1 = as hot as the hottest 5%.' },
      { term: 'Vegetation access', meaning: 'Average of three things: tree canopy within 300 m (25% counts as full), closeness to the nearest tree canopy, and closeness to the nearest park.' },
    ] as Row[],
    readTitle: 'Reading the value',
    readHead: ['Value', 'Meaning'],
    read: [
      { term: '+1', meaning: 'Coolest part of the city with plenty of greenery nearby.' },
      { term: 'above 0 (green)', meaning: 'Greenery access outweighs the heat.' },
      { term: 'around 0', meaning: 'Access and heat balance out.' },
      { term: 'below −0.3 (red)', meaning: 'Clearly hot, with little greenery within reach.' },
      { term: '−1', meaning: 'Hottest part of the city with no trees or parks nearby.' },
    ] as Row[],
    note: 'In the table, each district shows the average of all built-up cells within 1.5 km of its centre. It is a relative screening measure for the built-up city only and does not yet count how many people live there.',
    close: 'Close',
  },
  ar: {
    title: 'ماذا تعني العدالة؟',
    intro: 'تقارن العدالة بين مقدار المساحات الخضراء التي يستطيع الناس الوصول إليها ومقدار الحرارة التي يتعرضون لها. وتتراوح من −1 إلى +1.',
    formula: 'العدالة = الوصول إلى الغطاء النباتي − التعرض للحرارة',
    partsTitle: 'المكوّنان',
    partsHead: ['المكوّن', 'كيف يُقاس (0–1)'],
    parts: [
      { term: 'التعرض للحرارة', meaning: 'ترتيب حرارة السطح داخل الرياض: 0 = بقدر برودة أبرد 5% من المدينة، و1 = بقدر حرارة أشد 5% حرارة.' },
      { term: 'الوصول إلى الغطاء النباتي', meaning: 'متوسط ثلاثة عناصر: مظلة الأشجار ضمن 300 م (تُعد 25% وصولًا كاملًا)، والقرب من أقرب مظلة أشجار، والقرب من أقرب حديقة.' },
    ] as Row[],
    readTitle: 'قراءة القيمة',
    readHead: ['القيمة', 'المعنى'],
    read: [
      { term: '+1', meaning: 'أبرد أجزاء المدينة مع مساحات خضراء وفيرة قريبة.' },
      { term: 'أعلى من 0 (أخضر)', meaning: 'الوصول إلى الخضرة يفوق الحرارة.' },
      { term: 'نحو 0', meaning: 'الوصول والحرارة متوازنان.' },
      { term: 'أقل من −0.3 (أحمر)', meaning: 'حار بوضوح، مع قليل من الخضرة في المتناول.' },
      { term: '−1', meaning: 'أشد أجزاء المدينة حرارة بلا أشجار ولا حدائق قريبة.' },
    ] as Row[],
    note: 'في الجدول، يعرض كل حي متوسط كل الخلايا المبنية ضمن 1.5 كم من مركزه. وهو مقياس فرز أولي نسبي للمدينة المبنية فقط، ولا يحتسب بعد عدد السكان.',
    close: 'إغلاق',
  },
};

function HelpTable({ head, rows, colorFor }: { head: string[]; rows: Row[]; colorFor?: (i: number) => string | undefined }) {
  return (
    <Box
      component="table"
      sx={{
        width: '100%',
        borderCollapse: 'collapse',
        mb: 2,
        '& th, & td': { p: 1, fontSize: '0.85rem', textAlign: 'left', verticalAlign: 'top', borderBottom: '1px solid #eee' },
        '& th': { bgcolor: '#fbf3ec', fontWeight: 700 },
        '& td:first-of-type': { fontWeight: 600, whiteSpace: 'nowrap', width: '32%' },
      }}
    >
      <thead>
        <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.term}>
            <td style={{ color: colorFor?.(i) }}><bdi>{r.term}</bdi></td>
            <td>{r.meaning}</td>
          </tr>
        ))}
      </tbody>
    </Box>
  );
}

export default function EquityHelpDialog({ open, onClose, color }: { open: boolean; onClose: () => void; color: string }) {
  const { locale } = useI18n();
  const t = TEXT[locale];
  const readColor = (i: number) => (i <= 1 ? EQUITY_GREEN : i >= 3 ? EQUITY_RED : undefined);
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="equity-help-title">
      <DialogTitle id="equity-help-title" sx={{ fontWeight: 700, color, pr: 6 }}>
        {t.title}
        <IconButton onClick={onClose} aria-label={t.close} sx={{ position: 'absolute', top: 10, right: 10 }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" sx={{ mb: 1.5, lineHeight: 1.8 }}>{t.intro}</Typography>
        <Box sx={{ mb: 2, px: 1.5, py: 1, borderRadius: 1, bgcolor: '#fbf3ec', fontWeight: 700, textAlign: 'center' }}>{t.formula}</Box>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{t.partsTitle}</Typography>
        <HelpTable head={t.partsHead} rows={t.parts} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>{t.readTitle}</Typography>
        <HelpTable head={t.readHead} rows={t.read} colorFor={readColor} />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.7 }}>{t.note}</Typography>
      </DialogContent>
    </Dialog>
  );
}
