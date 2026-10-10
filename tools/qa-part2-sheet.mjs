// Part2 mission play sheets (REAL input). node tools/qa-part2-sheet.mjs <outDir> [M04|M05] [width height]
import puppeteer from 'puppeteer';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
const OUT = process.argv[2] || 'docs/sheets'; mkdirSync(OUT, { recursive: true });
const WHICH = process.argv[3] || 'ALL';
const VW = +process.argv[4] || 1280, VH = +process.argv[5] || 800;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] });
const center = async (p, sel) => p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, sel);
const txt = (p, sel) => p.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
async function grid(frames, out) {
  const q = await b.newPage(); await q.setViewport({ width: 1920, height: 540 * Math.ceil(frames.length / 2) });
  await q.setContent(`<body style="margin:0;display:grid;grid-template-columns:repeat(2,960px);background:#000">${frames.map(f => `<img style="width:960px;height:540px;object-fit:contain" src="data:image/png;base64,${f}">`).join('')}</body>`);
  await q.screenshot({ path: out }); await q.close();
}
const errs = [];
async function open(id, veh) {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|ERR_|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.setViewport({ width: VW, height: VH }); await p.goto('http://localhost:8090/game1/', { waitUntil: 'load' });
  await p.evaluate("localStorage.clear()"); await p.reload({ waitUntil: 'load' });
  await p.evaluate(`Blippi.go('mission',{mission:'${id}',vehicle:'${veh}'})`); await sleep(800);
  return p;
}
const shot = async p => p.screenshot({ encoding: 'base64' });
const drag = async (p, from, to) => { const c = await center(p, from); await p.mouse.move(c.x, c.y); await p.mouse.down(); await p.mouse.move(c.x + 20, c.y - 20, { steps: 3 }); return { c, up: async (t) => { await p.mouse.move(t.x, t.y, { steps: 10 }); await p.mouse.up(); } }; };
if (WHICH === 'ALL' || WHICH === 'M04') {
  const p = await open('W01-M04', 'truk-air'); const F = [];
  F.push(await shot(p));
  await p.click('[data-piece=short]'); await sleep(500); F.push(await shot(p));
  await p.click('[data-piece=post]'); await sleep(1300);
  await p.click('[data-tool=sambung]'); await sleep(200); F.push(await shot(p));
  for (const [piece, sock] of [['post', 'post'], ['short', 'sl'], ['short', 'sr']]) {
    const d = await drag(p, `[data-piece=${piece}]`, null); if (piece === 'post') F.push(await shot(p));
    const t = await center(p, `[data-socket=${sock}]`); await d.up(t); await sleep(600);
  }
  F.push(await shot(p)); await sleep(1200);
  await p.click('[data-tool=lewat]'); const tc = await center(p, '[data-truck]'); await p.mouse.click(tc.x, tc.y); await sleep(1500); F.push(await shot(p)); await sleep(1500); F.push(await shot(p));
  await sleep(2500); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-m04-${VW}x${VH}.png`)); await p.close();
}
if (WHICH === 'ALL' || WHICH === 'M05') {
  const p = await open('W01-M05', 'excavator'); const F = [];
  F.push(await shot(p));
  await p.click('[data-job=mainan]'); await sleep(400); F.push(await shot(p));
  for (const j of ['pasir', 'mainan', 'gerbang']) { await p.click(`[data-job=${j}]`); await sleep(250); }
  await sleep(1300); await p.click('[data-tool=kerja]');
  for (const j of ['pasir', 'mainan', 'gerbang']) { const c = await center(p, `[data-zone=${j}]`); await p.mouse.click(c.x, c.y); await sleep(450); F.push(await shot(p)); await sleep(2600); }
  F.push(await shot(p));
  await p.click('[data-tool=buka]'); const g = await center(p, '[data-zone=gerbang]'); await p.mouse.click(g.x, g.y); await sleep(600); F.push(await shot(p)); await sleep(3600); F.push(await shot(p));
  await grid(F, path.join(OUT, `mission-m05-${VW}x${VH}.png`)); await p.close();
}
console.log(errs.length ? errs : 'no page errors');
await b.close();
