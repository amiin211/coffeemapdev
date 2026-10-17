// In-scene overlays (date, counters, captions, title card) drawn on a 2D
// canvas from the SceneState alone. The interactive view draws them on a
// canvas above the WebGL canvas; the video export composites them into each
// frame, so the video carries them without any HTML.

import { DEPTH_CLASSES, SITE_URL, TIMING } from './config';
import { smoothstep, type SceneState } from './timeline';

export interface OverlayOptions {
  locale: 'en' | 'ar';
  /** Interactive view: date and captions only (stat tiles show the counters). */
  compact: boolean;
  illustrative: boolean;
  place: { en: string; ar: string };
  fontFamily: string;
}

const T = (o: OverlayOptions, en: string, ar: string) => (o.locale === 'ar' ? ar : en);
const num = (o: OverlayOptions, n: number, digits = 0) =>
  n.toLocaleString(o.locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export function formatDate(iso: string, locale: 'en' | 'ar') {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale === 'ar' ? 'ar-u-nu-latn' : 'en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export function drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number, s: SceneState, o: OverlayOptions) {
  ctx.clearRect(0, 0, w, h);
  const rtl = o.locale === 'ar';
  // Layout unit: 1 at 1080 px tall; the interactive view scales with its size.
  const k = o.compact ? Math.min(Math.max(Math.min(w, h) / 760, 0.62), 1) : Math.min(w, h) / 1080;
  const pad = 40 * k;
  const X = (x: number) => (rtl ? w - x : x);
  ctx.save();
  ctx.direction = rtl ? 'rtl' : 'ltr';
  ctx.textBaseline = 'alphabetic';
  const font = (weight: number, size: number) => `${weight} ${Math.round(size * k)}px ${o.fontFamily}`;

  const panel = (x: number, y: number, pw: number, ph: number, alpha: number) => {
    ctx.fillStyle = `rgba(8, 26, 40, ${0.62 * alpha})`;
    ctx.beginPath();
    ctx.roundRect(rtl ? w - x - pw : x, y, pw, ph, 14 * k);
    ctx.fill();
  };
  const text = (str: string, x: number, y: number, weight: number, size: number, color: string, align: CanvasTextAlign = 'start') => {
    ctx.font = font(weight, size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(str, X(x), y);
  };

  // --- date, water level and rain (flood phase) ---------------------------
  const flood = smoothstep(TIMING.FLOOD_START - 0.8, TIMING.FLOOD_START + 0.4, s.t) * (1 - s.titleAlpha);
  if (flood > 0.01) {
    ctx.globalAlpha = flood;
    panel(pad, pad, 430 * k, 150 * k, 1);
    text(formatDate(s.date, o.locale), pad + 24 * k, pad + 62 * k, 700, 44, '#ffffff');
    text(`${T(o, 'Water level', 'منسوب المياه')}  ${num(o, s.waterLevel, 2)} ${T(o, 'm', 'م')}`, pad + 24 * k, pad + 100 * k, 500, 24, '#9fd6f5');
    text(`${T(o, 'Rainfall', 'الأمطار')}  ${num(o, s.rainfall)} ${T(o, 'mm/day', 'مم/يوم')}`, pad + 24 * k, pad + 132 * k, 500, 24, '#cfd8dc');

    if (!o.compact) {
      const cw = 400 * k;
      const cx = w - pad - cw; // panel's left edge in LTR terms
      panel(w - pad - cw, pad, cw, 150 * k, 1);
      const end = w - pad - 24 * k; // right-aligned in LTR, mirrored in RTL
      const counter = (label: string, value: string, y: number) => {
        text(label, cx + 24 * k, y, 500, 22, '#cfd8dc');
        text(value, end, y, 700, 34, '#ffcc80', 'end');
      };
      counter(T(o, 'Buildings affected', 'المباني المتأثرة'), num(o, s.buildingsAffected), pad + 64 * k);
      counter(T(o, 'Est. people affected', 'السكان المتأثرون (تقديري)'), num(o, s.peopleAffected), pad + 116 * k);

      // Depth legend
      const ly = h - pad - 52 * k;
      panel(pad, ly, 560 * k, 52 * k, 1);
      let lx = pad + 20 * k;
      ctx.font = font(500, 20);
      for (const c of DEPTH_CLASSES) {
        ctx.fillStyle = c.color;
        ctx.fillRect(rtl ? w - lx - 18 * k : lx, ly + 17 * k, 18 * k, 18 * k);
        const label = rtl ? c.labelAr : c.label;
        text(label, lx + 26 * k, ly + 33 * k, 500, 20, '#ffffff');
        lx += 26 * k + ctx.measureText(label).width + 26 * k;
      }
    }
    ctx.globalAlpha = 1;
  }

  // --- illustrative badge ---------------------------------------------------
  if (o.illustrative) {
    const label = T(o, 'ILLUSTRATIVE SAMPLE — not observed data', 'عينة توضيحية — ليست بيانات مرصودة');
    ctx.font = font(700, 20);
    const bw = ctx.measureText(label).width + 32 * k;
    // On narrow (square) frames the badge sits above the depth legend.
    const by = h - pad - 40 * k - (!o.compact && w / k < 1400 ? 68 * k : 0);
    ctx.fillStyle = 'rgba(183, 28, 28, 0.85)';
    ctx.beginPath();
    ctx.roundRect(rtl ? pad : w - pad - bw, by, bw, 40 * k, 8 * k);
    ctx.fill();
    text(label, w - pad - 16 * k, by + 27 * k, 700, 20, '#ffffff', 'end');
  }

  // --- opening caption --------------------------------------------------------
  if (s.introAlpha > 0.01) {
    ctx.globalAlpha = s.introAlpha;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = 12 * k;
    const y = h * 0.78;
    text(rtl ? o.place.ar : o.place.en, pad * 1.5, y, 800, 64, '#ffffff');
    text(T(o, 'Blue Nile · September 2020 flood', 'النيل الأزرق · فيضان سبتمبر 2020'), pad * 1.5, y + 46 * k, 500, 30, '#d6ecf8');
    ctx.shadowColor = 'transparent';
    ctx.globalAlpha = 1;
  }

  // --- closing title card ------------------------------------------------------
  if (s.titleAlpha > 0.01) {
    ctx.globalAlpha = s.titleAlpha;
    const g = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.75);
    g.addColorStop(0, 'rgba(1, 40, 70, 0)');
    g.addColorStop(0.5, 'rgba(1, 40, 70, 0.72)');
    g.addColorStop(1, 'rgba(1, 40, 70, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.3, w, h * 0.45);
    ctx.textAlign = 'center';
    ctx.font = font(800, 84);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(T(o, 'Blue Nile Flood Twin', 'التوأم الرقمي لفيضان النيل الأزرق'), w / 2, h * 0.5);
    ctx.font = font(500, 32);
    ctx.fillStyle = '#d6ecf8';
    ctx.fillText(`${rtl ? o.place.ar : o.place.en} · ${T(o, 'September 2020 flood', 'فيضان سبتمبر 2020')}`, w / 2, h * 0.5 + 56 * k);
    ctx.font = font(700, 30);
    ctx.fillStyle = '#4fc3f7';
    ctx.direction = 'ltr';
    ctx.fillText(SITE_URL, w / 2, h * 0.5 + 112 * k);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}
