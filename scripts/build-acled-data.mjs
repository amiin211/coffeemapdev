#!/usr/bin/env node
// Builds public/data/acled_data.json from ACLED's "Sudan HRP political
// violence events and fatalities by month-year" Excel export (one row per
// admin2 × month).
// Usage: node scripts/build-acled-data.mjs <path-to-xlsx>

import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const xlsxPath = process.argv[2];
if (!xlsxPath) {
  console.error('Usage: node scripts/build-acled-data.mjs <path-to-xlsx>');
  process.exit(1);
}

// Dashboard scope: from the outbreak of the SAF–RSF war onward.
const START_MONTH = '2023-04';

// Minimal .xlsx reader: an .xlsx is a zip of XML parts; walk the central
// directory and inflate just the parts we need.
function unzip(buf) {
  const files = {};
  let eocd = buf.length - 22;
  while (buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  let ptr = buf.readUInt32LE(eocd + 16);
  const count = buf.readUInt16LE(eocd + 10);
  for (let i = 0; i < count; i++) {
    const method = buf.readUInt16LE(ptr + 10);
    const size = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const offset = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);
    const dataStart = offset + 30 + buf.readUInt16LE(offset + 26) + buf.readUInt16LE(offset + 28);
    const data = buf.subarray(dataStart, dataStart + size);
    files[name] = () => (method === 0 ? data : inflateRawSync(data)).toString('utf8');
    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const decode = (s) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

function readSheet(files, sheetName) {
  const shared = [...(files['xl/sharedStrings.xml']?.() ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    decode([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''))
  );
  const sheets = [...files['xl/workbook.xml']().matchAll(/<sheet [^>]*name="([^"]+)"/g)].map((m) => m[1]);
  const xml = files[`xl/worksheets/sheet${sheets.indexOf(sheetName) + 1}.xml`]();
  return [...xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)].map((row) => {
    const cells = {};
    for (const c of row[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, col, attrs, inner = ''] = c;
      const v = inner.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      if (/t="s"/.test(attrs)) cells[col] = shared[Number(v)];
      else if (/t="inlineStr"/.test(attrs)) cells[col] = decode(inner.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] ?? '');
      else cells[col] = v === undefined ? null : decode(v);
    }
    return cells;
  });
}

const [header, ...dataRows] = readSheet(unzip(readFileSync(xlsxPath)), 'Data');
const col = Object.fromEntries(Object.entries(header).map(([k, v]) => [v, k]));

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Names and centroids come from the COD boundaries (joined on pcode) so they
// match the map layers exactly — ACLED spells some states differently
// ("Al Jazirah" vs "Aj Jazirah").
const admin2 = JSON.parse(readFileSync(path.join(repoRoot, 'public/data/sdn_admin2.geojson'), 'utf8'));
const localities = admin2.features
  .map((f) => ({
    pcode: f.properties.adm2_pcode,
    name: f.properties.adm2_name,
    state: f.properties.adm1_name,
    lat: Number(f.properties.center_lat.toFixed(4)),
    lon: Number(f.properties.center_lon.toFixed(4)),
  }))
  .sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));
const localityIndex = new Map(localities.map((l, i) => [l.pcode, i]));

const cells = new Map();
const months = new Set();
let dropped = 0;
for (const r of dataRows) {
  const month = `${r[col.Year]}-${String(MONTH_NAMES.indexOf(r[col.Month]) + 1).padStart(2, '0')}`;
  if (month < START_MONTH) continue;
  months.add(month);
  const events = Number(r[col.Events]) || 0;
  const fatalities = Number(r[col.Fatalities]) || 0;
  const li = localityIndex.get(r[col['Admin2 Pcode']]);
  if (li === undefined) {
    // Pre-2011 southern regions carried with pcode "NA"; all zero since 2023.
    dropped += events;
    continue;
  }
  if (!events && !fatalities) continue;
  const key = `${month}|${li}`;
  const cell = cells.get(key) ?? { month, li, events: 0, fatalities: 0 };
  cell.events += events;
  cell.fatalities += fatalities;
  cells.set(key, cell);
}

const monthList = [...months].sort();
const monthIdx = new Map(monthList.map((m, i) => [m, i]));
const rows = [...cells.values()]
  .map((c) => [monthIdx.get(c.month), c.li, c.events, c.fatalities])
  .sort((a, b) => a[0] - b[0] || a[1] - b[1]);

const asOf = path.basename(xlsxPath).match(/as-of-(\d{1,2})([a-z]{3})(\d{4})/i);
const out = {
  asOf: asOf ? `${asOf[1]} ${asOf[2][0].toUpperCase()}${asOf[2].slice(1).toLowerCase()} ${asOf[3]}` : null,
  months: monthList,
  states: [...new Set(localities.map((l) => l.state))].sort(),
  localities,
  // [monthIndex, localityIndex, events, fatalities] — non-zero cells only
  rows,
};

writeFileSync(path.join(repoRoot, 'public/data/acled_data.json'), JSON.stringify(out));

const totals = rows.reduce((t, r) => [t[0] + r[2], t[1] + r[3]], [0, 0]);
console.log(
  `Wrote ${rows.length} locality-month cells, ${monthList[0]}–${monthList.at(-1)}: ` +
    `${totals[0]} events, ${totals[1]} fatalities (dropped ${dropped} events without a matching pcode)`
);
