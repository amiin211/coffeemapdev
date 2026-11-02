// Renews the project-card thumbnails (public/images/*.png) and the
// architecture figure in the serverless article from the live pages.
//
//   npm run dev                      # in one terminal (or serve the static export)
//   node scripts/capture-thumbnails.mjs [baseUrl]   # default http://localhost:3000
//
// Needs network access: the dashboards fetch Planetary Computer, NASA POWER
// and OpenStreetMap live. Each shot is a 16:9 crop of the page's main view;
// a failed shot is reported and the old image is kept.
import { chromium } from 'playwright';

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/$/, '');
const VIEWPORT = { width: 1600, height: 1000 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Largest 16:9 rectangle centred in a box.
function crop169(box) {
  let width = box.width;
  let height = (width * 9) / 16;
  if (height > box.height) {
    height = box.height;
    width = (height * 16) / 9;
  }
  return { x: Math.round(box.x + (box.width - width) / 2), y: Math.round(box.y + (box.height - height) / 2), width: Math.round(width), height: Math.round(height) };
}

const SHOTS = [
  {
    out: 'public/images/urban-heat.png',
    path: '/projects/riyadh-urban-heat/',
    timeout: 300_000,
    async prepare(page) {
      await page.getByText('What cools Riyadh').waitFor({ timeout: 300_000 });
      await page.getByRole('button', { name: 'Plan a greener Riyadh' }).click();
      // Tree budget slider: step to 250k trees.
      const thumb = page.locator('.MuiSlider-root').filter({ has: page.locator('.MuiSlider-mark') }).first().locator('input[type="range"]');
      await thumb.focus();
      for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
      await page.getByText('Top planting sites').waitFor({ timeout: 120_000 });
      await sleep(4000);
    },
    target: '.maplibregl-map',
  },
  {
    out: 'public/images/crop.png',
    path: '/projects/geoai-crop-monitoring/',
    async prepare(page) {
      await page.getByText('Farm brief').waitFor({ timeout: 120_000 });
      await page.getByRole('button', { name: 'Health', exact: true }).click();
      await sleep(6000);
    },
    target: '.maplibregl-map',
  },
  {
    out: 'public/images/acled.png',
    path: '/projects/acled-conflict-dashboard/',
    async prepare(page) {
      await page.locator('.maplibregl-canvas').first().waitFor({ timeout: 120_000 });
      await sleep(3000);
      const chip = page.getByText('Show on map').first();
      if (await chip.count()) await chip.click();
      await sleep(4000);
    },
    target: '.maplibregl-map',
  },
  {
    out: 'public/images/3w.png',
    path: '/projects/3w-humanitarian-mapping/',
    async prepare(page) {
      await page.getByText('Top Organizations').first().waitFor({ timeout: 120_000 });
      await sleep(6000);
    },
    target: '.maplibregl-map',
  },
  {
    out: 'public/images/3d.png',
    path: '/projects/3d-mosque-viewer/',
    timeout: 240_000,
    async prepare(page) {
      await page.locator('canvas').first().waitFor({ timeout: 120_000 });
      await sleep(25_000); // model, terrain, orthophoto and HDRI
    },
    target: 'canvas',
  },
  {
    out: 'public/images/serverless-architecture.png',
    path: '/projects-static/serverless-geoai-architecture.html',
    async prepare(page) {
      await page.locator('#arch').waitFor();
      await sleep(1000);
    },
    target: '.stage',
    keepAspect: true,
  },
  {
    out: 'public/images/articles/serverless-geoai-architecture.png',
    path: '/projects-static/serverless-geoai-architecture.html',
    async prepare(page) {
      await page.locator('#arch').waitFor();
      await sleep(1000);
    },
    target: '#arch',
    keepAspect: true,
  },
];

const browser = await chromium.launch({ args: ['--ignore-gpu-blocklist', '--enable-webgl', '--use-gl=angle'] });
const results = [];
for (const shot of SHOTS) {
  const page = await browser.newPage({ viewport: VIEWPORT });
  page.setDefaultTimeout(shot.timeout ?? 120_000);
  try {
    await page.goto(BASE + shot.path, { waitUntil: 'domcontentloaded', timeout: 180_000 });
    await shot.prepare(page);
    const el = page.locator(shot.target).first();
    const box = await el.boundingBox();
    if (!box) throw new Error(`${shot.target} not visible`);
    const clip = shot.keepAspect ? { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.width), height: Math.round(box.height) } : crop169(box);
    await page.screenshot({ path: shot.out, clip, timeout: 120_000 });
    results.push(`OK    ${shot.out}  (${clip.width}×${clip.height})`);
  } catch (err) {
    results.push(`FAIL  ${shot.out}  ${String(err.message ?? err).split('\n')[0]}`);
  } finally {
    await page.close();
  }
}
await browser.close();
console.log(results.join('\n'));
