'use client';

import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, IconButton, InputAdornment, TextField, Tooltip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import { AiQueryResult, aiEnabled, askAi } from '@/utils/ai';
import { unBlue } from '@/theme/unColors';
import { useI18n } from '@/i18n';

interface AcledAssistantProps {
  /** Allowed fields and values for "Ask the map" — the model can only pick from these. */
  schema: unknown;
  /** Numbers for the situation brief, computed from the current view. */
  getBriefData: () => unknown;
  /** Applies a query to the dashboard; returns a note to show (or an error message). */
  onQuery: (result: AiQueryResult) => { ok: boolean; note: string };
}

// Just enough Markdown for the brief: ## headings, - bullets, **bold**.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
  );
}
function Markdown({ source }: { source: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length)
      blocks.push(
        <Box component="ul" key={`ul${blocks.length}`} sx={{ m: 0, mb: 1, pl: 2.5 }}>
          {bullets.map((b, i) => (
            <Typography component="li" variant="body2" key={i} sx={{ lineHeight: 1.6 }}>
              {inline(b)}
            </Typography>
          ))}
        </Box>,
      );
    bullets = [];
  };
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (/^[-*•]\s+/.test(line)) {
      bullets.push(line.replace(/^[-*•]\s+/, ''));
      continue;
    }
    flush();
    if (!line) continue;
    const heading = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(
      heading ? (
        <Typography key={blocks.length} variant="subtitle2" sx={{ fontWeight: 700, color: unBlue.dark, mt: 1, mb: 0.5 }}>
          {inline(heading[1])}
        </Typography>
      ) : (
        <Typography key={blocks.length} variant="body2" sx={{ mb: 1, lineHeight: 1.6 }}>
          {inline(line)}
        </Typography>
      ),
    );
  }
  flush();
  return <>{blocks}</>;
}

export default function AcledAssistant({ schema, getBriefData, onQuery }: AcledAssistantProps) {
  const { isAr, tr } = useI18n();
  const lang = isAr ? 'ar' : 'en';
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{ ok: boolean; note: string } | null>(null);
  const [briefing, setBriefing] = useState(false);
  const [brief, setBrief] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const examples = isAr
    ? ['أين تصاعد العنف مؤخرًا؟', 'الوفيات في شمال دارفور عام 2024', 'البؤر الساخنة في كردفان']
    : ['Where did violence surge recently?', 'Fatalities in North Darfur in 2024', 'Hotspots in South Kordofan'];

  const ask = async (q: string) => {
    const text = q.trim();
    if (!text || asking) return;
    setQuestion(text);
    setAsking(true);
    setAnswer(null);
    setError(null);
    try {
      const result = await askAi<AiQueryResult>({ task: 'query', project: 'acled', lang, schema, question: text });
      setAnswer(onQuery(result));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setAsking(false);
    }
  };

  const writeBrief = async () => {
    setBriefing(true);
    setError(null);
    try {
      setBrief(await askAi<string>({ task: 'brief', project: 'acled', lang, data: getBriefData() }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBriefing(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(question);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <AutoAwesomeIcon sx={{ color: unBlue.DEFAULT, fontSize: 20 }} />
        <Typography variant="subtitle1" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: unBlue.dark, flex: 1 }}>
          {tr('Ask this map', 'اسأل الخريطة')}
        </Typography>
        <Button
          size="small"
          variant="contained"
          onClick={writeBrief}
          disabled={!aiEnabled || briefing}
          startIcon={briefing ? <CircularProgress size={14} color="inherit" /> : <AutoAwesomeIcon />}
          sx={{ bgcolor: unBlue.dark, fontSize: '0.72rem', '&:hover': { bgcolor: unBlue.DEFAULT } }}
        >
          {tr('Write situation brief', 'اكتب موجزًا للوضع')}
        </Button>
      </Box>

      <Box component="form" onSubmit={submit}>
        <TextField
          fullWidth
          size="small"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!aiEnabled}
          placeholder={aiEnabled ? tr('e.g. Which localities in Darfur had the most fatalities in 2025?', 'مثال: أي محليات دارفور شهدت أكثر الوفيات في 2025؟') : tr('AI features are not configured on this build.', 'ميزات الذكاء الاصطناعي غير مفعّلة في هذا الإصدار.')}
          inputProps={{ maxLength: 300, 'aria-label': tr('Ask a question about the map', 'اطرح سؤالًا عن الخريطة') }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton type="submit" size="small" disabled={!aiEnabled || asking || !question.trim()} aria-label={tr('Ask', 'اسأل')}>
                  {asking ? <CircularProgress size={16} /> : <SendIcon fontSize="small" sx={{ transform: isAr ? 'scaleX(-1)' : undefined }} />}
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{ '& .MuiOutlinedInput-root': { fontSize: '0.85rem', bgcolor: 'white' } }}
        />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75 }}>
        {examples.map((q) => (
          <Chip key={q} size="small" variant="outlined" label={q} onClick={() => ask(q)} disabled={!aiEnabled || asking} sx={{ fontSize: '0.68rem' }} />
        ))}
      </Box>

      {answer && (
        <Alert severity={answer.ok ? 'info' : 'warning'} onClose={() => setAnswer(null)} sx={{ mt: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
          {answer.note}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mt: 1, py: 0, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
          {error}
        </Alert>
      )}

      {brief && (
        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: 'white', border: `1px solid ${unBlue.light}`, borderRadius: 1, position: 'relative' }} dir={isAr ? 'rtl' : 'ltr'}>
          <Box sx={{ position: 'absolute', top: 4, [isAr ? 'left' : 'right']: 4, display: 'flex' }}>
            <Tooltip title={tr('Copy', 'نسخ')}>
              <IconButton size="small" onClick={() => navigator.clipboard?.writeText(brief)}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton size="small" onClick={() => setBrief(null)} aria-label={tr('Close', 'إغلاق')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Markdown source={brief} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {tr(
              'Drafted by Claude from the numbers computed on this page only. Check it before sharing.',
              'صاغه Claude من الأرقام المحسوبة في هذه الصفحة فقط. راجعه قبل مشاركته.',
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
