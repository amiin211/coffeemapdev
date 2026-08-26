#!/usr/bin/env node
// Builds public/data/threew_data.json from a raw OCHA-style 3W CSV export.
// Usage: node scripts/build-threew-data.mjs <path-to-csv>

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const csvPath = process.argv[2];
if (!csvPath) {
  console.error('Usage: node scripts/build-threew-data.mjs <path-to-csv>');
  process.exit(1);
}

function parseCsv(text) {
  // Minimal RFC4180 parser: handles quoted fields containing commas/newlines.
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else field += c;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const raw = readFileSync(csvPath, 'latin1');
const [header, ...dataRows] = parseCsv(raw);
const col = Object.fromEntries(header.map((h, i) => [h.trim(), i]));

const records = dataRows.map((r) => ({
  month: r[col['Reporting Month']],
  state: r[col['State']],
  locality: r[col['Locality']],
  cluster: r[col['Cluster Name']],
  orgName: r[col['Org name']],
  orgAcronym: r[col['Org acronym']],
  orgType: r[col['Org type']],
}));

const admin1 = JSON.parse(readFileSync(path.join(repoRoot, 'public/data/sdn_admin1.geojson'), 'utf8'));
const admin2 = JSON.parse(readFileSync(path.join(repoRoot, 'public/data/sdn_admin2.geojson'), 'utf8'));

const stateCentroids = new Map(
  admin1.features.map((f) => [f.properties.adm1_name, { lat: f.properties.center_lat, lon: f.properties.center_lon }])
);
const localityCentroids = new Map(
  admin2.features.map((f) => [`${f.properties.adm1_name}::${f.properties.adm2_name}`, { lat: f.properties.center_lat, lon: f.properties.center_lon }])
);

function findLocalityCentroid(state, locality) {
  const direct = localityCentroids.get(`${state}::${locality}`);
  if (direct) return direct;
  // CSV disambiguates duplicate-named localities across states with a
  // "-XX" suffix (e.g. "Ar Rahad-NK") that the boundary geojson doesn't use.
  const base = locality.replace(/-[A-Z]{2,3}$/, '');
  return localityCentroids.get(`${state}::${base}`) ?? null;
}

const months = [...new Set(records.map((r) => r.month))].sort();
const states = admin1.features.map((f) => f.properties.adm1_name);
const clusters = [...new Set(records.map((r) => r.cluster))].sort();

// Dedupe orgs by acronym (a handful of acronyms have inconsistent full-name
// spellings in the source data); keep whichever name variant appears most.
const orgVariants = new Map();
for (const r of records) {
  const key = r.orgAcronym;
  if (!orgVariants.has(key)) orgVariants.set(key, { type: r.orgType, names: new Map() });
  const entry = orgVariants.get(key);
  entry.names.set(r.orgName, (entry.names.get(r.orgName) ?? 0) + 1);
}
const orgAcronyms = [...orgVariants.keys()].sort();
const orgs = orgAcronyms.map((acronym) => {
  const { type, names } = orgVariants.get(acronym);
  const name = [...names.entries()].sort((a, b) => b[1] - a[1])[0][0];
  return { name, acronym, type };
});

const localityKeySet = new Set(records.map((r) => `${r.state}::${r.locality}`));
const localities = [...localityKeySet].map((key) => {
  const [state, name] = key.split('::');
  const centroid = findLocalityCentroid(state, name);
  return { name, state, lat: centroid?.lat ?? null, lon: centroid?.lon ?? null };
});

const monthIdx = new Map(months.map((m, i) => [m, i]));
const stateIdx = new Map(states.map((s, i) => [s, i]));
const clusterIdx = new Map(clusters.map((c, i) => [c, i]));
const orgIdx = new Map(orgAcronyms.map((a, i) => [a, i]));
const localityIdx = new Map(localities.map((l, i) => [`${l.state}::${l.name}`, i]));

const rows = records.map((r) => [
  monthIdx.get(r.month),
  stateIdx.get(r.state),
  localityIdx.get(`${r.state}::${r.locality}`),
  clusterIdx.get(r.cluster),
  orgIdx.get(r.orgAcronym),
]);

const output = { months, states, clusters, orgs, localities, rows };

const outPath = path.join(repoRoot, 'public/data/threew_data.json');
writeFileSync(outPath, JSON.stringify(output));

const localitiesWithCoords = localities.filter((l) => l.lat !== null).length;
console.log(`Wrote ${outPath}`);
console.log(`  rows: ${rows.length}`);
console.log(`  months: ${months.length} (${months.join(', ')})`);
console.log(`  states: ${states.length}`);
console.log(`  clusters: ${clusters.length}`);
console.log(`  orgs: ${orgs.length}`);
console.log(`  localities: ${localities.length} (${localitiesWithCoords} with coordinates)`);
