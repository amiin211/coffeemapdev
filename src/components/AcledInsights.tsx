'use client';

import { useState } from 'react';
import { Box, Chip, Collapse, IconButton, Tooltip, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import FiberNewOutlinedIcon from '@mui/icons-material/FiberNewOutlined';
import WhatshotOutlinedIcon from '@mui/icons-material/WhatshotOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import type { ReactNode } from 'react';
import type { AcledData, AreaRef } from '@/utils/acled';
import { formatMonth } from '@/utils/acled';
import {
  AcledInsights as Insights,
  BASELINE_MONTHS,
  HOTSPOT_BAND_KM,
  HOTSPOT_COLORS,
  InsightOverlay,
  LocalityChange,
  MIN_NEW_COUNT,
  MIN_SURGE_COUNT,
  OVERLAY_COLORS,
  RECENT_MONTHS,
  SURGE_Z,
} from '@/utils/acledInsights';
import { unBlue } from '@/theme/unColors';
import { useI18n } from '@/i18n';
import { useSudanNames } from '@/utils/sudanNamesAr';

interface AcledInsightsProps {
  data: AcledData;
  insights: Insights;
  overlay: InsightOverlay | null;
  onOverlayChange: (overlay: InsightOverlay | null) => void;
  onLocalitySelect: (locality: string, state: string) => void;
  onHover: (area: AreaRef | null) => void;
  compact?: boolean;
}

const MAX_ITEMS = 6;
const fmt = (v: number) => (Math.round(v * 10) / 10).toLocaleString();

export default function AcledInsights({ data, insights, overlay, onOverlayChange, onLocalitySelect, onHover, compact }: AcledInsightsProps) {
  const { isAr, tr } = useI18n();
  const names = useSudanNames(isAr);
  const [methodOpen, setMethodOpen] = useState(false);
  const month = (i: number) => formatMonth(data.months[i], isAr);
  const unit = insights.measure === 'events' ? tr('events', 'حدث') : tr('fatalities', 'وفاة');
  const w = insights.window;

  const row = (key: string, locality: { name: string; state: string; pcode: string }, detail: ReactNode, swatch: string) => (
    <Box
      key={key}
      component="li"
      role="button"
      tabIndex={0}
      onClick={() => onLocalitySelect(locality.name, locality.state)}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onLocalitySelect(locality.name, locality.state)}
      onMouseEnter={() => onHover({ state: locality.state, pcode: locality.pcode })}
      onMouseLeave={() => onHover(null)}
      sx={{
        listStyle: 'none',
        display: 'flex',
        gap: 1,
        alignItems: 'flex-start',
        py: 0.6,
        px: 0.75,
        borderRadius: 1,
        cursor: 'pointer',
        '&:hover, &:focus-visible': { bgcolor: unBlue.light, outline: 'none' },
      }}
    >
      <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: swatch, mt: 0.6, flexShrink: 0 }} />
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3 }} noWrap>
          {names.locality(locality.name)}
          <Typography component="span" variant="caption" color="text.secondary">
            {' · '}
            {names.state(locality.state)}
          </Typography>
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.35 }}>
          {detail}
        </Typography>
      </Box>
    </Box>
  );

  const changeDetail = (c: LocalityChange) => {
    const ratio = c.expected > 0 ? c.recent / c.expected : null;
    return tr(
      `${c.recent.toLocaleString()} ${unit} vs ${fmt(c.expected)} expected${ratio ? ` (${fmt(ratio)}×)` : ''}`,
      `${c.recent.toLocaleString()} ${unit} مقابل ${fmt(c.expected)} متوقعة${ratio ? ` (${fmt(ratio)}×)` : ''}`,
    );
  };

  const column = (
    key: InsightOverlay,
    icon: ReactNode,
    title: string,
    hint: string,
    count: number,
    items: ReactNode[],
    empty: string,
  ) => {
    const active = overlay === key;
    return (
      <Box key={key} sx={{ flex: '1 1 240px', minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
          <Box sx={{ color: OVERLAY_COLORS[key], display: 'flex' }}>{icon}</Box>
          <Tooltip title={hint}>
            <Typography variant="subtitle2" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, flex: 1 }}>
              {title} <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>({count})</Box>
            </Typography>
          </Tooltip>
          <Chip
            size="small"
            label={active ? tr('On map', 'على الخريطة') : tr('Show on map', 'اعرض على الخريطة')}
            onClick={() => onOverlayChange(active ? null : key)}
            disabled={count === 0}
            variant={active ? 'filled' : 'outlined'}
            sx={{
              fontSize: '0.68rem',
              height: 22,
              borderColor: OVERLAY_COLORS[key],
              color: active ? 'white' : OVERLAY_COLORS[key],
              bgcolor: active ? OVERLAY_COLORS[key] : 'transparent',
              '&:hover': { bgcolor: active ? OVERLAY_COLORS[key] : `${OVERLAY_COLORS[key]}14` },
            }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4, mb: 0.5 }}>
          {hint}
        </Typography>
        <Box component="ul" sx={{ m: 0, p: 0 }}>
          {items.length ? (
            items
          ) : (
            <Typography component="li" variant="caption" color="text.secondary" sx={{ listStyle: 'none', display: 'block', px: 0.75, py: 0.5 }}>
              {empty}
            </Typography>
          )}
        </Box>
        {count > MAX_ITEMS && (
          <Typography variant="caption" color="text.secondary" sx={{ px: 0.75 }}>
            {tr(`+${count - MAX_ITEMS} more — show them on the map`, `+${count - MAX_ITEMS} أخرى — اعرضها على الخريطة`)}
          </Typography>
        )}
      </Box>
    );
  };

  const windowLabel = w
    ? tr(
        `Last ${RECENT_MONTHS} months (${month(w.recent[0])} – ${month(w.recent[1])}) vs the ${w.baseline[1] - w.baseline[0] + 1} months before.${w.partialSkipped ? ` ${month(data.months.length - 1)} is partial and left out.` : ''}`,
        `آخر ${RECENT_MONTHS} أشهر (${month(w.recent[0])} – ${month(w.recent[1])}) مقارنة بالأشهر الـ${w.baseline[1] - w.baseline[0] + 1} السابقة.${w.partialSkipped ? ` ${month(data.months.length - 1)} شهر جزئي ولم يُحتسب.` : ''}`,
      )
    : tr('Change detection needs at least 6 months of history before the period end.', 'يتطلب رصد التغيّر 6 أشهر على الأقل من البيانات قبل نهاية الفترة.');

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.25, mb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: unBlue.dark }}>
          {tr('Smart insights', 'رؤى ذكية')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 200 }}>
          {windowLabel} {tr(`Based on ${unit}.`, `على أساس ${insights.measure === 'events' ? 'الأحداث' : 'الوفيات'}.`)}
        </Typography>
        <Tooltip title={tr('How these are calculated', 'طريقة الحساب')}>
          <IconButton size="small" onClick={() => setMethodOpen((v) => !v)} aria-expanded={methodOpen} aria-label={tr('Methodology', 'المنهجية')}>
            <ScienceOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Collapse in={methodOpen}>
        <Box sx={{ bgcolor: unBlue.light, borderRadius: 1, p: 1.5, mb: 1.5 }}>
          <Typography variant="caption" component="div" sx={{ lineHeight: 1.7 }}>
            {isAr ? (
              <>
                <strong>تصاعد:</strong> مجموع آخر {RECENT_MONTHS} أشهر لكل محلية مقارنةً بالمتوقع من متوسط الأشهر الـ{BASELINE_MONTHS} السابقة. يُعلَّم التصاعد عندما تبلغ
                الدرجة المعيارية لتوزيع بواسون {SURGE_Z} أو أكثر ويبلغ المجموع {MIN_SURGE_COUNT} على الأقل.
                <br />
                <strong>محليات متأثرة حديثًا:</strong> لا أحداث طوال فترة الأساس، ثم {MIN_NEW_COUNT} أو أكثر في الأشهر الأخيرة.
                <br />
                <strong>بؤر ساخنة:</strong> إحصاء Getis-Ord Gi* على مراكز المحليات بنطاق مسافة {HOTSPOT_BAND_KM} كم، على لوغاريتم مجاميع الفترة المحددة؛ مستويات ثقة 90/95/99٪
                بدون تصحيح للمقارنات المتعددة.
                <br />
                <strong>حدود:</strong> بيانات ACLED مبنية على التقارير، فالمناطق ضعيفة التغطية قد تبدو أهدأ مما هي عليه. هذه مؤشرات للفرز وليست تنبؤات.
              </>
            ) : (
              <>
                <strong>Surges:</strong> each locality&apos;s total for the last {RECENT_MONTHS} months against the total expected from its mean over the{' '}
                {BASELINE_MONTHS} months before. Flagged when the Poisson z-score is {SURGE_Z} or more and the recent total is at least {MIN_SURGE_COUNT}.
                <br />
                <strong>Newly affected:</strong> no {unit} in the whole baseline, then {MIN_NEW_COUNT} or more in the recent months.
                <br />
                <strong>Hotspots:</strong> Getis-Ord Gi* over locality centroids with a {HOTSPOT_BAND_KM} km distance band, on log-transformed totals for the
                selected period; 90 / 95 / 99% confidence, with no correction for multiple testing.
                <br />
                <strong>Limits:</strong> ACLED is report-based, so places with thin media coverage can look calmer than they are. These are triage signals, not
                forecasts.
              </>
            )}
          </Typography>
        </Box>
      </Collapse>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: compact ? 2 : 3 }}>
        {column(
          'surges',
          <TrendingUpIcon fontSize="small" />,
          tr('Surging localities', 'محليات تشهد تصاعدًا'),
          tr('Violence in the last 3 months is far above what is normal for that locality (its previous 6 months).', 'العنف في آخر 3 أشهر أعلى بكثير من المعتاد في تلك المحلية (أشهرها الستة السابقة).'),
          insights.surges.length,
          insights.surges.slice(0, MAX_ITEMS).map((c) => row(c.locality.pcode, c.locality, changeDetail(c), OVERLAY_COLORS.surges)),
          tr('No locality is significantly above its baseline.', 'لا توجد محلية أعلى من خط الأساس بشكل ملحوظ.'),
        )}
        {column(
          'new',
          <FiberNewOutlinedIcon fontSize="small" />,
          tr('Newly affected', 'متأثرة حديثًا'),
          tr('No events in the previous 6 months, but events in the last 3: violence spreading to new places.', 'لا أحداث في الأشهر الستة السابقة، لكن أحداث في آخر 3 أشهر: عنف يمتد إلى أماكن جديدة.'),
          insights.newlyAffected.length,
          insights.newlyAffected.slice(0, MAX_ITEMS).map((c) =>
            row(
              c.locality.pcode,
              c.locality,
              tr(`${c.recent.toLocaleString()} ${unit}, none in the ${BASELINE_MONTHS} months before`, `${c.recent.toLocaleString()} ${unit}، ولا شيء في الأشهر الـ${BASELINE_MONTHS} السابقة`),
              OVERLAY_COLORS.new,
            ),
          ),
          tr('No newly affected localities.', 'لا توجد محليات متأثرة حديثًا.'),
        )}
        {column(
          'hotspots',
          <WhatshotOutlinedIcon fontSize="small" />,
          tr('Hotspot clusters (Gi*)', 'تجمعات البؤر الساخنة (Gi*)'),
          tr('Areas where a locality and its neighbours within 150 km are all high: a regional cluster of conflict, not one isolated spot.', 'مناطق ترتفع فيها المحلية وجيرانها ضمن 150 كم معًا: تجمع إقليمي للنزاع، لا بقعة معزولة.'),
          insights.hotspots.length,
          insights.hotspots.slice(0, MAX_ITEMS).map((h) =>
            row(
              h.locality.pcode,
              h.locality,
              tr(`${h.confidence}% confidence · z = ${fmt(h.z)}`, `ثقة ${h.confidence}٪ · z = ${fmt(h.z)}`),
              HOTSPOT_COLORS[h.confidence],
            ),
          ),
          tr('No significant clusters in this period.', 'لا توجد تجمعات ذات دلالة في هذه الفترة.'),
        )}
      </Box>
    </Box>
  );
}
