// Real-input play of W01-M02 and W01-M03: frames. node tools/qa-mission2-sheet.mjs <outDir>
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs'; import path from 'node:path';
const OUT = process.argv[2] || 'docs/sheets'; mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] });
const errs = [];
const ctr = async (p, s) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, s);
async function grid(frames, out) {
  const q = await b.newPage(); await q.setViewport({ width: 1920, height: 540 * Math.ceil(frames.length / 2) });
  await q.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(2,960px);background:#000">${frames.map(f => `<img style="width:960px;height:540px;object-fit:contain" src="data:image/png;base64,${f}">`).join('')}</body>`);
  await q.screenshot({ path: out }); await q.close();
}
async function open(id, v) { const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e))); await p.setViewport({ width: 1280, height: 800 }); await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' }); await p.evaluate("localStorage.clear()"); await p.reload({ waitUntil: 'load' }); await p.evaluate(`Blippi.go('mission',{mission:'${id}',vehicle:'${v}'})`); await sleep(800); return p; }
const shot = p => p.screenshot({ encoding: 'base64' });
{ const p = await open('W01-M02', 'excavator'); const F = [await shot(p)];
  await p.click('[data-act=baca]'); await sleep(900); F.push(await shot(p));
  await p.click('[data-tool=gali]');
  const tg = await p.evaluate("(Blippi.state().progress['W01-M02']||{}).data.t");
  const wrong = [0,1,2,3,4,5,6,7,8].find(c => !tg.includes(c));
  let c = await ctr(p, `[data-cell="${wrong}"]`); await p.mouse.click(c.x, c.y); await sleep(900); F.push(await shot(p));
  for (const t of tg) { c = await ctr(p, `[data-cell="${t}"]`); await p.mouse.click(c.x, c.y); await sleep(1100); if (t === tg[0]) F.push(await shot(p)); }
  await sleep(1800); F.push(await shot(p));
  await p.click('[data-tool=pasang]'); c = await ctr(p, '[data-gate]'); await p.mouse.click(c.x, c.y); await sleep(900); F.push(await shot(p)); await sleep(3200); F.push(await shot(p));
  await grid(F, path.join(OUT, 'mission-pasir-play.png')); await p.close(); }
{ const p = await open('W01-M03', 'truk-air'); const F = [await shot(p)];
  let c = await ctr(p, '[data-ramp=high]'); await p.mouse.click(c.x, c.y); await sleep(1200);
  await p.click('[data-tool=uji]'); c = await ctr(p, '[data-ramp=low]'); await p.mouse.click(c.x, c.y); await sleep(1700); F.push(await shot(p));
  c = await ctr(p, '[data-ramp=high]'); await p.mouse.click(c.x, c.y); await sleep(2200); F.push(await shot(p)); await sleep(2200);
  await p.click('[data-tool=antar]'); c = await ctr(p, '[data-ramp=low]'); await p.mouse.click(c.x, c.y); await sleep(1900); F.push(await shot(p));
  c = await ctr(p, '[data-ramp=high]'); await sleep(1500); await p.mouse.click(c.x, c.y); await sleep(2300); F.push(await shot(p)); await sleep(2500); F.push(await shot(p));
  await grid(F, path.join(OUT, 'mission-bukit-play.png')); await p.close(); }
console.log(errs.length ? errs : 'no page errors'); await b.close();
