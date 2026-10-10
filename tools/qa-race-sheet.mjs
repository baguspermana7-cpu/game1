// Sheets for the racing mode: one per new screen + one per arena with its authored centerline overlaid, driven through the REAL UI.
//   node tools/qa-race-sheet.mjs <outDir>
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const OUT = process.argv[2] || 'docs/sheets';
mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] });
const errors = [];
const arenas = ['kota-roda', 'taman-air', 'eco-park', 'kebun-ceria', 'pelabuhan', 'wonder-lab', 'hutan-lumpur', 'konstruksi'];
async function open(w, h) {
  const p = await b.newPage();
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|ERR_|Failed to load resource/.test(m.text())) errors.push(m.text()); });
  await p.setViewport({ width: w, height: h });
  await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' });
  await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: 'load' });
  return p;
}
async function grid(files, cols, out, w, h) {
  const q = await b.newPage(); const rows = Math.ceil(files.length / cols);
  await q.setViewport({ width: w * cols / 2, height: h * rows / 2 });
  await q.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(${cols},${w / 2}px);background:#000">${files.map(f => `<img style="width:${w / 2}px;height:${h / 2}px;object-fit:contain;background:#000" src="data:image/png;base64,${f}">`).join('')}</body>`);
  await q.screenshot({ path: out }); await q.close();
}
// screens at 1280x800 (landscape) and 390x844 (portrait)
for (const [w, h, tag] of [[1280, 800, 'l'], [390, 844, 'p']]) {
  const p = await open(w, h); const frames = [];
  await p.evaluate("BlippiRace.open()"); await sleep(500); frames.push(await p.screenshot({ encoding: 'base64' }));
  await p.evaluate("BlippiRace.select({vehicle:'floatplane',cat:'udara'}); BlippiRace.goto('vehicle')"); await sleep(500); frames.push(await p.screenshot({ encoding: 'base64' }));
  await p.evaluate("BlippiRace.select({arena:'taman-air'}); BlippiRace.goto('arena')"); await sleep(500); frames.push(await p.screenshot({ encoding: 'base64' }));
  await p.evaluate("BlippiRace.goto('pre')"); await sleep(900); frames.push(await p.screenshot({ encoding: 'base64' }));
  await p.click('[data-act=mulai-balap]'); await sleep(700); frames.push(await p.screenshot({ encoding: 'base64' }));
  await sleep(2600); frames.push(await p.screenshot({ encoding: 'base64' }));
  await sleep(2400); frames.push(await p.screenshot({ encoding: 'base64' }));
  await grid(frames, w > h ? 3 : 4, path.join(OUT, `race-screens-${tag}.png`), w, h);
  await p.close();
}
// one sheet per arena: landscape race frame with the authored route drawn from data (centerline, width, start, obstacles, HUD) over the live canvas
for (const a of arenas) {
  const frames = [];
  for (const [w, h] of [[1672, 941], [941, 1672]]) {
    const p = await open(w > h ? 1280 : 470, w > h ? 720 : 836);
    await p.evaluate(a => { BlippiRace.select({ vehicle: 'police-suv', arena: a, mode: 'bebas' }); BlippiRace.open(); BlippiRace.goto('pre'); }, a);
    await sleep(900); await p.click('[data-act=mulai-balap]');
    for (let i = 0; i < 40 && (await p.evaluate("(BlippiRace.qa()||{}).state")) !== 'race'; i++) await sleep(200);
    await sleep(2200);
    await p.evaluate(a => {
      const q = BlippiRace.qa(); const rt = BlippiRace.R[a][q.ori]; const cv = document.querySelector('#race canvas');
      const o = document.createElement('canvas'); o.width = cv.width; o.height = cv.height; o.style.cssText = 'position:absolute;inset:0;width:' + cv.style.width + ';height:' + cv.style.height + ';pointer-events:none;z-index:9';
      cv.parentNode.appendChild(o);
      const c = o.getContext('2d'), s = o.width / parseFloat(cv.style.width), k = q.k * s, ox = q.ox * s, oy = q.oy * s;
      c.setTransform(k, 0, 0, k, ox, oy);
      c.strokeStyle = 'rgba(0,255,120,.35)'; c.lineWidth = rt.trackWidth; c.lineJoin = 'round'; c.beginPath(); rt.centerline.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke();
      c.strokeStyle = '#FF0066'; c.lineWidth = 5; c.beginPath(); rt.centerline.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.stroke();
      rt.obstacles.forEach(po => { c.fillStyle = 'rgba(255,60,0,.45)'; c.beginPath(); po.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); });
      rt.hud.forEach(r => { c.strokeStyle = '#00A0FF'; c.lineWidth = 4; c.strokeRect(r[0], r[1], r[2] - r[0], r[3] - r[1]); });
      c.fillStyle = '#fff'; c.beginPath(); c.arc(rt.start.x, rt.start.y, 14, 0, 7); c.fill();
    }, a);
    frames.push(await p.screenshot({ encoding: 'base64' }));
    await p.close();
  }
  await grid(frames, 2, path.join(OUT, `race-arena-${a}.png`), 1280, 800);
}
await b.close();
console.log(errors.length ? 'ERRORS\n' + errors.join('\n') : 'no page errors', '\nsheets in', OUT);
