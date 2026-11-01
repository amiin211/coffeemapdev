'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, FormControlLabel, IconButton, Slider, Switch, Tooltip, Typography } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { BimData } from '@/lib/mosqueBim';
import { CATEGORIES_AR } from '@/lib/mosqueBimAr';
import { PhaseId, Schedule, dayToIso, phaseAt } from '@/lib/mosqueSchedule';
import { COST_UNIT_LABEL, WorkPackage, midCost, siteWorksCostToDate } from '@/lib/mosqueSiteWorks';
import { useI18n } from '@/i18n';

// 4D BIM timeline: the indicative construction programme, phase by phase.
const PLAY_STEP_DAYS = 2;
const PLAY_MS = 90;
const DAY = 86_400_000;

export const SAND = { bg: 'rgba(250, 245, 236, 0.95)', border: '#dcc9a6', text: '#3f2d1d', muted: '#7a6650', accent: '#b5652b', accentSoft: '#e9b97a' };
const PHASE_COLORS: Record<PhaseId, string> = {
  survey: '#4fa3c7',
  earthworks: '#a98563',
  road: '#5b5856',
  foundations: '#9a958c',
  structure: '#c79a5b',
  envelope: '#5f7f86',
  finishes: '#d8b77d',
  external: '#7d9a5a',
  handover: '#2e7d32',
};

interface MosqueTimelineProps {
  bim: BimData;
  schedule: Schedule;
  siteWorks: WorkPackage[];
  day: number;
  onDayChange: (day: number) => void;
  showPlanned: boolean;
  onShowPlannedChange: (on: boolean) => void;
  onClose: () => void;
}

export default function MosqueTimeline({ bim, schedule, siteWorks, day, onDayChange, showPlanned, onShowPlannedChange, onClose }: MosqueTimelineProps) {
  const { isAr, tr } = useI18n();
  const [playing, setPlaying] = useState(false);
  const [ganttOpen, setGanttOpen] = useState(true);
  const end = schedule.finish;

  // Elements and their cost, by finish day.
  const items = useMemo(
    () =>
      Object.entries(bim.elements)
        .map(([key, e]) => ({ end: schedule.tasks.get(key)?.end ?? 0, start: schedule.tasks.get(key)?.start ?? 0, cost: (e.costSAR[0] + e.costSAR[1]) / 2, category: bim.types[e.type].category }))
        .sort((a, b) => a.end - b.end),
    [bim, schedule],
  );
  const bimCost = useMemo(() => items.reduce((s, it) => s + it.cost, 0), [items]);
  const siteCost = useMemo(() => siteWorks.reduce((s, p) => s + midCost(p.cost), 0), [siteWorks]);
  const totalCost = bimCost + siteCost;
  const progress = useMemo(() => {
    let n = 0, cost = 0;
    const active = new Map<string, number>();
    for (const it of items) {
      if (it.end <= day) {
        n++;
        cost += it.cost;
      } else if (it.start <= day) active.set(it.category, (active.get(it.category) ?? 0) + 1);
    }
    return { n, bimCost: cost, cost: cost + siteWorksCostToDate(siteWorks, day), active: Array.from(active).sort((a, b) => b[1] - a[1]) };
  }, [items, siteWorks, day]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      if (day >= end) {
        setPlaying(false);
        return;
      }
      onDayChange(Math.min(end, day + PLAY_STEP_DAYS));
    }, PLAY_MS);
    return () => clearInterval(id);
  }, [playing, day, end, onDayChange]);

  const iso = dayToIso(day);
  const date = new Date(`${iso}T00:00:00Z`);
  const gregorian = date.toLocaleDateString(isAr ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  let hijri = '';
  try {
    hijri = new Intl.DateTimeFormat(`${isAr ? 'ar-SA' : 'en-GB'}-u-ca-islamic-umalqura`, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
  } catch {
    // calendar not supported
  }
  const current = phaseAt(schedule, day);
  const phaseName = (id: PhaseId) => {
    const p = schedule.phases.find((x) => x.id === id)!;
    return isAr ? p.nameAr : p.name;
  };
  const category = (c: string) => (isAr ? CATEGORIES_AR[c] ?? c : c);
  const sar = (v: number) => `${(v / 1e6).toLocaleString(isAr ? 'ar-EG' : 'en', { maximumFractionDigits: 1 })} ${tr('M SAR', 'مليون ريال')}`;
  const pct = Math.round((Math.min(day, end) / end) * 100);
  const frac = (d: number) => d / end;
  const monthTicks = useMemo(() => {
    const ticks: { day: number; label: string }[] = [];
    const start = Date.parse(`${dayToIso(0)}T00:00:00Z`);
    const d = new Date(start);
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + 1);
    while ((d.getTime() - start) / DAY <= end) {
      if (d.getUTCMonth() % 2 === 0) ticks.push({ day: (d.getTime() - start) / DAY, label: d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' }) });
      d.setUTCMonth(d.getUTCMonth() + 1);
    }
    return ticks;
  }, [end]);

  const activity =
    day >= end
      ? tr('Complete: handed over', 'مكتمل: تم التسليم')
      : progress.active.length
        ? progress.active.slice(0, 3).map(([c, n]) => `${category(c)} (${n})`).join(tr(', ', '، '))
        : current.map(phaseName).join(tr(' · ', ' · '));

  return (
    <Box sx={{ color: SAND.text, bgcolor: SAND.bg, border: `1px solid ${SAND.border}`, backdropFilter: 'blur(6px)', borderRadius: 1.5, px: 1.5, py: 1, boxShadow: 3, maxWidth: 820, mx: 'auto' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, flexWrap: 'wrap' }}>
        <IconButton
          onClick={() => {
            if (!playing && day >= end) onDayChange(0);
            setPlaying((p) => !p);
          }}
          sx={{ bgcolor: SAND.accent, color: 'white', '&:hover': { bgcolor: '#9a5322' } }}
          aria-label={playing ? tr('Pause', 'إيقاف مؤقت') : tr('Play construction', 'تشغيل مراحل الإنشاء')}
        >
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
        <Box sx={{ minWidth: 120 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
            {gregorian}
          </Typography>
          {hijri && (
            <Typography variant="caption" sx={{ color: SAND.muted }}>
              {hijri}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flex: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              {pct}%
            </Typography>
            <Typography variant="caption" sx={{ color: SAND.muted }}>
              {tr(`of programme · ${progress.n}/${items.length} elements`, `من البرنامج · ${progress.n}/${items.length} عنصرًا`)}
            </Typography>
          </Box>
          <Tooltip
            title={
              <Box sx={{ fontSize: '0.72rem', lineHeight: 1.5 }}>
                <Box sx={{ fontWeight: 700, mb: 0.5 }}>{tr('Cost breakdown (mid-range, SAR)', 'تفصيل التكلفة (متوسط النطاق، ريال)')}</Box>
                {siteWorks.map((p) => (
                  <Box key={p.id} sx={{ mb: 0.5 }}>
                    <Box sx={{ fontWeight: 700 }}>
                      {p.code} {isAr ? p.nameAr : p.name}: {Math.round(midCost(p.cost)).toLocaleString()}
                    </Box>
                    {p.items.map((i) => (
                      <Box key={i.code} sx={{ pl: 1, opacity: 0.85 }}>
                        {isAr ? i.nameAr : i.name} · {Math.round(i.quantity).toLocaleString()} {COST_UNIT_LABEL[i.unit][isAr ? 1 : 0]} × {i.rate[0].toLocaleString()}–{i.rate[1].toLocaleString()}
                      </Box>
                    ))}
                  </Box>
                ))}
                <Box sx={{ fontWeight: 700 }}>
                  {tr('BIM building elements', 'عناصر المبنى في BIM')}: {Math.round(bimCost).toLocaleString()}
                </Box>
                <Box sx={{ mt: 0.5, opacity: 0.8 }}>
                  {tr('Indicative 2023-24 KSA unit rates, quantities measured from the model.', 'أسعار وحدات استرشادية لسوق السعودية 2023-24، والكميات مقيسة من النموذج.')}
                </Box>
              </Box>
            }
          >
            <Box sx={{ cursor: 'help' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
                {sar(progress.cost)}
              </Typography>
              <Typography variant="caption" sx={{ color: SAND.muted }}>
                {tr(`cost to date, of ${sar(totalCost)} ⓘ`, `التكلفة حتى الآن، من ${sar(totalCost)} ⓘ`)}
              </Typography>
            </Box>
          </Tooltip>
          <Box sx={{ minWidth: 170, flex: 1 }}>
            <Typography variant="caption" sx={{ color: SAND.muted, display: 'block' }}>
              {current.length ? current.map(phaseName).join(tr(' · ', ' · ')) : tr('Handover', 'التسليم')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: SAND.accent, lineHeight: 1.3 }}>
              {activity}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', alignSelf: 'flex-start' }}>
          <Tooltip title={tr('Show the parts not yet built as a faint outline', 'إظهار الأجزاء غير المنفذة بخط باهت')}>
            <FormControlLabel
              control={<Switch size="small" checked={showPlanned} onChange={(e) => onShowPlannedChange(e.target.checked)} />}
              label={<Typography variant="caption">{tr('Ghost', 'المخطط')}</Typography>}
              sx={{ m: 0, mr: 0.5 }}
            />
          </Tooltip>
          <Tooltip title={ganttOpen ? tr('Hide programme', 'إخفاء البرنامج') : tr('Show programme', 'إظهار البرنامج')}>
            <IconButton size="small" onClick={() => setGanttOpen((v) => !v)} sx={{ color: SAND.text }} aria-label={tr('Toggle programme', 'إظهار/إخفاء البرنامج')}>
              {ganttOpen ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title={tr('Close 4D view (show the mosque as built)', 'إغلاق العرض رباعي الأبعاد (عرض المسجد مكتملًا)')}>
            <IconButton size="small" onClick={onClose} sx={{ color: SAND.text }} aria-label={tr('Close 4D view', 'إغلاق العرض رباعي الأبعاد')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Programme: one bar per phase with a "today" line; click a bar to jump to it. */}
      <Box sx={{ position: 'relative', mt: 0.75, direction: 'ltr', display: ganttOpen ? 'block' : 'none' }}>
        {schedule.phases.map((p) => {
          const done = day >= p.end;
          const started = day >= p.start;
          return (
            <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', height: 11 }}>
              <Typography variant="caption" noWrap sx={{ width: 150, fontSize: '0.62rem', lineHeight: 1, fontWeight: started && !done ? 700 : 400, color: started ? SAND.text : SAND.muted, textAlign: isAr ? 'right' : 'left', pr: 1 }}>
                {isAr ? p.nameAr : p.name}
              </Typography>
              <Box sx={{ position: 'relative', flex: 1, height: '100%' }}>
                <Tooltip title={`${isAr ? p.nameAr : p.name} · ${dayToIso(p.start)} → ${dayToIso(p.end)}`}>
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => onDayChange(p.start)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onDayChange(p.start)}
                    sx={{
                      position: 'absolute',
                      top: 1.5,
                      bottom: 1.5,
                      left: `${frac(p.start) * 100}%`,
                      width: `max(4px, ${(frac(p.end) - frac(p.start)) * 100}%)`,
                      borderRadius: 1,
                      cursor: 'pointer',
                      bgcolor: PHASE_COLORS[p.id],
                      opacity: done ? 0.9 : started ? 1 : 0.35,
                      outline: started && !done ? `2px solid ${SAND.accent}` : 'none',
                    }}
                  />
                </Tooltip>
              </Box>
            </Box>
          );
        })}
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: 150, right: 0, pointerEvents: 'none' }}>
          <Box sx={{ position: 'absolute', top: -2, bottom: -2, left: `${Math.min(1, frac(day)) * 100}%`, width: 2, bgcolor: SAND.accent }} />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', direction: 'ltr' }}>
        <Box sx={{ width: 150, flexShrink: 0 }}>
          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: SAND.muted }}>
            {tr('Indicative programme', 'برنامج استرشادي')}
          </Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Slider
            size="small"
            min={0}
            max={end}
            step={1}
            value={Math.min(day, end)}
            onChange={(_, v) => {
              setPlaying(false);
              onDayChange(v as number);
            }}
            aria-label={tr('Construction date', 'تاريخ الإنشاء')}
            sx={{ color: SAND.accent, py: 0.75 }}
          />
          <Box sx={{ position: 'relative', height: 12 }}>
            {monthTicks.map((t) => (
              <Typography key={t.day} variant="caption" sx={{ position: 'absolute', left: `${frac(t.day) * 100}%`, transform: 'translateX(-50%)', fontSize: '0.6rem', color: SAND.muted, top: -6 }}>
                {t.label}
              </Typography>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
