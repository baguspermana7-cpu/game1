// Owner approval sheets: each generated-review candidate drawn IN ITS REAL SCREEN SLOT (current = left, candidate = right).
// NOTHING here ships: candidates are read from the Codex pack and injected into the DOM as data URIs for the screenshot only.
//   node tools/qa-approval-sheets.mjs <outDir>
import puppeteer from 'puppeteer';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
const OUT = process.argv[2] || 'docs/sheets';
mkdirSync(OUT, { recursive: true });
const CAND = '/home/baguspermana7/Documents/temporary/blippi/kekurangan/generated-review/candidates/';
const PACK = '/home/baguspermana7/Documents/temporary/blippi/sudah organized/';
const uri = f => 'data:image/webp;base64,' + readFileSync(f).toString('base64');
const SRC = {
  'hub-meja-peta': CAND + 'hub-meja-peta.webp', 'modul-bucket-sempit': CAND + 'modul-bucket-sempit.webp', 'modul-semprot': CAND + 'modul-semprot.webp',
  'prop-kincir-rumah': CAND + 'prop-kincir-rumah.webp', 'pulau-eco-park': CAND + 'pulau-eco-park.webp', 'pulau-kebun-ceria': CAND + 'pulau-kebun-ceria.webp',
  'pulau-kota-roda': CAND + 'pulau-kota-roda.webp', 'pulau-pelabuhan': CAND + 'pulau-pelabuhan.webp', 'pulau-taman-air': CAND + 'pulau-taman-air.webp',
  'pulau-taman-air-aktif': CAND + 'pulau-taman-air-aktif.webp', 'pulau-wonder-lab': CAND + 'pulau-wonder-lab.webp'
};
SRC['blippi-potret'] = PACK + 'assets/colorful-preschool-mission-vehicle-sprite-sheet/blippi-presenting.webp';
SRC['hub-papan'] = PACK + 'assets/colorful-modular-world-scenery-collection/discovery-dome.webp';
const DATA = Object.fromEntries(Object.entries(SRC).map(([k, f]) => [k, uri(f)]));
const SHOTS = [
  ['hub', "Blippi.go('hub')", ['hub-meja-peta', 'hub-papan'], null],
  ['map', "Blippi.go('map')", ['pulau-kota-roda', 'pulau-taman-air', 'pulau-eco-park', 'pulau-kebun-ceria', 'pulau-pelabuhan', 'pulau-wonder-lab'], null],
  ['map-taman-air-aktif', "Blippi.go('map',{world:'taman-air'})", ['pulau-taman-air-aktif'], { 'pulau-taman-air-aktif': 'pulau-taman-air' }],
  ['vehicles-truk', "Blippi.go('vehicles',{mission:'W02-M01'})", ['modul-semprot'], null],
  ['vehicles-excavator', "Blippi.go('vehicles',{mission:'W02-M01',vehicle:'excavator'})", ['modul-bucket-sempit'], null],
  ['mission-kincir', "Blippi.go('mission',{mission:'W02-M01',vehicle:'truk-air'})", ['prop-kincir-rumah', 'blippi-potret'], null]
];
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
for (const [name, js, keys, remap] of SHOTS) {
  const p = await b.newPage();
  await p.setViewport({ width: 1672, height: 941 });
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' });
  await p.evaluate(js); await new Promise(r => setTimeout(r, 600));
  const cur = await p.screenshot({ encoding: 'base64' });
  const info = await p.evaluate((keys, DATA, remap) => {
    const out = [];
    for (const k of keys) {
      const slot = (remap && remap[k]) || k;
      let els = [...document.querySelectorAll('.scr.on [data-art="' + slot + '"]')];
      if (!els.length) els = [...document.querySelectorAll('.scr.on [data-slot="' + slot + '"]')];
      // islands are drawn under a key that depends on the done state: fall back to the world's island element
      els.forEach(e => {
        e.innerHTML = '<img src="' + DATA[k] + '" alt="" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:contain;object-position:50% 100%">';
        e.style.outline = '3px dashed #FF3B8D'; e.style.outlineOffset = '-3px';
        e.style.opacity = '1'; e.style.visibility = 'visible';
      });
      out.push(k + ':' + els.length);
    }
    return out;
  }, keys, DATA, remap);
  await new Promise(r => setTimeout(r, 400));
  const cand = await p.screenshot({ encoding: 'base64' });
  console.log(name, info.join(' '));
  const q = await b.newPage();
  await q.setViewport({ width: 3344, height: 941 });
  await q.setContent(`<body style="margin:0;display:flex;background:#000"><div style="position:relative"><img width=1672 height=941 src="data:image/png;base64,${cur}"><b style="position:absolute;left:12px;bottom:12px;background:#fff;padding:6px 12px;font:700 22px sans-serif">SEKARANG (placeholder / digambar di latar)</b></div><div style="position:relative"><img width=1672 height=941 src="data:image/png;base64,${cand}"><b style="position:absolute;left:12px;bottom:12px;background:#FFE3EE;padding:6px 12px;font:700 22px sans-serif">KANDIDAT: ${keys.join(', ')} (belum disetujui)</b></div></body>`);
  await q.screenshot({ path: path.join(OUT, `approval-${name}.png`) });
  await p.close(); await q.close();
}
await b.close();
