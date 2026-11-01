'use client';

import { useMemo, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Collapse,
  FormControlLabel,
  IconButton,
  Slider,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import type { ThreeWData } from '@/utils/threew';
import {
  CORE_CLUSTERS,
  DEFAULT_WEIGHTS,
  EXIT_COLORS,
  ExitImpact,
  ExitItem,
  FACTORS,
  Factor,
  LocalityProfile,
  PRIORITY_RAMP,
  PriorityItem,
  Weights,
  missingCore,
  partnerCount,
  presenceChange,
  priorityColor,
} from '@/utils/threewInsights';
import { clusterLabel, orgTypeLabel } from '@/utils/threewMetric';
import { formatMonth } from '@/utils/acled';
import { unBlue } from '@/theme/unColors';
import { useI18n } from '@/i18n';
import { useSudanNames } from '@/utils/sudanNamesAr';

export type ExplorerMode = 'priority' | 'exit' | 'matrix';

export const FACTOR_COLORS: Record<Factor, string> = { conflict: '#C62828', scarcity: '#6A1B9A', missing: '#EF6C00', decline: '#00838F' };

interface MatrixRow {
  profile: LocalityProfile;
  cells: number[];
}

interface ThreeWExplorerProps {
  data: ThreeWData;
  months: string[];
  mode: ExplorerMode;
  onModeChange: (mode: ExplorerMode) => void;
  showOnMap: boolean;
  onShowOnMapChange: (on: boolean) => void;
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  priority: PriorityItem[];
  exitOrg: number | null;
  onExitOrgChange: (org: number | null) => void;
  exit: ExitItem[];
  matrix: MatrixRow[];
  selected: LocalityProfile | null;
  selectedRank: PriorityItem | null;
  onSelect: (key: string | null) => void;
  onStateSelect: (state: string) => void;
  filterNote: string | null;
}

const LIST_ITEMS = 8;
const pct = (v: number) => `${Math.round(v * 100)}`;
const SHORT_AR: Record<string, string> = { Health: 'الصحة', WASH: 'المياه', 'Food Security and Livelihoods': 'الغذاء', Protection: 'الحماية', Nutrition: 'التغذية' };
const SHORT_EN: Record<string, string> = { Health: 'Health', WASH: 'WASH', 'Food Security and Livelihoods': 'Food', Protection: 'Protect.', Nutrition: 'Nutrition' };

export function matrixCellColor(n: number) {
  return n === 0 ? '#C62828' : n === 1 ? '#FB8C00' : n === 2 ? '#FFE082' : '#C8E6C9';
}

export default function ThreeWExplorer(props: ThreeWExplorerProps) {
  const { data, months, mode, onModeChange, showOnMap, onShowOnMapChange, weights, onWeightsChange, priority, exitOrg, onExitOrgChange, exit, matrix, selected, selectedRank, onSelect, onStateSelect, filterNote } = props;
  const { isAr, tr } = useI18n();
  const names = useSudanNames(isAr);
  const [methodOpen, setMethodOpen] = useState(false);

  const factorLabel: Record<Factor, string> = {
    conflict: tr('Conflict intensity', 'شدة النزاع'),
    scarcity: tr('Few partners', 'قلة الشركاء'),
    missing: tr('Missing core clusters', 'قطاعات أساسية غائبة'),
    decline: tr('Declining presence', 'تراجع الحضور'),
  };
  const factorHint: Record<Factor, string> = {
    conflict: tr('ACLED events in the locality, as a percentile', 'أحداث ACLED في المحلية كنسبة مئوية ترتيبية'),
    scarcity: tr('Fewer active partners than other localities', 'شركاء نشطون أقل من المحليات الأخرى'),
    missing: tr('Share of the 5 core clusters with no partner', 'نسبة القطاعات الأساسية الخمسة بلا شريك'),
    decline: tr('Drop in activities, second half vs first half', 'انخفاض الأنشطة بين النصفين الثاني والأول'),
  };
  const period = months.length ? `${formatMonth(months[0], isAr)} – ${formatMonth(months[months.length - 1], isAr)}` : '';

  // Organizations, busiest first, for the exit simulator.
  const orgOptions = useMemo(() => {
    const counts = new Map<number, number>();
    for (const row of data.rows) counts.set(row[4], (counts.get(row[4]) ?? 0) + 1);
    return Array.from(counts, ([index, count]) => ({ index, count, org: data.orgs[index] })).sort((a, b) => b.count - a.count);
  }, [data]);
  const exitOption = orgOptions.find((o) => o.index === exitOrg) ?? null;

  const place = (p: LocalityProfile) => (
    <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.3, minWidth: 0 }} noWrap>
      {names.locality(p.name)}
      <Typography component="span" variant="caption" color="text.secondary">
        {' · '}
        {names.state(p.state)}
      </Typography>
    </Typography>
  );

  const rowSx = (key: string) => ({
    listStyle: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
    py: 0.5,
    px: 0.75,
    borderRadius: 1,
    cursor: 'pointer',
    bgcolor: selected?.key === key ? unBlue.light : 'transparent',
    outline: selected?.key === key ? `1px solid ${unBlue.DEFAULT}` : 'none',
    '&:hover, &:focus-visible': { bgcolor: unBlue.light },
  });
  const clickable = (key: string) => ({
    role: 'button',
    tabIndex: 0,
    onClick: () => onSelect(selected?.key === key ? null : key),
    onKeyDown: (e: KeyboardEvent) => (e.key === 'Enter' || e.key === ' ') && onSelect(key),
  });

  // ------------------------------------------------------------ Priority tab
  const total = FACTORS.reduce((s, f) => s + weights[f], 0) || 1;
  const priorityTab = (
    <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
      <Box sx={{ flex: '1 1 230px', minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          {tr('Set what matters most. The ranking and the map update instantly.', 'حدّد ما يهمك أكثر، ويتحدّث الترتيب والخريطة فورًا.')}
        </Typography>
        {FACTORS.map((f) => (
          <Box key={f} sx={{ mb: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: FACTOR_COLORS[f] }} />
              <Tooltip title={factorHint[f]}>
                <Typography variant="caption" sx={{ fontWeight: 600, flex: 1 }}>
                  {factorLabel[f]}
                </Typography>
              </Tooltip>
              <Typography variant="caption" color="text.secondary">
                {pct(weights[f] / total)}%
              </Typography>
            </Box>
            <Slider
              size="small"
              min={0}
              max={5}
              step={1}
              marks
              value={weights[f]}
              onChange={(_, v) => onWeightsChange({ ...weights, [f]: v as number })}
              aria-label={factorLabel[f]}
              sx={{ color: FACTOR_COLORS[f], py: 0.75 }}
            />
          </Box>
        ))}
        <Button size="small" startIcon={<RestartAltIcon />} onClick={() => onWeightsChange(DEFAULT_WEIGHTS)} sx={{ fontSize: '0.7rem' }}>
          {tr('Default weights', 'الأوزان الافتراضية')}
        </Button>
      </Box>
      <Box sx={{ flex: '2 1 320px', minWidth: 0 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
          {tr('Highest priority localities', 'المحليات الأعلى أولوية')}
          <Typography component="span" variant="caption" color="text.secondary">
            {tr(' — bar shows why', ' — الشريط يوضّح السبب')}
          </Typography>
        </Typography>
        <Box component="ul" sx={{ m: 0, p: 0 }}>
          {priority.slice(0, LIST_ITEMS).map((item) => (
            <Box component="li" key={item.profile.key} {...clickable(item.profile.key)} sx={rowSx(item.profile.key)}>
              <Typography variant="caption" sx={{ width: 18, color: 'text.secondary', fontWeight: 700 }}>
                {item.rank}
              </Typography>
              <Box sx={{ flex: '0 1 46%', minWidth: 0 }}>{place(item.profile)}</Box>
              <Box sx={{ flex: 1, display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', bgcolor: '#EEF1F5' }} dir="ltr">
                {FACTORS.map((f) => (
                  <Tooltip key={f} title={`${factorLabel[f]}: ${pct(item.parts[f])}%`}>
                    <Box sx={{ width: `${((weights[f] * item.parts[f]) / total) * 100}%`, bgcolor: FACTOR_COLORS[f] }} />
                  </Tooltip>
                ))}
              </Box>
              <Typography variant="caption" sx={{ width: 26, textAlign: 'end', fontWeight: 700, color: priorityColor(item.score) === PRIORITY_RAMP[0] ? 'text.secondary' : '#8C2D04' }}>
                {pct(item.score)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );

  // ------------------------------------------------------------ Exit tab
  const counts = exit.reduce<Record<ExitImpact, number>>((acc, e) => ((acc[e.impact] += 1), acc), { uncovered: 0, 'cluster-lost': 0, reduced: 0 });
  const uncoveredEvents = exit.filter((e) => e.impact === 'uncovered').reduce((s, e) => s + e.profile.events, 0);
  const exitTab = (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        {tr(
          'Pick an organization to see what would happen where it works if it left: places left with no partner at all, places that lose their only partner for a core service (health, water, food, protection, nutrition), and places where others remain.',
          'اختر منظمة لترى ماذا سيحدث حيث تعمل لو غادرت: أماكن تبقى بلا أي شريك، وأماكن تفقد شريكها الوحيد في خدمة أساسية (الصحة، المياه، الغذاء، الحماية، التغذية)، وأماكن يبقى فيها آخرون.',
        )}
      </Typography>
      <Autocomplete
        size="small"
        options={orgOptions}
        value={exitOption}
        onChange={(_, v) => onExitOrgChange(v?.index ?? null)}
        getOptionLabel={(o) => `${o.org.acronym || o.org.name} — ${o.org.name}`}
        isOptionEqualToValue={(a, b) => a.index === b.index}
        renderOption={(liProps, o) => (
          <Box component="li" {...liProps} key={o.index} sx={{ display: 'flex', gap: 1, fontSize: '0.8rem' }}>
            <strong>{o.org.acronym || o.org.name}</strong>
            <Box component="span" sx={{ color: 'text.secondary', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {o.org.name} · {orgTypeLabel(o.org.type, isAr)}
            </Box>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {o.count}
            </Box>
          </Box>
        )}
        renderInput={(params) => <TextField {...params} label={tr('If this organization left…', 'لو غادرت هذه المنظمة…')} />}
        sx={{ maxWidth: 520, mb: 1.25, '& .MuiInputBase-root': { bgcolor: 'white', fontSize: '0.85rem' } }}
      />
      {exitOption && (
        <>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
            {(
              [
                ['uncovered', tr('left with no partner', 'تبقى بلا شريك')],
                ['cluster-lost', tr('lose a core cluster', 'تفقد قطاعًا أساسيًا')],
                ['reduced', tr('keep other partners', 'تحتفظ بشركاء آخرين')],
              ] as [ExitImpact, string][]
            ).map(([impact, label]) => (
              <Box key={impact} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, py: 0.5, borderRadius: 1, bgcolor: `${EXIT_COLORS[impact]}22`, border: `1px solid ${EXIT_COLORS[impact]}` }}>
                <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1, color: impact === 'reduced' ? '#8D6E00' : EXIT_COLORS[impact] }}>
                  {counts[impact]}
                </Typography>
                <Typography variant="caption" sx={{ lineHeight: 1.2 }}>
                  {tr('localities', 'محلية')}
                  <br />
                  {label}
                </Typography>
              </Box>
            ))}
          </Box>
          {counts.uncovered > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
              {tr(
                `The localities left with no partner had ${uncoveredEvents} conflict events in ${period}.`,
                `شهدت المحليات التي ستبقى بلا شريك ${uncoveredEvents} حدث نزاع خلال ${period}.`,
              )}
            </Typography>
          )}
          <Box component="ul" sx={{ m: 0, p: 0, columns: { xs: 1, lg: 2 }, columnGap: 3 }}>
            {exit.slice(0, LIST_ITEMS * 2).map((e) => (
              <Box component="li" key={e.profile.key} {...clickable(e.profile.key)} sx={{ ...rowSx(e.profile.key), breakInside: 'avoid' }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: EXIT_COLORS[e.impact], flexShrink: 0 }} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  {place(e.profile)}
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.3 }}>
                    {e.impact === 'uncovered'
                      ? tr(`No partner left · ${e.orgActivities} activities lost`, `لا شريك متبقٍ · تفقد ${e.orgActivities} نشاطًا`)
                      : e.impact === 'cluster-lost'
                        ? tr(`Loses all ${e.lostClusters.join(', ')}`, `تفقد كل ${e.lostClusters.map((c) => clusterLabel(c, true)).join('، ')}`)
                        : tr(`${e.remainingPartners} partners remain`, `يبقى ${e.remainingPartners} شركاء`)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          {exit.length > LIST_ITEMS * 2 && (
            <Typography variant="caption" color="text.secondary">
              {tr(`+${exit.length - LIST_ITEMS * 2} more on the map`, `+${exit.length - LIST_ITEMS * 2} أخرى على الخريطة`)}
            </Typography>
          )}
        </>
      )}
    </Box>
  );

  // ------------------------------------------------------------ Matrix tab
  const matrixTab = (
    <Box sx={{ overflowX: 'auto' }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
        {tr('Partners per core cluster in the most conflict-affected localities. Red = nobody.', 'عدد الشركاء لكل قطاع أساسي في أكثر المحليات تأثرًا بالنزاع. الأحمر = لا أحد.')}
      </Typography>
      <Box component="table" sx={{ borderCollapse: 'separate', borderSpacing: 3, width: '100%', minWidth: 520, fontSize: '0.75rem', fontFamily: 'Roboto, sans-serif', '& th': { fontSize: '0.72rem' } }}>
        <thead>
          <tr>
            <Box component="th" sx={{ textAlign: 'start', fontWeight: 600, color: 'text.secondary' }}>
              {tr('Locality', 'المحلية')}
            </Box>
            <Box component="th" sx={{ fontWeight: 600, color: 'text.secondary', width: 64 }}>
              {tr('Events', 'الأحداث')}
            </Box>
            {CORE_CLUSTERS.map((c) => (
              <Box component="th" key={c} sx={{ fontWeight: 600, color: 'text.secondary', width: 70 }}>
                {isAr ? SHORT_AR[c] : SHORT_EN[c]}
              </Box>
            ))}
          </tr>
        </thead>
        <tbody>
          {matrix.map(({ profile, cells }) => (
            <Box component="tr" key={profile.key} {...clickable(profile.key)} sx={{ cursor: 'pointer', '&:hover td': { filter: 'brightness(0.95)' } }}>
              <Box component="td" sx={{ py: 0.25, px: 0.75, borderRadius: 1, bgcolor: selected?.key === profile.key ? unBlue.light : 'transparent' }}>
                {place(profile)}
              </Box>
              <Box component="td" sx={{ textAlign: 'center', fontWeight: 600 }}>
                {profile.events}
              </Box>
              {cells.map((n, i) => (
                <Tooltip key={i} title={`${clusterLabel(CORE_CLUSTERS[i], isAr)}: ${n} ${tr('partners', 'شركاء')}`}>
                  <Box component="td" sx={{ textAlign: 'center', fontWeight: 700, borderRadius: 1, py: 0.5, bgcolor: matrixCellColor(n), color: n === 0 ? 'white' : 'text.primary' }}>
                    {n}
                  </Box>
                </Tooltip>
              ))}
            </Box>
          ))}
        </tbody>
      </Box>
    </Box>
  );

  // ------------------------------------------------------------ Profile card
  const profileCard = selected ? (
    (() => {
      const p = selected;
      const missing = missingCore(p);
      const change = presenceChange(p);
      const topOrgs = Array.from(p.orgActivities).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const maxOrg = topOrgs[0]?.[1] ?? 1;
      const maxMonth = Math.max(1, ...p.monthly);
      const stat = (label: string, value: ReactNode, color?: string) => (
        <Box sx={{ flex: '1 1 0', minWidth: 60 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1.1, color: color ?? unBlue.dark }}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1, display: 'block' }}>
            {label}
          </Typography>
        </Box>
      );
      return (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <PlaceOutlinedIcon sx={{ color: unBlue.DEFAULT, mt: 0.25 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {names.locality(p.name)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {names.state(p.state)}
                {selectedRank && tr(` · priority #${selectedRank.rank} (score ${pct(selectedRank.score)})`, ` · الأولوية رقم ${selectedRank.rank} (الدرجة ${pct(selectedRank.score)})`)}
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => onSelect(null)} aria-label={tr('Close', 'إغلاق')}>
              ×
            </IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, my: 1.25 }}>
            {stat(tr('conflict events', 'حدث نزاع'), p.events, '#C62828')}
            {stat(tr('fatalities', 'وفاة'), p.fatalities, '#C62828')}
            {stat(tr('partners', 'شريك'), partnerCount(p))}
            {stat(tr('activities', 'نشاط'), p.activities)}
          </Box>

          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
            {tr('Core clusters', 'القطاعات الأساسية')}
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5, mb: 1.25 }}>
            {CORE_CLUSTERS.map((c) => {
              const n = p.clusterOrgs.get(c)?.size ?? 0;
              return (
                <Chip
                  key={c}
                  size="small"
                  label={`${clusterLabel(c, isAr)} · ${n}`}
                  sx={{ fontSize: '0.68rem', height: 22, bgcolor: matrixCellColor(n), color: n === 0 ? 'white' : 'text.primary', fontWeight: n === 0 ? 700 : 500 }}
                />
              );
            })}
          </Box>

          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
            {tr('Partners (activities reported)', 'الشركاء (الأنشطة المُبلَّغ عنها)')}
          </Typography>
          {topOrgs.length ? (
            topOrgs.map(([oi, n]) => (
              <Box key={oi} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.25 }}>
                <Typography variant="caption" sx={{ width: 64, fontWeight: 600 }} noWrap>
                  {data.orgs[oi].acronym || data.orgs[oi].name}
                </Typography>
                <Box sx={{ flex: 1, height: 8, bgcolor: '#EEF1F5', borderRadius: 4 }}>
                  <Box sx={{ width: `${(n / maxOrg) * 100}%`, height: '100%', bgcolor: unBlue.DEFAULT, borderRadius: 4 }} />
                </Box>
                <Typography variant="caption" sx={{ width: 24, textAlign: 'end' }}>
                  {n}
                </Typography>
              </Box>
            ))
          ) : (
            <Typography variant="caption" color="error">
              {tr('No partner reports any activity here.', 'لا يبلّغ أي شريك عن نشاط هنا.')}
            </Typography>
          )}
          {partnerCount(p) > topOrgs.length && (
            <Typography variant="caption" color="text.secondary">
              {tr(`+${partnerCount(p) - topOrgs.length} more`, `+${partnerCount(p) - topOrgs.length} أخرى`)}
            </Typography>
          )}

          <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mt: 1.25 }}>
            {tr('Activities per month', 'الأنشطة شهريًا')}
            {change !== null && (
              <Typography component="span" variant="caption" sx={{ ml: 0.75, color: change < -0.2 ? '#C62828' : 'text.secondary' }}>
                {change >= 0 ? '+' : ''}
                {pct(change)}% {tr('2nd half vs 1st', 'النصف الثاني مقابل الأول')}
              </Typography>
            )}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 0.5, height: 44, mt: 0.5 }} dir="ltr">
            {p.monthly.map((n, i) => (
              <Tooltip key={i} title={`${formatMonth(months[i], isAr)}: ${n}`}>
                <Box sx={{ flex: 1, height: `${Math.max(4, (n / maxMonth) * 100)}%`, bgcolor: n ? unBlue.DEFAULT : '#E0E0E0', borderRadius: '3px 3px 0 0' }} />
              </Tooltip>
            ))}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5 }} dir="ltr">
            {months.map((m) => (
              <Typography key={m} variant="caption" sx={{ flex: 1, textAlign: 'center', fontSize: '0.6rem', color: 'text.secondary' }}>
                {formatMonth(m, isAr).split(' ')[0]}
              </Typography>
            ))}
          </Box>

          {missing.length > 0 && p.events > 0 && (
            <Box sx={{ mt: 1.25, p: 1, borderRadius: 1, bgcolor: '#FFEBEE' }}>
              <Typography variant="caption" sx={{ lineHeight: 1.4, display: 'block' }}>
                {tr(
                  `${p.events} conflict events, and no partner reports ${missing.join(', ')}.`,
                  `${p.events} حدث نزاع، ولا يبلّغ أي شريك عن ${missing.map((c) => clusterLabel(c, true)).join('، ')}.`,
                )}
              </Typography>
            </Box>
          )}
          <Button size="small" variant="outlined" onClick={() => onStateSelect(p.state)} sx={{ mt: 1.25, fontSize: '0.7rem' }}>
            {tr(`Filter dashboard to ${p.state}`, `صفِّ اللوحة على ${names.state(p.state)}`)}
          </Button>
        </Box>
      );
    })()
  ) : (
    <Box sx={{ height: '100%', minHeight: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'text.secondary', gap: 1 }}>
      <TravelExploreIcon sx={{ fontSize: 40, color: unBlue.DEFAULT, opacity: 0.6 }} />
      <Typography variant="body2">{tr('Click a locality on the map or in a list to open its profile.', 'انقر محلية على الخريطة أو في قائمة لعرض ملفها.')}</Typography>
    </Box>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.25 }}>
        <Typography variant="subtitle1" sx={{ fontFamily: 'Roboto, sans-serif', fontWeight: 700, color: unBlue.dark }}>
          {tr('Response Gap Explorer', 'مستكشف فجوات الاستجابة')}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1, minWidth: 220 }}>
          {tr(`3W partner activities joined to ACLED conflict events by locality, ${period}.`, `أنشطة الشركاء (3W) مربوطة بأحداث النزاع من ACLED حسب المحلية، ${period}.`)}
          {filterNote && tr(` Activities filtered to: ${filterNote}.`, ` الأنشطة مُصفّاة على: ${filterNote}.`)}
        </Typography>
        <FormControlLabel
          control={<Switch size="small" checked={showOnMap} onChange={(e) => onShowOnMapChange(e.target.checked)} />}
          label={<Typography variant="caption">{tr('Show on map', 'اعرض على الخريطة')}</Typography>}
        />
        <Tooltip title={tr('How this works', 'طريقة العمل')}>
          <IconButton size="small" onClick={() => setMethodOpen((v) => !v)} aria-expanded={methodOpen} aria-label={tr('Methodology', 'المنهجية')}>
            <ScienceOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Collapse in={methodOpen}>
        <Box sx={{ bgcolor: unBlue.light, borderRadius: 1, p: 1.5, my: 1 }}>
          <Typography variant="caption" component="div" sx={{ lineHeight: 1.7 }}>
            {isAr ? (
              <>
                تُربط المحليات بين 3W وACLED والحدود الإدارية بالاسم والولاية، للأشهر التي تغطيها بيانات 3W.
                <br />
                <strong>مؤشر الأولوية:</strong> متوسط مرجّح لأربعة عوامل بين 0 و1: شدة النزاع (الترتيب المئوي لأحداث ACLED)، قلة الشركاء (عكس الترتيب المئوي لعدد الشركاء النشطين)،
                نسبة القطاعات الأساسية الخمسة بلا شريك، وتراجع الأنشطة بين نصفي الفترة. الأوزان من اختيارك.
                <br />
                <strong>محاكاة المغادرة:</strong> تُزال أنشطة المنظمة المختارة، وتُصنَّف كل محلية كانت تعمل فيها: بلا شريك، أو تفقد قطاعًا أساسيًا لم يكن فيه غيرها، أو تحتفظ بشركاء آخرين.
                <br />
                <strong>حدود:</strong> 3W تعكس ما يبلّغ عنه الشركاء فقط، فغياب نشاط قد يعني غياب الإبلاغ. لا تتضمن البيانات أعداد المحتاجين، لذا فهذه أداة فرز وليست تقييمًا للاحتياجات.
              </>
            ) : (
              <>
                Localities are joined across 3W, ACLED and the admin boundaries by name and state, over the months the 3W data covers.
                <br />
                <strong>Priority index:</strong> a weighted average of four factors scaled 0–1: conflict intensity (percentile of ACLED events), few partners (inverse
                percentile of active partners), the share of the 5 core clusters with no partner, and the drop in activities between the two halves of the period. You
                choose the weights.
                <br />
                <strong>Partner exit:</strong> removes the chosen organization&apos;s activities and classes every locality it works in as left with no partner, losing a
                core cluster nobody else covers, or keeping other partners.
                <br />
                <strong>Limits:</strong> 3W shows what partners report, so a missing activity can mean missing reporting. There is no people-in-need data, so this is a
                triage tool, not a needs assessment.
              </>
            )}
          </Typography>
        </Box>
      </Collapse>

      <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', md: 'row' }, mt: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Tabs
            value={mode}
            onChange={(_, v) => onModeChange(v)}
            variant="scrollable"
            sx={{ minHeight: 36, mb: 1.25, '& .MuiTab-root': { minHeight: 36, textTransform: 'none', fontSize: '0.8rem', fontWeight: 600 } }}
          >
            <Tab value="priority" label={tr('Priority index', 'مؤشر الأولوية')} />
            <Tab value="exit" label={tr('If a partner leaves', 'لو غادر شريك')} />
            <Tab value="matrix" label={tr('Coverage matrix', 'مصفوفة التغطية')} />
          </Tabs>
          {mode === 'priority' ? priorityTab : mode === 'exit' ? exitTab : matrixTab}
        </Box>
        <Box sx={{ width: { xs: '100%', md: 330 }, flexShrink: 0, borderInlineStart: { md: `1px solid ${unBlue.light}` }, pl: { md: 2.5 } }}>{profileCard}</Box>
      </Box>
    </Box>
  );
}
