// Evaluates the data part of the QA/QC page and lists every string a reader sees.
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '../../public/projects-static/geospatial-qaqc-workbench.html'), 'utf8');
const js = html.slice(html.indexOf('<script>') + 8, html.lastIndexOf('</script>'));
const start = js.indexOf("const PH=");
const end = js.indexOf('/* ============ product icons');
const eStart = js.indexOf('const E=['), eEnd = js.indexOf("$('elements')");
const code = 'const esc=s=>s;' + js.slice(start, end).replace(/const SVG=\{[\s\S]*?\n\};/, 'const SVG={};') + js.slice(eStart, eEnd) + ';module.exports={PH,P,ERR,E,DECIDE};';
const m = {}; new Function('module', code)(m);
const { PH, P, ERR, E } = m.exports;
const out = new Set();
Object.values(PH).forEach(([, l]) => out.add(l));
for (const p of Object.values(P)) {
  ['name', 'type', 'formats', 'source', 'unit'].forEach((k) => out.add(p[k]));
  for (const s of p.steps) {
    out.add(s.t); out.add(s.iso); out.add(s.tol);
    [...s.what, ...s.arc, ...s.qgis].forEach((x) => out.add(x));
    if (s.calc) out.add(s.calc[1]);
  }
}
Object.values(ERR).forEach(([a, b]) => { out.add(a); out.add(b); });
for (const [n, q, subs] of E) { out.add(n); out.add(q); subs.forEach((s) => s.forEach((x) => out.add(x))); }
fs.writeFileSync(require('path').join(__dirname, 'qaqc_strings.json'), JSON.stringify([...out], null, 1));
console.log(out.size, [...out].join('').length);
