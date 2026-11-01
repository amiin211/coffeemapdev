'use client';

// Insights + greening simulator panel for the Riyadh Urban Heat dashboard.
// Analytics live in src/lib/urbanCooling.ts.

import { Box, Button, Chip, Divider, IconButton, LinearProgress, Slider, Tab, Tabs, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ParkIcon from '@mui/icons-material/Park';
import NaturePeopleIcon from '@mui/icons-material/NaturePeople';
import RoofingIcon from '@mui/icons-material/Roofing';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AdsClickIcon from '@mui/icons-material/AdsClick';
import PlaceIcon from '@mui/icons-material/Place';
import {
  CityBriefItem,
  CoolingModel,
  GREEN_RIYADH,
  Intervention,
  InterventionKind,
  KIND_COLOR,
  Simulation,
  Site,
  TREE_COST_SAR,
  TREE_CROWN_M2,
  TREE_WATER_L_DAY,
} from '@/lib/urbanCooling';
import { useI18n } from '@/i18n';

const desert = { DEFAULT: '#D84315', dark: '#8E2412' };
const TONE: Record<CityBriefItem['tone'], string> = { good: '#2E7D32', warn: '#F9A825', bad: '#D50000', info: '#546E7A' };
export const BUDGETS = [0, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000, 2_000_000];

const compact = (v: number, ar: boolean) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}${ar ? ' مليار' : 'B'}`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 0 : 1)}${ar ? ' مليون' : 'M'}`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(v >= 1e4 ? 0 : 1)}${ar ? ' ألف' : 'k'}`;
  return Math.round(v).toLocaleString('en-US');
};

export interface PlannerProps {
  tab: 'insights' | 'plan';
  onTab: (t: 'insights' | 'plan') => void;
  brief: CityBriefItem[];
  model: CoolingModel | null;
  onFocus: (f: { lon: number; lat: number }) => void;
  // plan
  tool: InterventionKind;
  onTool: (t: InterventionKind) => void;
  radius: number;
  onRadius: (r: number) => void;
  boost: number;
  onBoost: (b: number) => void;
  placing: boolean;
  onPlacing: (v: boolean) => void;
  interventions: Intervention[];
  onRemove: (id: number) => void;
  onClear: () => void;
  budgetIndex: number;
  onBudgetIndex: (i: number) => void;
  sites: Site[];
  sim: Simulation | null;
  simulating: boolean;
  ready: boolean;
}

function Delta({ label, before, after, unit = '', digits = 1, goodDown = false }: { label: string; before: number; after: number; unit?: string; digits?: number; goodDown?: boolean }) {
  const d = after - before;
  const good = goodDown ? d < 0 : d > 0;
  const shown = Math.abs(d) >= 0.5 * 10 ** -digits;
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', py: 0.35, borderBottom: '1px solid', borderColor: 'divider', gap: 1 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
        <bdi>{Number.isFinite(before) ? before.toFixed(digits) : '–'} → {Number.isFinite(after) ? after.toFixed(digits) : '–'}{unit}</bdi>
        {shown && (
          <Box component="span" sx={{ color: good ? '#2E7D32' : '#C62828', ml: 0.5 }}>
            <bdi>({d > 0 ? '+' : ''}{d.toFixed(digits)})</bdi>
          </Box>
        )}
      </Typography>
    </Box>
  );
}

export default function UrbanGreenPlanner(p: PlannerProps) {
  const { isAr, tr } = useI18n();
  const degC = isAr ? ' °م' : ' °C';
  const s = p.sim;
  const hasPlan = p.interventions.length > 0 || BUDGETS[p.budgetIndex] > 0;

  const insights = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
          <AutoAwesomeIcon sx={{ fontSize: 17, color: desert.DEFAULT }} />
          <Typography variant="subtitle2">{tr('City brief', 'موجز المدينة')}</Typography>
          <Typography variant="caption" color="text.secondary">{tr('· written from the loaded data', '· يُكتب من البيانات المحمّلة')}</Typography>
        </Box>
        {!p.ready && <LinearProgress sx={{ my: 1 }} />}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
          {p.brief.map((it, i) => (
            <Box
              key={i}
              onClick={() => it.focus && p.onFocus(it.focus)}
              sx={{
                borderInlineStart: `3px solid ${TONE[it.tone]}`,
                px: 1,
                py: 0.4,
                borderRadius: 0.5,
                bgcolor: 'rgba(0,0,0,0.02)',
                cursor: it.focus ? 'pointer' : 'default',
                '&:hover': it.focus ? { bgcolor: '#fdf1ea' } : undefined,
              }}
            >
              <Typography variant="caption" sx={{ lineHeight: 1.5, display: 'block' }}>{isAr ? it.ar : it.en}</Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {p.model && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.25 }}>{tr('What cools Riyadh? (fitted model)', 'ما الذي يبرّد الرياض؟ (نموذج مُدرَّب)')}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, lineHeight: 1.4 }}>
            {tr('Least squares on every other built-up cell: surface temperature against canopy, neighbourhood canopy, building density and elevation.', 'المربعات الصغرى على كل خلية مبنية ثانية: حرارة السطح مقابل مظلة الخلية ومظلة الجوار وكثافة المباني والارتفاع.')}
          </Typography>
          {([
            [tr('Tree canopy in the cell (0→1)', 'مظلة الأشجار في الخلية (0←1)'), p.model.coef.canopy],
            [tr('Canopy within 300 m (0→1)', 'المظلة ضمن 300 م (0←1)'), p.model.coef.canopyNearby],
            [tr('Building density (0→1)', 'كثافة المباني (0←1)'), p.model.coef.built],
            [tr('Elevation (per +100 m)', 'الارتفاع (لكل +100 م)'), p.model.coef.elevation],
          ] as [string, number][]).map(([label, v]) => (
            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.25 }}>
              <Typography variant="caption" sx={{ flex: 1 }}>{label}</Typography>
              <Box sx={{ width: 90, height: 8, bgcolor: 'grey.100', position: 'relative', borderRadius: 1 }}>
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: v < 0 ? `${50 - Math.min(50, (Math.abs(v) / 15) * 50)}%` : '50%',
                    width: `${Math.min(50, (Math.abs(v) / 15) * 50)}%`,
                    bgcolor: v < 0 ? '#1E88E5' : '#E53935',
                    borderRadius: 1,
                  }}
                />
                <Box sx={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: '1px', bgcolor: 'grey.500' }} />
              </Box>
              <Typography variant="caption" sx={{ width: 54, textAlign: 'end', fontWeight: 700, color: v < 0 ? '#1565C0' : '#C62828' }}>
                <bdi>{v > 0 ? '+' : ''}{v.toFixed(1)}{degC}</bdi>
              </Typography>
            </Box>
          ))}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            <bdi>R² {p.model.r2.toFixed(2)} · RMSE {p.model.rmse.toFixed(1)}{degC} · n {p.model.n.toLocaleString('en-US')}</bdi>
            {p.model.fallback && tr(' · no canopy cooling found: simulator uses −0.4 °C per +10% canopy', ' · لم يُرصد تبريد من المظلة: يستخدم المحاكي −0.4 °م لكل +10% مظلة')}
          </Typography>
        </Box>
      )}

      <Button variant="contained" onClick={() => p.onTab('plan')} startIcon={<NaturePeopleIcon />} sx={{ textTransform: 'none', bgcolor: '#2E7D32', '&:hover': { bgcolor: '#1B5E20' } }} disabled={!p.ready}>
        {tr('Plan a greener Riyadh', 'خطّط لرياض أكثر خضرة')}
      </Button>
    </Box>
  );

  const plan = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <Box>
        <Typography variant="subtitle2">{tr('1 · Auto-site a tree budget', '1 · توزيع آلي لميزانية الأشجار')}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.4 }}>
          {tr('Trees go where heat risk × lack of access is highest, bringing each cell to 35% canopy.', 'تُزرع الأشجار حيث يكون حاصل مخاطر الحرارة × نقص الوصول أعلى، لترفع كل خلية إلى مظلة 35%.')}
        </Typography>
        <Box sx={{ px: 1 }}>
          <Slider
            size="small"
            value={p.budgetIndex}
            min={0}
            max={BUDGETS.length - 1}
            step={1}
            marks
            onChange={(_, v) => p.onBudgetIndex(v as number)}
            valueLabelDisplay="auto"
            valueLabelFormat={(i) => (BUDGETS[i] ? `${compact(BUDGETS[i], isAr)} ${tr('trees', 'شجرة')}` : tr('off', 'إيقاف'))}
            disabled={!p.ready}
            sx={{ color: '#2E7D32' }}
          />
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 700 }}>
          {BUDGETS[p.budgetIndex]
            ? tr(`${compact(BUDGETS[p.budgetIndex], false)} trees · ${((BUDGETS[p.budgetIndex] / GREEN_RIYADH.trees) * 100).toFixed(1)}% of Green Riyadh's 7.5 M`, `${compact(BUDGETS[p.budgetIndex], true)} شجرة · ${((BUDGETS[p.budgetIndex] / GREEN_RIYADH.trees) * 100).toFixed(1)}% من 7.5 مليون للرياض الخضراء`)
            : tr('Auto-siting off', 'التوزيع الآلي متوقف')}
        </Typography>
      </Box>

      <Divider />
      <Box>
        <Typography variant="subtitle2">{tr('2 · Place your own interventions', '2 · ضع تدخلاتك بنفسك')}</Typography>
        <ToggleButtonGroup
          size="small"
          exclusive
          fullWidth
          value={p.tool}
          onChange={(_, v) => v && p.onTool(v)}
          sx={{ my: 0.75, '& .MuiToggleButton-root': { textTransform: 'none', fontSize: '0.72rem', py: 0.4, gap: 0.5 } }}
        >
          <ToggleButton value="trees"><NaturePeopleIcon sx={{ fontSize: 16, color: KIND_COLOR.trees }} />{tr('Street trees', 'أشجار الشوارع')}</ToggleButton>
          <ToggleButton value="park"><ParkIcon sx={{ fontSize: 16, color: KIND_COLOR.park }} />{tr('Pocket park', 'حديقة صغيرة')}</ToggleButton>
          <ToggleButton value="coolroof"><RoofingIcon sx={{ fontSize: 16, color: KIND_COLOR.coolroof }} />{tr('Cool roofs', 'أسطح باردة')}</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ px: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">{tr('Radius', 'نصف القطر')}</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>{p.radius} {tr('m', 'م')}</Typography>
          </Box>
          <Slider size="small" value={p.radius} min={p.tool === 'park' ? 60 : 150} max={p.tool === 'park' ? 400 : 1200} step={10} onChange={(_, v) => p.onRadius(v as number)} sx={{ py: 1 }} />
          {p.tool !== 'park' && (
            <>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption">{p.tool === 'trees' ? tr('Canopy added', 'المظلة المضافة') : tr('Roofs & pavements treated', 'الأسطح والأرصفة المعالجة')}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>+{Math.round(p.boost * 100)}%</Typography>
              </Box>
              <Slider size="small" value={p.boost} min={0.05} max={p.tool === 'trees' ? 0.4 : 1} step={0.05} onChange={(_, v) => p.onBoost(v as number)} sx={{ py: 1 }} />
            </>
          )}
        </Box>
        <Button
          fullWidth
          variant={p.placing ? 'contained' : 'outlined'}
          startIcon={<AdsClickIcon />}
          onClick={() => p.onPlacing(!p.placing)}
          disabled={!p.ready}
          sx={{ textTransform: 'none', borderColor: KIND_COLOR[p.tool], color: p.placing ? 'white' : KIND_COLOR[p.tool], bgcolor: p.placing ? KIND_COLOR[p.tool] : undefined, '&:hover': { bgcolor: p.placing ? KIND_COLOR[p.tool] : undefined } }}
        >
          {p.placing ? tr('Click the map to place · click here to stop', 'انقر الخريطة للوضع · انقر هنا للإيقاف') : tr('Place on the map', 'ضع على الخريطة')}
        </Button>
        {p.interventions.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.75, alignItems: 'center' }}>
            {p.interventions.map((iv, i) => (
              <Chip
                key={iv.id}
                size="small"
                onClick={() => p.onFocus({ lon: iv.lon, lat: iv.lat })}
                onDelete={() => p.onRemove(iv.id)}
                label={`${i + 1}. ${iv.kind === 'trees' ? tr('Trees', 'أشجار') : iv.kind === 'park' ? tr('Park', 'حديقة') : tr('Cool roofs', 'أسطح باردة')} ${iv.radius}${tr('m', 'م')}`}
                sx={{ height: 22, fontSize: '0.66rem', borderInlineStart: `3px solid ${KIND_COLOR[iv.kind]}` }}
              />
            ))}
            <Tooltip title={tr('Remove all', 'إزالة الكل')}>
              <IconButton size="small" onClick={p.onClear}><DeleteOutlineIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      <Divider />
      <Box>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {tr('3 · Simulated outcome', '3 · النتيجة المحاكاة')}
          {p.simulating && <LinearProgress sx={{ flex: 1 }} />}
        </Typography>
        {!hasPlan || !s ? (
          <Typography variant="caption" color="text.secondary">{tr('Set a tree budget or place an intervention to see the cooling.', 'حدد ميزانية أشجار أو ضع تدخلًا لرؤية أثر التبريد.')}</Typography>
        ) : (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.75, my: 0.75 }}>
              {[
                [compact(s.trees, isAr), tr('trees', 'شجرة'), '#2E7D32'],
                [`${s.peakCooling.toFixed(1)}${degC}`, tr('peak cooling', 'أقصى تبريد'), '#1565C0'],
                [`${s.cooledKm2.toFixed(1)} ${tr('km²', 'كم²')}`, tr('cooled ≥ 0.5 °C', 'مُبرَّدة ≥ 0.5 °م'), '#1565C0'],
              ].map(([v, l, c]) => (
                <Box key={l} sx={{ p: 0.75, borderRadius: 1, bgcolor: 'rgba(0,0,0,0.03)', textAlign: 'center' }}>
                  <Typography sx={{ fontWeight: 800, color: c, fontSize: '0.95rem', lineHeight: 1.2 }}><bdi>{v}</bdi></Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.62rem' }}>{l}</Typography>
                </Box>
              ))}
            </Box>
            <Delta label={tr('Mean urban surface temp.', 'متوسط حرارة السطح الحضري')} before={s.urbanLstBefore} after={s.urbanLstAfter} unit={degC} digits={2} goodDown />
            <Delta label={tr('Urban tree canopy', 'مظلة الأشجار الحضرية')} before={s.urbanCanopyPctBefore} after={s.urbanCanopyPctAfter} unit="%" />
            <Delta label={tr('Priority zones', 'مناطق الأولوية')} before={s.priorityKm2Before} after={s.priorityKm2After} unit={tr(' km²', ' كم²')} goodDown />
            <Delta label={tr('Mean canopy equity', 'متوسط عدالة المظلة')} before={s.equityBefore} after={s.equityAfter} digits={3} />
            <Box sx={{ mt: 0.75, p: 1, borderRadius: 1, bgcolor: '#f1f8e9' }}>
              <Typography variant="caption" sx={{ display: 'block', lineHeight: 1.55 }}>
                <b>{tr('Green Riyadh:', 'الرياض الخضراء:')}</b>{' '}
                {tr(`${(s.shareOfGreenRiyadh * 100).toFixed(1)}% of the 7.5 million-tree target; urban canopy ${s.urbanCanopyPctAfter.toFixed(1)}% of the ${GREEN_RIYADH.greenCoverPct}% green-cover goal.`, `${(s.shareOfGreenRiyadh * 100).toFixed(1)}% من هدف 7.5 مليون شجرة؛ المظلة الحضرية ${s.urbanCanopyPctAfter.toFixed(1)}% من هدف تغطية خضراء ${GREEN_RIYADH.greenCoverPct}%.`)}
              </Typography>
              <LinearProgress variant="determinate" value={Math.min(100, (s.urbanCanopyPctAfter / GREEN_RIYADH.greenCoverPct) * 100)} sx={{ mt: 0.5, height: 6, borderRadius: 1, bgcolor: '#dcedc8', '& .MuiLinearProgress-bar': { bgcolor: '#2E7D32' } }} />
              <Typography variant="caption" sx={{ display: 'block', mt: 0.75, lineHeight: 1.55 }}>
                <b>{tr('Water:', 'المياه:')}</b> <bdi>{compact(s.waterM3Day[0], isAr)}–{compact(s.waterM3Day[1], isAr)}</bdi> {tr('m³/day', 'م³/يوم')} ·{' '}
                <b>{tr('Cost:', 'التكلفة:')}</b> <bdi>{compact(s.costSar[0], isAr)}–{compact(s.costSar[1], isAr)}</bdi> {tr('SAR', 'ريال')}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.62rem', lineHeight: 1.4, mt: 0.25 }}>
                {tr(
                  `Indicative: ${TREE_CROWN_M2} m² crown per tree, ${TREE_WATER_L_DAY[0]}–${TREE_WATER_L_DAY[1]} L/tree/day drip irrigation, ${TREE_COST_SAR[0]}–${TREE_COST_SAR[1]} SAR per planted tree.`,
                  `تقديري: تاج ${TREE_CROWN_M2} م² لكل شجرة، ري بالتنقيط ${TREE_WATER_L_DAY[0]}–${TREE_WATER_L_DAY[1]} لتر/شجرة/يوم، ${TREE_COST_SAR[0]}–${TREE_COST_SAR[1]} ريال لكل شجرة مزروعة.`,
                )}
              </Typography>
            </Box>
          </>
        )}
      </Box>

      {p.sites.length > 0 && (
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{tr('Top planting sites', 'أهم مواقع التشجير')}</Typography>
          {p.sites.slice(0, 8).map((site, i) => (
            <Box
              key={i}
              onClick={() => p.onFocus({ lon: site.lon, lat: site.lat })}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.4, px: 0.5, cursor: 'pointer', borderRadius: 0.5, '&:hover': { bgcolor: '#fdf1ea' } }}
            >
              <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#2E7D32', color: 'white', fontSize: '0.68rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</Box>
              <Typography variant="caption" sx={{ flex: 1 }}>
                {site.district ? (isAr ? `قرب ${site.districtAr}` : `Near ${site.district}`) : <bdi>{site.lat.toFixed(3)}° N, {site.lon.toFixed(3)}° E</bdi>}
              </Typography>
              <Typography variant="caption" sx={{ fontWeight: 700 }}>{compact(site.trees, isAr)} {tr('trees', 'شجرة')}</Typography>
              <PlaceIcon sx={{ fontSize: 15, color: 'text.secondary' }} />
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Tabs
        value={p.tab}
        onChange={(_, v) => p.onTab(v)}
        variant="fullWidth"
        sx={{ minHeight: 36, flexShrink: 0, mb: 1, '& .MuiTab-root': { minHeight: 36, py: 0.5, textTransform: 'none', fontWeight: 600, fontSize: '0.8rem' }, '& .Mui-selected': { color: `${desert.dark} !important` }, '& .MuiTabs-indicator': { bgcolor: desert.DEFAULT } }}
      >
        <Tab value="insights" label={tr('Insights', 'الرؤى')} />
        <Tab value="plan" label={tr('Greening simulator', 'محاكي التشجير')} />
      </Tabs>
      <Box sx={{ overflowY: 'auto', minHeight: 0, flex: 1, pr: 0.5 }}>{p.tab === 'insights' ? insights : plan}</Box>
    </Box>
  );
}
