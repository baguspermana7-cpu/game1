import puppeteer from 'puppeteer';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--mute-audio'] });
const modes = [['darat-4', 'trip'], ['udara-4', 'trip'], ['angkasa-4', 'trip'], ['air-4', 'trip'], ['race', 'race']];
for (const [id, kind] of modes) {
  const pp = await b.newPage(); await pp.setViewport({ width: 1280, height: 800 });
  await pp.goto('http://localhost:8090/game1/?racelaps=9', { waitUntil: 'load' });
  const cdp = await pp.createCDPSession(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  if (kind === 'trip') { await pp.evaluate(id => { BlippiTrip.open(); BlippiTrip.start(id, { seed: 11, len: 3 }); }, id); for (let i = 0; i < 60 && (await pp.evaluate("(BlippiTrip.qa()||{}).state")) !== 'play'; i++) await sleep(150); }
  else { await pp.evaluate(() => { BlippiRace.select({ vehicle: 'passenger-jet', arena: 'wonder-lab', mode: 'bebas' }); BlippiRace.open(); BlippiRace.goto('pre'); }); for (let i = 0; i < 60 && (await pp.evaluate("document.querySelector('[data-act=mulai-balap]').disabled")); i++) await sleep(200); await pp.click('[data-act=mulai-balap]'); for (let i = 0; i < 60 && (await pp.evaluate("(BlippiRace.qa()||{}).state")) !== 'race'; i++) await sleep(150); }
  await sleep(1200);
  await pp.evaluate(() => { window.__ft = []; let t = 0; const f = ts => { if (t) window.__ft.push(ts - t); t = ts; window.__raf = requestAnimationFrame(f); }; window.__raf = requestAnimationFrame(f); });
  await sleep(5000);
  const ft = await pp.evaluate(() => { cancelAnimationFrame(window.__raf); return window.__ft; }); ft.sort((a, c) => a - c);
  const wk = await pp.evaluate(kind === 'trip' ? "BlippiTrip.qa().workP90" : "BlippiRace.qa().workP90");
  const sc = kind === 'trip' ? await pp.evaluate("BlippiTrip.qa().scale") : 1;
  console.log(id, '4x p50', ft[ft.length >> 1].toFixed(1), 'p90', ft[Math.floor(ft.length * .9)].toFixed(1), 'max', ft[ft.length - 1].toFixed(1), '>33ms', ft.filter(x => x > 33.5).length, 'n', ft.length, 'work90', wk.toFixed(1), 'scale', sc);
  await pp.close();
}
await b.close();
