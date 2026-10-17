/* G32 Blippi -- Petualangan Kendaraan: RUNTIME CORE (assets, loop, input, fx, gates + questions, rating, save).
 * Four categories, three engines (land = 3-lane pseudo-3D, air = side scroller with seaplane take-off, top = water + space
 * top-down free steering). Engines register through BlippiTrip.engine(name, {assets(lvl), make(run)}) and draw in CSS px.
 * No fail state anywhere: a bump slows and the vehicle blinks; a question gate is always answerable and always resumes.
 * Perf: one canvas, transforms/drawImage only, adaptive render scale (never below 0.6) when frames run long.
 * UI (pickers, HUD, quiz card, results) lives in blippi-trip-ui.js. Shared art is read from ../Dunia-Emosi, never copied. */
(function (w) {
  'use strict'
  var D = w.BlippiTripData
  var V = w.BlippiVFX || {}
  var engines = {}
  // CTR (Crash Team Racing 1999) turbo numbers, from the CTR-ModSDK decompilation (metaPhys table + PowerSlide_Update):
  // the meter fills in 30 frames (1.0 s) and its last 15 (0.5 s) are the red zone; a press in the red adds reserves mapped
  // linearly from 0 at the red edge to 36 frames (1.15 s) at full; up to 3 turbos per slide; the speed cap rises with each
  // (+2048, +2560, +3072 over class speed 13140 = +15.6 / +19.5 / +23.4 %, here x2.5 so a child feels it); acceleration
  // with reserves 1152 vs 480 without (2.4x). Ten wumpa make the kart slightly faster (here: 10 stars).
  var CTR = { room: 1.0, red: 0.5, fullGain: 1.15, minGain: 0.4, boosts: 3, cap: [1.39, 1.49, 1.58], juiced: 1.06, accel: 2.2, accelRes: 5.3, decel: 2.6, maxRes: 4, step: 0.75, startWin: 0.45 }
  var cache = {}
  var run = null
  var raf = 0
  var UI = null // set by blippi-trip-ui.js
  var seenQ = []
  var FXK = ['fx:spark', 'fx:dust', 'fx:speed', 'fx:gold-star', 'fx:confetti', 'fx:check-burst', 'fx:droplets', 'fx:ripple', 'fx:splash', 'fx:bubbles', 'fx:rays', 'fx:cloud']

  function B () { return w.Blippi }
  function url (key) {
    var k = String(key)
    if (k.indexOf('lib:') === 0) return '../Dunia-Emosi/assets/db/lib/' + k.slice(4) + '.webp'
    if (k.indexOf('g:') === 0) return 'assets/blippi/' + k.slice(2) + '.webp'
    if (k.indexOf('race:') === 0) return 'assets/race/' + k.slice(5) + '.webp'
    if (k.indexOf('sp:') === 0) return 'assets/space/' + k.slice(3) + '.webp'
    if (k.indexOf('fl:') === 0) return 'assets/fleet/' + k.slice(3) + '.webp'
    if (k.indexOf('fx:') === 0) return V[k.slice(3)] ? V[k.slice(3)].file : ''
    return k
  }
  // load a list of art keys; cb() when every one settled. cache[key] = Image (ok) | false (missing -> labelled placeholder)
  function load (keys, cb) {
    var need = []
    var i
    keys = keys.concat(keys.map(peekKey).filter(Boolean))   // a race vehicle brings its Blippi-peek twin (owner 2026-10-12)
    peekT0 = 0
    for (i = 0; i < keys.length; i++) if (cache[keys[i]] === undefined && need.indexOf(keys[i]) < 0) need.push(keys[i])
    var left = need.length
    if (!left) { cb(); return }
    need.forEach(function (k) {
      var im = new Image()
      // decoded BEFORE the run starts and drawn once off screen: a picture first decoded when it scrolls into view stalls
      // that frame (a visible hitch the first time each crate, barrel, cloud or effect appears)
      im.onload = function () {
        var ready = function () { cache[k] = sheet(k, im); warm(im); if (--left === 0) cb() }
        if (im.decode) im.decode().then(ready, ready); else ready()
      }
      im.onerror = function () { cache[k] = false; if (--left === 0) cb() }
      im.src = url(k)
    })
  }
  // an animation sheet (fleet vehicle / space craft) is copied once into a canvas: drawn from the <img>, several large sheets
  // plus the water's cached bands outgrew Chrome's decoded-image cache and the WebP was decoded again every frame (AIR with
  // the boat pack: 78 ms of native work a frame at 4x vs 6 ms; a canvas is never evicted)
  function sheet (k, im) {
    if (!/^(fl:|sp:)/.test(k) || /-tile$/.test(k)) return im
    try {
      var cv = w.document.createElement('canvas')
      cv.width = im.naturalWidth; cv.height = im.naturalHeight
      cv.getContext('2d').drawImage(im, 0, 0)
      return cv
    } catch (e) { return im }
  }
  var warmC = null
  function warm (im) {
    try { if (!warmC) warmC = w.document.createElement('canvas').getContext('2d'); warmC.drawImage(im, 0, 0, 2, 2) } catch (e) { /* best effort */ }
  }
  function img (key) { return cache[key] || null }
  // the child's space craft (LUAR ANGKASA), saved per avatar; any id not in the catalog falls back to the first (the rocket)
  function crafts () { return (w.BlippiSpace && w.BlippiSpace.craft) || [] }
  function craft () {
    var id = ((B().state().trip || {}).craft) || '', all = crafts(), i
    for (i = 0; i < all.length; i++) if (all[i].id === id) return all[i]
    return all[0] || null
  }
  function setCraft (id) {
    B().commit(function (s) { s.trip = s.trip || { lv: {}, rw: {} }; s.trip.craft = id })
  }
  // the child's own vehicle on DARAT / AIR (owner 2026-10-15: the 25-vehicle and 25-boat animated packs), saved per avatar
  // like the space craft; a journey with no fleet data keeps its level vehicle
  var RIDE0 = { darat: 'school-bus', air: 'harbor-tugboat', udara: 'float-seaplane', kertas: 'classic-dart', kapalkertas: 'classic-paper-boat' }
  function fleet (cat) { var f = w.BlippiFleet && w.BlippiFleet[cat]; return f && f.items && f.items.length ? f : null }
  function rideItem (cat, id) { var f = fleet(cat), i; if (!f) return null; for (i = 0; i < f.items.length; i++) if (f.items[i].id === id) return f.items[i]; return null }
  // {item, key, tile, meta: [frameW, frameH, frames, frameMs]} for an item of a journey's fleet
  function rideOf (cat, it) { var f = fleet(cat); return it ? { cat: cat, item: it, key: 'fl:' + cat + '/' + it.id, tile: 'fl:' + cat + '/' + it.id + '-tile', meta: [it.play[0], it.play[1], it.play[2], it.play[3], f.frameMs] } : null }
  function ride (cat) {
    var f = fleet(cat)
    if (!f) return null
    var id = (((B().state().trip || {}).ride) || {})[cat]
    return rideOf(cat, rideItem(cat, id) || rideItem(cat, RIDE0[cat]) || f.items[0])
  }
  function setRide (cat, id) {
    B().commit(function (s) { s.trip = s.trip || { lv: {}, rw: {} }; var r = {}, k; for (k in (s.trip.ride || {})) r[k] = s.trip.ride[k]; r[cat] = id; s.trip.ride = r })
  }
  // three rivals from the same fleet, never the child's own, spread over the pack and different per level
  function rideRivals (cat, lvlId) {
    var f = fleet(cat)
    var me = ride(cat)
    if (!f || !me) return []
    var pool = f.items.filter(function (x) { return x.id !== me.item.id })
    var h = 0, i
    for (i = 0; i < lvlId.length; i++) h = (h * 31 + lvlId.charCodeAt(i)) >>> 0
    return [0, 8, 16].map(function (o) { return rideOf(cat, pool[(h + o) % pool.length]) })
  }
  // one frame of an animated sheet, fitted into bw x bh around (x, y). meta = [frameW, frameH, frames, cols, frameMs]: the
  // frames sit in rows of `cols` (a 60-frame single row was 9000-12000 px wide - past the 4096/8192 px texture limit of a
  // tablet GPU, which drew it on a slow path: 80 ms a frame at 4x); cols missing = one row, frameMs missing = the craft's
  function frameSpr (c, key, meta, t, x, y, bw, bh, alpha) {
    var im = cache[key]
    if (!im) return false
    var fw = meta[0], fh = meta[1], n = meta[2], cols = meta[3] || n
    var ff = reduced() ? 0 : t * 1000 / (meta[4] || w.BlippiSpace.frameMs || 80)
    var f = Math.floor(ff) % n
    var k = Math.min(bw / fw, bh / fh)
    var a0 = alpha != null ? alpha : 1
    var dx = x - fw * k / 2, dy = y - fh * k / 2
    c.globalAlpha = a0
    c.drawImage(im, (f % cols) * fw, Math.floor(f / cols) * fh, fw, fh, dx, dy, fw * k, fh * k)
    // the art loops at 20 fps; the next frame is blended in over the current one, so the picture changes every display frame
    // (a propeller, a wheel, a wing beat turn instead of ticking; owner 2026-10-15 "super smooth")
    var mix = ff - Math.floor(ff)
    if (mix > 0.02) {
      var g = (f + 1) % n
      c.globalAlpha = a0 * mix
      c.drawImage(im, (g % cols) * fw, Math.floor(g / cols) * fh, fw, fh, dx, dy, fw * k, fh * k)
      tweens++
    }
    c.globalAlpha = 1
    return true
  }
  var tweens = 0
  // a rival's sheet at half resolution (a quarter of the memory): rivals are drawn smaller and further off. With four full
  // sheets plus the water's cached bands, AIR spent 77 ms of native work a frame at 4x (each sheet alone: 6 ms) - the raster
  // cache thrashed. Returns {key, meta} to draw with, or null before the full sheet is loaded.
  function halfSheet (key, meta) {
    var hk = key + '@half'
    if (!cache[hk]) {
      var im = cache[key]
      if (!im) return null
      try {
        var cv = w.document.createElement('canvas')
        cv.width = Math.ceil(im.width / 2); cv.height = Math.ceil(im.height / 2)
        cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height)
        cache[hk] = cv
      } catch (e) { return { key: key, meta: meta } }
    }
    return { key: hk, meta: [meta[0] / 2, meta[1] / 2, meta[2], meta[3], meta[4]] }
  }
  // the same, standing on yb (bottom-anchored: a vehicle on the road)
  function frameBot (c, key, meta, t, x, yb, bw, bh, alpha) {
    var k = Math.min(bw / meta[0], bh / meta[1])
    return frameSpr(c, key, meta, t, x, yb - meta[1] * k / 2, bw, bh, alpha)
  }
  // pre-scaled copy of a loaded image (offscreen canvas), so big panoramas are blitted, not re-downscaled every frame
  var scc = {}
  var sccN = 0
  function scaled (key, wd, ht) {
    var im = cache[key]
    if (!im) return null
    wd = Math.max(1, Math.round(wd))
    ht = Math.max(1, Math.round(ht))
    var id = key + '|' + wd + 'x' + ht
    if (scc[id]) return scc[id]
    if (sccN > 24) { scc = {}; sccN = 0 }
    var cv = w.document.createElement('canvas')
    cv.width = wd
    cv.height = ht
    cv.getContext('2d').drawImage(im, 0, 0, wd, ht)
    scc[id] = cv
    sccN++
    return cv
  }
  // cover-draw a pre-scaled panorama into (x,y,wd,ht), bottom aligned, wrapping horizontally by dx
  function coverC (c, key, x, y, wd, ht, dx) {
    var im = cache[key]
    if (!im) return false
    var k = Math.max(wd / im.width, ht / im.height)
    var cv = scaled(key, im.width * k, im.height * k)
    var iw = cv.width
    var ox = ((dx || 0) % iw + iw) % iw
    c.drawImage(cv, x - ox, y + (ht - cv.height))
    if (iw - ox < wd) c.drawImage(cv, x - ox + iw, y + (ht - cv.height))
    return true
  }

  function rng (seed) {
    var s = seed >>> 0 || 1
    return function () {
      s = (s + 0x6D2B79F5) >>> 0
      var t = s
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function lerp (a, b, t) { return a + (b - a) * t }
  // one media query, read many times a frame (a new matchMedia per call allocated every frame)
  var mqReduce = w.matchMedia ? w.matchMedia('(prefers-reduced-motion: reduce)') : null
  function reduced () { return !!(mqReduce && mqReduce.matches) }

  /* ---------- drawing helpers shared by every engine ---------- */
  // draw art centred at (x,y) fitted INSIDE (bw,bh) (contain). opt: rot (rad), alpha, flip, anchor 'bottom' (y = bottom edge), label
  /* the Blippi peek (owner 2026-10-12: "tidak pakai gambar yang ada blippi yang nengok"): the player's race vehicle follows
     the same contract as BALAPAN (data/blippi-race-data.js peek): start in `standard`, then each cycle 30% standard / 70%
     Blippi leaning out, a short crossfade of the SAME view, an instant swap under reduced motion. */
  var PK_FADE = 120, peekT0 = 0
  function peekKey (k) { return /^race:[^/]+\/standard-/.test(String(k)) ? String(k).replace('/standard-', '/blippi_peek-') : null }
  function peekBlend () {
    var PK = (w.BlippiRaceData && w.BlippiRaceData.peek) || { default_cycle_ms: 6000, standard_ratio: 0.3 }   // data/blippi-race-data.js loads after this file
    var now = Date.now(); if (!peekT0) peekT0 = now
    var cyc = PK.default_cycle_ms, std = cyc * PK.standard_ratio, t = (now - peekT0) % cyc
    if (reduced()) return t < std ? 0 : 1
    return t < std ? (t > std - PK_FADE ? 1 - (std - t) / PK_FADE : (now - peekT0 >= cyc && t < PK_FADE ? 1 - t / PK_FADE : 0)) : 1
  }
  function spr (c, key, x, y, bw, bh, opt) {
    var pk = peekKey(key)
    if (pk && cache[pk] && !(opt && opt.noPeek)) {
      var b = peekBlend(), a = (opt && opt.alpha != null) ? opt.alpha : 1, o2 = {}, q
      for (q in (opt || {})) o2[q] = opt[q]
      o2.noPeek = true
      if (b < 1) { o2.alpha = a * (1 - b); spr(c, key, x, y, bw, bh, o2) }
      if (b > 0) { o2.alpha = a * b; spr(c, pk, x, y, bw, bh, o2) }
      return
    }
    var im = cache[key]
    opt = opt || {}
    if (im && !opt.rot && !opt.flip && opt.alpha == null) {
      // fast path: no transform state to save
      var k0 = Math.min(bw / im.width, bh / im.height)
      var dw = im.width * k0
      var dh = im.height * k0
      c.drawImage(im, x - dw / 2, (opt.anchor === 'bottom' ? y - bh / 2 : y) - dh / 2, dw, dh)
      return
    }
    c.save()
    c.translate(x, opt.anchor === 'bottom' ? y - bh / 2 : y)
    if (opt.rot) c.rotate(opt.rot)
    if (opt.flip) c.scale(-1, 1)
    if (opt.alpha != null) c.globalAlpha = opt.alpha
    if (im) {
      var k = Math.min(bw / im.width, bh / im.height)
      c.drawImage(im, -im.width * k / 2, -im.height * k / 2, im.width * k, im.height * k)
    } else {
      // missing art: a labelled pastel placeholder, same box (the owner sends the art later; see ART-SLOTS.md)
      c.fillStyle = 'rgba(227,215,247,.85)'
      c.strokeStyle = 'rgba(91,63,168,.7)'
      c.lineWidth = 2
      c.setLineDash([6, 5])
      rrect(c, -bw / 2, -bh / 2, bw, bh, Math.min(14, bh / 4))
      c.fill()
      c.stroke()
      c.setLineDash([])
      c.fillStyle = '#3F2C80'
      c.font = '700 ' + Math.max(9, Math.min(15, bw / 9)) + 'px Nunito,sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText(String(opt.label || key).slice(0, 18), 0, 0, bw - 6)
    }
    c.restore()
  }
  function rrect (c, x, y, wd, ht, r) {
    c.beginPath()
    c.moveTo(x + r, y)
    c.arcTo(x + wd, y, x + wd, y + ht, r)
    c.arcTo(x + wd, y + ht, x, y + ht, r)
    c.arcTo(x, y + ht, x, y, r)
    c.arcTo(x, y, x + wd, y, r)
    c.closePath()
  }
  // cover-draw an image into a rect (parallax layers); dx = horizontal offset in px, wraps for tiling
  function cover (c, key, x, y, wd, ht, dx) {
    var im = cache[key]
    if (!im) return false
    var k = Math.max(wd / im.width, ht / im.height)
    var iw = im.width * k
    var ih = im.height * k
    var ox = ((dx || 0) % iw + iw) % iw
    var yy = y + (ht - ih)
    c.drawImage(im, x - ox, yy, iw, ih)
    if (iw - ox < wd) c.drawImage(im, x - ox + iw, yy, iw, ih)
    return true
  }
  function grad (c, y0, y1, a, b, x, wd) {
    var g = c.createLinearGradient(0, y0, 0, y1)
    g.addColorStop(0, a)
    g.addColorStop(1, b)
    c.fillStyle = g
    c.fillRect(x || 0, y0, wd || 99999, y1 - y0)
  }

  /* ---------- fx particles (canvas) ---------- */
  function fx (name, x, y, size, o) {
    if (!run || !V[name]) return
    if (run.fxs.length > 14) run.fxs.shift() // the oldest gives way: a new burst never silently fails to appear
    o = o || {}
    run.fxs.push({ k: 'fx:' + name, x: x, y: y, s: size || 120, t: 0, d: o.dur || 0.8, rise: o.rise || 0, blend: V[name].blend })
    if (cache['fx:' + name] === undefined) load(['fx:' + name], function () {})
  }
  // a five-point star path (vector, so it needs no sprite in any journey)
  function starPath (c, x, y, r) {
    c.beginPath()
    for (var q = 0; q < 10; q++) { var a = -Math.PI / 2 + q * Math.PI / 5, rr = q % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) }
    c.closePath()
  }
  function drawFly (c, dt) {
    if (!run.fly.length) return
    var to = UI.scoreAt ? UI.scoreAt() : null
    if (!to) { run.fly.length = 0; return }
    var i
    for (i = run.fly.length - 1; i >= 0; i--) {
      var f = run.fly[i]
      f.t += dt
      var p = Math.min(1, f.t / f.d)
      if (p >= 1) { run.fly.splice(i, 1); if (UI.pop) UI.pop(); continue }
      var e = 1 - Math.pow(1 - p, 3)
      var mx = (f.x + to.x) / 2, my = Math.min(f.y, to.y) - 120
      var x = (1 - e) * (1 - e) * f.x + 2 * (1 - e) * e * mx + e * e * to.x
      var y = (1 - e) * (1 - e) * f.y + 2 * (1 - e) * e * my + e * e * to.y
      var r = (f.n > 1 ? 22 : 17) * (1 - 0.45 * e)
      c.save()
      c.translate(x, y); c.rotate(p * 5)
      starPath(c, 0, 0, r)
      c.fillStyle = '#FFC82E'; c.fill()
      c.lineWidth = 2.5; c.strokeStyle = '#E5A300'; c.stroke()
      c.restore()
    }
  }
  function drawFx (c, dt) {
    drawFly(c, dt)
    var i
    for (i = run.fxs.length - 1; i >= 0; i--) {
      var f = run.fxs[i]
      f.t += dt
      var p = f.t / f.d
      if (p >= 1) { run.fxs.splice(i, 1); continue }
      var im = cache[f.k]
      if (!im) continue
      // eased, not linear: a quick pop in (ease-out cubic), then a soft fade (ease-in on the tail); the rise decelerates
      var e = 1 - Math.pow(1 - p, 3)
      var a = p < 0.18 ? p / 0.18 : 1 - Math.pow((p - 0.18) / 0.82, 2)
      var sc = reduced() ? 1 : 0.55 + e * 0.65
      var wd = f.s * sc
      var ht = wd * im.height / im.width
      c.save()
      c.globalAlpha = clamp(a, 0, 1)
      if (f.blend === 'screen') c.globalCompositeOperation = 'screen'
      c.drawImage(im, f.x - wd / 2, f.y - ht / 2 - f.rise * e, wd, ht)
      c.restore()
    }
  }

  /* ---------- the run ---------- */
  function engineFor (lvl) {
    var cat = D.cats.filter(function (c) { return c.id === lvl.cat })[0]
    return engines[cat.engine]
  }

  function start (id, opts) {
    stop()
    var lvl = D.byId[id]
    if (!lvl) return false
    opts = opts || {}
    if (opts.len == null) { var mm = /[?&]triplen=([0-9.]+)/.exec(w.location.search); if (mm) opts.len = parseFloat(mm[1]) }
    var E = engineFor(lvl)
    if (!E) return false
    var cv = UI.showRun(lvl)
    run = {
      lvl: lvl, E: E, cv: cv, c: cv.getContext('2d'), W: 0, H: 0, scale: 0.8, dpr: 1,
      rnd: rng(opts.seed || ((Date.now() & 0xffff) + 17)), len: lvl.len * (opts.len || 1),
      progress: 0, mul: 1, slowT: 0, boostT: 0, hitT: 0, rate: lvl.speed, t: 0, reserves: 0, fire: 0, countT: 0, startPress: -9, juiced: false,
      stars: 0, starTotal: 0, bumps: 0, state: 'loading', fxs: [], fly: [], gates: [], quiz: null, qlog: [], bonus: 0,
      in: { down: false, x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, moves: [], kx: 0, ky: 0 },
      work: [], dts: [], slowFrames: 0, fastFrames: 0, raiseNeed: 120, raisedAt: 0, dtS: 0, finishT: 0, say: say, fx: fx, spr: spr, img: img, cover: coverC, scaled: scaled, grad: grad, rrect: rrect, clamp: clamp, lerp: lerp, reduced: reduced,
      collect: collect, bump: bump, boost: boost, turbo: turbo, press: pressTurbo, ctr: CTR,
      gift: gift, drawGift: drawGift, giftSpots: giftSpots, meter: meter, meterBar: meterBar, zones: zones, zoneAt: zoneAt, band: band, place: place, FIRE: FIRE
    }
    run.gates = lvl.gates.map(function (f) { return { f: f, done: false } })
    // living weather (owner 2026-10-17, shared ../Dunia-Emosi/games/weather-alive.js): lvl.weather, else a pick per
    // world from the level id; space and the paper desk have no weather
    run.wx = null
    var WXP = { darat: ['clear', 'rain', 'wind', 'heat', 'fog'], udara: ['clear', 'rain', 'wind', 'storm'], air: ['clear', 'rain', 'storm', 'fog'] }[lvl.cat]
    var wk = /[?&]wx=([a-z]+)/.exec(w.location.search)
    if (w.WeatherAlive && (WXP || lvl.weather || wk)) {
      var hsh = 0; for (var hi = 0; hi < lvl.id.length; hi++) hsh = (hsh * 31 + lvl.id.charCodeAt(hi)) >>> 0
      var kind = (wk && wk[1]) || lvl.weather || WXP[hsh % WXP.length]
      if (kind !== 'clear' && kind !== 'none') run.wx = w.WeatherAlive.create({ kind: kind, view: 'top', reduced: reduced(), seed: hsh,
        muted: function () { var st = B() && B().state && B().state(); return !(st && st.sound) || !run || run.state !== 'play' } })
    }
    resize()
    var mine = run
    load(E.assets(lvl).concat(FXK), function () {
      if (!run || run !== mine) return
      run.eng = E.make(run)
      // 3-2-1-GO before the run (CTR's start lights): a TURBO press just before GO gives a start turbo
      run.state = 'count'
      run.countT = 0
      UI.hud(run)
      UI.count('3')
      B().sfx('tick')
      say(lvl.say)
      raf = w.requestAnimationFrame(frame)
    })
    bindInput(cv)
    return true
  }

  function stop () {
    if (raf) w.cancelAnimationFrame(raf)
    raf = 0
    if (run && run.cv) { unbindInput(run.cv); if (run.eng && run.eng.destroy) run.eng.destroy() }
    if (run && run.wx) run.wx.destroy()
    run = null
  }

  function resize () {
    if (!run) return
    var cv = run.cv
    var r = cv.parentNode.getBoundingClientRect()
    run.W = Math.max(200, Math.round(r.width))
    run.H = Math.max(200, Math.round(r.height))
    run.dpr = Math.min(w.devicePixelRatio || 1, 1.25)
    var k = run.dpr * run.scale
    cv.width = Math.round(run.W * k)
    cv.height = Math.round(run.H * k)
    cv.style.width = run.W + 'px'
    cv.style.height = run.H + 'px'
    if (run.eng && run.eng.resize) run.eng.resize()
  }
  w.addEventListener('resize', function () { if (run) { resize() } })
  w.addEventListener('orientationchange', function () { if (run) setTimeout(resize, 120) })

  var last = 0
  function frame (ts) {
    raf = 0
    if (!run) return
    var raw = last ? Math.min(0.05, (ts - last) / 1000) : 0.016
    last = ts
    // the step the world moves eases toward the real frame time (owner 2026-10-15 "super smooth"): a hitch - a GC, a busy
    // tablet - is spread over the next frames instead of one 3x leap and a snap back
    var dt = run.dtS ? run.dtS + (raw - run.dtS) * 0.2 : raw
    run.dtS = dt
    // adaptive render scale: sustained long frames drop resolution (floor 0.6); 2 s of quick frames raise it a step again, so a
    // slow spell no longer leaves the world blurry for the rest of the run (a drop soon after a raise doubles that wait)
    if (raw > 0.024) run.slowFrames++
    else run.slowFrames = Math.max(0, run.slowFrames - 1)
    // a single late frame only sets the count back a little (a reset on every one kept a heavier road blurry for good)
    run.fastFrames = raw < 0.02 ? run.fastFrames + 1 : Math.max(0, run.fastFrames - 4)
    if (run.slowFrames > 40 && run.scale > 0.61) {
      run.scale = Math.max(0.6, run.scale - 0.15); run.slowFrames = 0; run.fastFrames = 0
      if (run.raisedAt && run.t - run.raisedAt < 4) run.raiseNeed *= 2
      resize()
    }
    if (run.fastFrames > run.raiseNeed && run.scale < 0.79) { run.scale = Math.min(0.8, run.scale + 0.15); run.fastFrames = 0; run.raisedAt = run.t; resize() }
    run.dts.push(dt)
    if (run.dts.length > 240) run.dts.shift()
    var w0 = w.performance.now()
    if (run.state === 'count') countdown(dt)
    else if (run.state === 'play' || run.state === 'finishing') update(dt)
    var c = run.c
    var k = run.dpr * run.scale
    c.setTransform(k, 0, 0, k, 0, 0)
    run.eng.draw(c, dt)
    if (run.wx) {
      if (run.state === 'play' || run.state === 'finishing' || run.state === 'count') run.wx.step(dt, { w: run.W, h: run.H })
      run.wx.lite(run.scale < 0.75)
      run.wx.draw(c, { w: run.W, h: run.H })
    }
    drawAura(c)
    drawFx(c, run.state === 'paused' ? 0 : dt)
    UI.tick(run)
    run.work.push(w.performance.now() - w0)
    if (run.work.length > 240) run.work.shift()
    if (run.state !== 'done') raf = w.requestAnimationFrame(frame)
  }

  function update (dt) {
    var r = run
    r.t += dt
    stepInput(dt)
    r.slowT = Math.max(0, r.slowT - dt)
    // CTR turbo model: reserves are boost seconds that stack; the fire level (0-2) raises the speed cap; while reserves
    // last the vehicle accelerates 2.4x harder (CTR metaPhys: accel 1152 with reserves vs 480 without)
    r.reserves = Math.max(0, r.reserves - dt)
    r.shieldT = Math.max(0, (r.shieldT || 0) - dt)
    r.magnetT = Math.max(0, (r.magnetT || 0) - dt)
    if (!r.reserves) r.fire = 0
    r.boostT = r.reserves
    r.hitT = Math.max(0, r.hitT - dt)
    r.comboT = Math.max(0, (r.comboT || 0) - dt)
    if (r.comboT === 0 && r.combo) r.combo = 0
    var target = r.slowT > 0 ? 0.42 : (r.reserves > 0 ? CTR.cap[r.fire] : (r.juiced ? CTR.juiced : 1))
    var acc = target > r.mul ? (r.reserves > 0 ? CTR.accelRes : CTR.accel) : CTR.decel
    r.mul += (target - r.mul) * Math.min(1, dt * acc)
    if (r.state === 'finishing') { r.finishT += dt; r.mul = lerp(r.mul, 0.55, Math.min(1, dt * 2)) }
    r.rate = r.lvl.speed * r.mul
    r.eng.update(dt)
    if (r.lvl.cat !== 'darat') r.in.moves.length = 0
    if (r.state === 'finishing') {
      if (r.finishT > 1.6) finish()
      return
    }
    r.progress = Math.min(1, r.progress + r.rate * dt / r.len)
    // the last stretch: Blippi cheers once, by how the race stands
    if (!r.stretch && r.progress > 0.86 && r.pos) { r.stretch = true; say(r.pos === 1 ? 'Garis finis sudah dekat! Pertahankan!' : 'Garis finis sudah dekat! Ayo salip, tekan TURBO!') }
    var i
    for (i = 0; i < r.gates.length; i++) {
      if (!r.gates[i].done && r.progress >= r.gates[i].f) { r.gates[i].done = true; openGate(i); return }
    }
    if (r.progress >= 1) {
      r.state = 'finishing'
      r.finishT = 0
      B().sfx('win')
      fx('gold-star', r.W / 2, r.H * 0.42, 260)
      fx('confetti', r.W * 0.3, r.H * 0.5, 240, { rise: 40 })
      fx('confetti', r.W * 0.7, r.H * 0.5, 240, { rise: 40 })
      say('Garis finis! Kamu hebat sekali!')
    }
  }

  /* ---------- input ---------- */
  var down = null
  function bindInput (cv) {
    cv.style.touchAction = 'none'
    var sx = 0
    var sy = 0
    var moved = 0
    function pos (e) {
      var r = cv.getBoundingClientRect()
      return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, px: e.clientX, py: e.clientY }
    }
    down = {
      pd: function (e) {
        if (!run || run.state !== 'play') return
        var p = pos(e)
        run.in.down = true
        run.in.tx = clamp(p.x, 0.04, 0.96)
        run.in.ty = clamp(p.y, 0.04, 0.96)
        sx = p.px
        sy = p.py
        moved = 0
        try { cv.setPointerCapture(e.pointerId) } catch (x) { /* synthetic pointer */ }
      },
      pm: function (e) {
        if (!run || !run.in.down) return
        var p = pos(e)
        run.in.tx = clamp(p.x, 0.04, 0.96)
        run.in.ty = clamp(p.y, 0.04, 0.96)
        var dx = p.px - sx
        moved = Math.max(moved, Math.abs(dx), Math.abs(p.py - sy))
        if (Math.abs(dx) > 26) { run.in.moves.push(dx > 0 ? 1 : -1); sx = p.px; moved = 99 }
      },
      pu: function (e) {
        if (!run) return
        var p = pos(e)
        if (run.in.down && moved < 14 && run.state === 'play') run.in.moves.push(p.x < 0.5 ? -1 : 1) // tap left / right half
        run.in.down = false
      },
      kd: function (e) {
        if (!run) return
        var k = e.key
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { run.in.moves.push(-1); run.in.kx = -1 }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { run.in.moves.push(1); run.in.kx = 1 }
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') run.in.ky = -1
        else if (k === 'ArrowDown' || k === 's' || k === 'S') run.in.ky = 1
        else if (k === ' ' || k === 'Spacebar') pressTurbo()
        else if (k === 'Escape') UI.pause()
        else return
        e.preventDefault()
      },
      ku: function (e) {
        if (!run) return
        var k = e.key
        if (k === 'ArrowLeft' || k === 'a' || k === 'A' || k === 'ArrowRight' || k === 'd' || k === 'D') run.in.kx = 0
        if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'ArrowDown' || k === 's' || k === 'S') run.in.ky = 0
      }
    }
    cv.addEventListener('pointerdown', down.pd)
    cv.addEventListener('pointermove', down.pm)
    cv.addEventListener('pointerup', down.pu)
    cv.addEventListener('pointercancel', down.pu)
    w.addEventListener('keydown', down.kd)
    w.addEventListener('keyup', down.ku)
  }
  function unbindInput (cv) {
    if (!down) return
    cv.removeEventListener('pointerdown', down.pd)
    cv.removeEventListener('pointermove', down.pm)
    cv.removeEventListener('pointerup', down.pu)
    cv.removeEventListener('pointercancel', down.pu)
    w.removeEventListener('keydown', down.kd)
    w.removeEventListener('keyup', down.ku)
    down = null
  }
  function stepInput (dt) {
    var i = run.in
    // held keys steer the free target (swipe/tap lanes are handled by the land engine from i.moves)
    if (i.kx) i.tx = clamp(i.tx + i.kx * dt * 0.9, 0.04, 0.96)
    if (i.ky) i.ty = clamp(i.ty + i.ky * dt * 0.9, 0.04, 0.96)
    // a light ease (the engines ease the vehicle again): two slow eases stacked lagged ~0.25 s behind the finger
    var k = Math.min(1, dt * 22)
    i.x += (i.tx - i.x) * k
    i.y += (i.ty - i.y) * k
  }

  /* ---------- events from engines ---------- */
  var LINES_STAR = ['Bintang! Hebat!', 'Satu lagi. Kamu pintar!', 'Wah, berkilau!', 'Terus kumpulkan, ya!']
  var LINES_BUMP = ['Oops! Tidak apa-apa. Ayo lanjut!', 'Aduh, pelan sedikit ya. Coba lagi!', 'Tidak masalah! Kita lanjut jalan.']
  function say (t) { if (UI && UI.say) UI.say(t) }
  function collect (x, y, big) {
    if (!run) return
    run.combo = (run.combo || 0) + 1
    run.stars += (big ? 2 : 1) + (run.combo % 5 === 0 ? 1 : 0)
    if (run.combo % 5 === 0) { say('Kombo ' + run.combo + '! Bintang bonus!'); fx('gold-star', x, y - 30, 180) }
    run.comboT = 3
    B().sfx('collect')
    // CTR: ten wumpa make the kart a little faster - here ten stars, with Blippi saying so once
    if (!run.juiced && run.stars >= 10) { run.juiced = true; say('Sepuluh bintang! Kendaraanmu jadi lebih ngebut!') }
    fx('spark', x, y, 120)
    // the star FLIES to the star counter (an arc, 0.55 s), which pops when it lands: the child sees where it went
    if (!reduced() && run.fly.length < 12) run.fly.push({ x: x, y: y, t: 0, d: 0.55, n: big ? 2 : 1 })
    if (run.lvl.cat === 'air') fx('droplets', x, y + 10, 130)
    if (run.stars % 4 === 0) say(LINES_STAR[(run.stars / 4) % LINES_STAR.length | 0])
  }
  function bump (x, y) {
    if (!run || run.slowT > 0.2) return
    // the bubble shield takes the knock: the obstacle bounces off, nothing is lost
    if (run.shieldT > 0) { run.shieldT = 0; run.hitT = 0.6; B().sfx('ok'); fx('spark', x, y, 160); say('Pelindungnya pecah. Kamu tetap aman!'); return }
    run.bumps++
    run.combo = 0
    run.slowT = 1.1
    run.hitT = 0.9
    run.reserves = 0 // CTR: a hit costs the stored turbo
    B().sfx('bump')
    if (run.lvl.cat === 'air') { fx('splash', x, y, 190); fx('ripple', x, y + 30, 200) } else fx('dust', x, y, 130)
    say(LINES_BUMP[run.bumps % LINES_BUMP.length])
  }
  // a turbo pad / pickup: a level-1 turbo (CTR turbo pads add reserves at the single-turbo cap)
  function boost (x, y) { turbo(1.6, 1, x, y, 'Wuuush! Cepat sekali!') }
  // add CTR reserves (seconds, stacking up to CTR.maxRes) and raise the fire level (never lowers it while reserves last)
  function turbo (sec, level, x, y, line) {
    if (!run) return
    run.reserves = Math.min(CTR.maxRes, run.reserves + sec)
    run.fire = Math.max(run.fire, Math.min(2, level))
    run.boostT = run.reserves
    run.slowT = 0
    B().sfx(level >= 2 ? 'turbo3' : level === 1 ? 'turbo2' : 'boost')
    if (x != null) { fx('speed', x, y, 100 + level * 20); fx('spark', x, y - 10, 90 + level * 30) }
    // owner 2026-10-17: every turbo throws speed lines out from the centre (shared Dunia SpeedLines overlay)
    try { if (window.SpeedLines) window.SpeedLines.burst({ dur: Math.min(2400, 600 + sec * 700), power: 0.55 + 0.2 * Math.max(0, level) }) } catch (e) {}
    run.turboN = (run.turboN || 0) + 1
    if (line) say(line)
  }
  // the CTR turbo meter, shared by every engine (a road corner, a wind stream, a sea current, a warp lane): inside a zone it
  // fills over CTR.room s, its last CTR.red s are red; a press in the red is a turbo (more the closer to full), up to
  // CTR.boosts per zone; a press in the green empties it; a full meter left alone is lost for this zone (CTR adds 3
  // attempts) - with a short grace for small fingers
  var FIRE = [['#FFF3B0', '#FFB347'], ['#FFE29A', '#FF7A1A'], ['#FFD1D1', '#FF3B30']]
  function meter () {
    var m = { on: false, idx: -1, meter: 0, red: false, boosts: 0, tries: 0, spent: false, full: 0, dir: 0 }
    m.step = function (dt, zi, dir) {
      if (zi !== m.idx) { m.idx = zi; m.on = zi >= 0; m.meter = 0; m.boosts = 0; m.tries = 0; m.spent = false; m.full = 0; m.red = false; m.dir = zi >= 0 ? dir : 0 }
      if (!m.on || m.spent) { m.red = false; return }
      var wasRed = m.red
      m.meter = Math.min(1, m.meter + dt / CTR.room)
      m.red = m.meter >= 1 - CTR.red / CTR.room
      if (m.red && !wasRed) B().sfx('meter')
      if (m.meter >= 1) {
        m.full += dt
        if (m.full > 0.18) { m.spent = true; m.red = false; if (!m.boosts) say('Ups, terlewat. Tekan saat merah, ya!') }
      }
    }
    m.press = function (x, y) {
      if (!m.on || m.spent) return
      if (m.red) {
        var left = (1 - m.meter) * CTR.room
        var gain = CTR.fullGain + (CTR.minGain - CTR.fullGain) * Math.min(1, left / CTR.red)
        turbo(gain, m.boosts, x, y, ['Turbo!', 'Turbo dua!', 'TURBO TIGA! Hebat!'][m.boosts])
        run.meterN = (run.meterN || 0) + 1
        m.boosts++
        m.meter = 0; m.full = 0; m.red = false
        if (m.boosts >= CTR.boosts) m.spent = true
      } else {
        m.meter = 0
        m.tries++
        if (m.tries === 1) say('Tunggu sampai merah, ya!')
        if (m.tries >= 4) m.spent = true
      }
    }
    return m
  }
  // the meter over the vehicle (the child looks at the vehicle, not the button): fills green, last part red, one dot per turbo
  function meterBar (c, m, x, y, sz) {
    var wd = sz * 0.8
    var h = Math.max(14, sz * 0.1)
    var x0 = x - wd / 2
    c.fillStyle = 'rgba(19,49,138,.55)'
    rrect(c, x0 - 3, y - 3, wd + 6, h + 6, h); c.fill()
    c.fillStyle = 'rgba(255,90,60,.35)'
    c.fillRect(x0 + wd * (1 - CTR.red / CTR.room), y, wd * CTR.red / CTR.room, h)
    c.fillStyle = m.red ? '#FF3B30' : '#36C46B'
    rrect(c, x0, y, Math.max(h, wd * m.meter), h, h / 2); c.fill()
    var d
    for (d = 0; d < m.boosts; d++) { c.fillStyle = FIRE[d][1]; c.beginPath(); c.arc(x0 + wd + 16 + d * 18, y + h / 2, 7, 0, 6.3); c.fill() }
  }
  // meter zones for the free-steering engines, in run.len units (3.4-4.5 s at speed 1, like a road corner), after the
  // opening grace and clear of the question gates
  function zones (gateZ, grace) {
    var r = run.rnd
    var out = []
    var z = grace + 3.6
    while (z < run.len - 7) {
      var zl = 3.4 + r() * 1.1
      var zz = z
      if (gateZ.some(function (g) { return g > zz - 2.7 && g < zz + zl + 1.8 })) { z += 1.8; continue }
      out.push({ z0: z, z1: z + zl, dir: r() < 0.5 ? -1 : 1 })
      z += zl + 7.3 + r() * 5.5
    }
    return out
  }
  function zoneAt (zs, z) { for (var i = 0; i < zs.length; i++) if (z >= zs[i].z0 && z < zs[i].z1) return i; return -1 }
  // three gift-box spots (run.len units) near 30 / 55 / 78 % of the run, pushed forward past anything avoid(z) refuses
  function giftSpots (avoid) {
    var out = []
    ;[0.3, 0.55, 0.78].forEach(function (f) { var z = f * run.len, n = 0; while (avoid(z) && n < 40) { z += 0.5; n++ } if (!avoid(z)) out.push(z) })
    return out
  }
  // CTR-style rubber band (gap = rival minus child, run.len units): far ahead a rival eases off, far behind it pushes
  function band (gap) { return gap > 7.3 ? 0.78 : gap > 4.1 ? 0.9 : gap < -4.5 ? 1.2 : 1 }
  // race position from the rivals' z against the child's (same units); Blippi cheers an overtake
  function place (rivals, z) {
    var np = 1
    for (var i = 0; i < rivals.length; i++) if (rivals[i].z > z) np++
    if (run.pos && np < run.pos && run.state === 'play') { say(np === 1 ? 'Salip! Kamu juara satu!' : 'Salip! Posisi ' + np + '!'); B().sfx('ok') }
    run.pos = np
    run.racers = rivals.length + 1
  }
  // a gift box (CTR's item crate, kid-safe: nothing to throw at anyone): a bubble shield that takes one knock, a star magnet
  // that pulls every lane's stars in, or a turbo; the three take turns so every box feels new
  var GIFTS = ['shield', 'magnet', 'turbo']
  function gift (x, y) {
    if (!run) return
    var k = GIFTS[(run.giftN || 0) % 3]
    run.giftN = (run.giftN || 0) + 1
    run.gifts = (run.gifts || []).concat(k)
    fx('gold-star', x, y, 170)
    B().sfx('collect')
    if (k === 'shield') { run.shieldT = 9; say('Gelembung pelindung! Aman dari satu benturan.') }
    else if (k === 'magnet') { run.magnetT = 8; say('Magnet bintang! Bintang datang sendiri.') }
    else turbo(1.6, 1, x, y, 'Kotak turbo! Wuuush!')
  }
  // the box itself: a rainbow crate with a big ?, bobbing and turning a little
  function drawGift (c, x, y, sz) {
    var b = reduced() ? 0 : Math.sin(run.t * 4 + x * 0.01) * sz * 0.06
    c.save(); c.translate(x, y + b); c.rotate(reduced() ? 0 : Math.sin(run.t * 2.2 + x) * 0.12)
    var g = c.createLinearGradient(-sz / 2, -sz / 2, sz / 2, sz / 2)
    g.addColorStop(0, '#FF8FB1'); g.addColorStop(0.35, '#FFD86B'); g.addColorStop(0.7, '#7CE3B0'); g.addColorStop(1, '#7FB8FF')
    c.fillStyle = g
    c.strokeStyle = '#FFFFFF'
    c.lineWidth = Math.max(2, sz * 0.07)
    rrect(c, -sz / 2, -sz / 2, sz, sz, sz * 0.22); c.fill(); c.stroke()
    c.fillStyle = '#FFFFFF'
    c.font = '800 ' + Math.round(sz * 0.7) + 'px Fredoka,Nunito,sans-serif'
    c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText('?', 0, sz * 0.04)
    c.restore()
  }
  // shield bubble and magnet ring around the vehicle (the engine says where it is: eng.vpos() -> {x, y, s})
  function drawAura (c) {
    var v = run.eng && run.eng.vpos ? run.eng.vpos() : null
    if (!v) return
    if (run.shieldT > 0) {
      var a = run.shieldT < 2 ? (Math.floor(run.t * 8) % 2 ? 0.25 : 0.6) : 0.6
      var g = c.createRadialGradient(v.x - v.s * 0.2, v.y - v.s * 0.25, v.s * 0.1, v.x, v.y, v.s * 0.75)
      g.addColorStop(0, 'rgba(255,255,255,' + (a * 0.5) + ')'); g.addColorStop(0.75, 'rgba(160,225,255,' + (a * 0.25) + ')'); g.addColorStop(1, 'rgba(120,200,255,' + a + ')')
      c.fillStyle = g
      c.beginPath(); c.arc(v.x, v.y, v.s * 0.75, 0, 6.3); c.fill()
    }
    if (run.magnetT > 0) {
      c.save()
      c.strokeStyle = 'rgba(255,200,46,.85)'
      c.lineWidth = 4
      c.setLineDash([10, 12])
      c.lineDashOffset = reduced() ? 0 : -run.t * 60
      c.beginPath(); c.arc(v.x, v.y, v.s * 0.85, 0, 6.3); c.stroke()
      c.restore()
    }
  }
  // the TURBO button (or Space / ArrowUp): before GO it is the start turbo, in a run the engine decides (a drift meter)
  function pressTurbo () {
    if (!run) return
    if (run.state === 'count') { run.startPress = run.countT; return }
    if (run.state === 'play' && run.eng && run.eng.turbo) run.eng.turbo()
  }
  function countdown (dt) {
    var r = run
    var before = Math.floor(r.countT / CTR.step)
    r.countT += dt
    r.t += dt
    var now = Math.floor(r.countT / CTR.step)
    if (now !== before && now <= 3) { UI.count(now < 3 ? String(3 - now) : 'GO!'); B().sfx(now < 3 ? 'tick' : 'go') }
    if (now >= 3) {
      r.state = 'play'
      var early = CTR.step * 3 - r.startPress
      if (early >= 0 && early <= CTR.startWin) turbo(1.4, 1, r.W / 2, r.H * 0.8, 'Start turbo! Mantap!')
      else if (r.startPress > 0) say('Hampir! Tekan TURBO pas lampu hijau, ya.')
    }
  }

  /* ---------- question gates ---------- */
  function nextQuestion () {
    var SE = w.SoalEngine
    if (!SE) return null
    var q = null
    var tries = 0
    var grade = run.lvl.id.slice(-1) < '3' ? 1 : 2
    while (tries++ < 10) {
      var got = SE.pick({ game: 'blippi', context: 'gate', avatar: 'auto', count: 1, grade: tries > 3 ? 2 : grade, exclude: seenQ })
      q = got && got[0]
      if (q && seenQ.indexOf(q.id) < 0) break
      q = null
    }
    if (q) { seenQ.push(q.id); if (seenQ.length > 200) seenQ = seenQ.slice(-100) }
    return q
  }
  function openGate (i) {
    var q = nextQuestion()
    if (!q) return
    run.state = 'quiz'
    run.quiz = { q: q, tries: 0, gate: i, done: false, ok: false }
    B().sfx('win')
    UI.quiz(run.quiz)
  }
  // answer by choice index. returns 'ok' | 'again' | 'reveal'
  function answer (idx) {
    var qz = run && run.quiz
    if (!qz || qz.done) return null
    var q = qz.q
    qz.tries++
    if (String(q.choices[idx]) === String(q.answer)) {
      qz.done = true
      qz.ok = true
      run.qlog.push({ id: q.id, tries: qz.tries, ok: true })
      B().sfx('ok')
      return 'ok'
    }
    B().sfx('bad')
    if (qz.tries >= 2) {
      qz.done = true
      run.qlog.push({ id: q.id, tries: qz.tries, ok: false })
      return 'reveal'
    }
    return 'again'
  }
  function resumeFromQuiz () {
    var qz = run && run.quiz
    if (!qz) return
    run.quiz = null
    run.state = 'play'
    if (qz.ok) {
      run.bonus += 2
      run.stars += 2
      boost(run.W / 2, run.H * 0.62)
      fx('gold-star', run.W / 2, run.H * 0.4, 240)
    } else {
      say('Tidak apa-apa. Kita belajar bersama. Ayo lanjut!')
    }
  }

  /* ---------- finish + save ---------- */
  function ratingOf (r) {
    var total = Math.max(1, r.starTotal + r.gates.length * 2)
    var p = r.stars / total
    return p >= 0.7 ? 3 : p >= 0.4 ? 2 : 1
  }
  function finish () {
    var r = run
    r.state = 'done'
    var stars = ratingOf(r)
    var first = false
    var improved = false
    var id = r.lvl.id
    B().commit(function (s) {
      s.trip = s.trip || { lv: {}, rw: {} }
      s.trip.lv = s.trip.lv || {}
      s.trip.rw = s.trip.rw || {}
      var o = s.trip.lv[id]
      if (!o) { s.trip.lv[id] = { stars: stars, best: r.stars, n: 1 }; first = true; improved = true } else {
        improved = stars > o.stars
        s.trip.lv[id] = { stars: Math.max(o.stars, stars), best: Math.max(o.best || 0, r.stars), n: (o.n || 0) + 1 }
      }
      if (!s.trip.rw[id]) s.trip.rw[id] = 1
      else first = false
    })
    UI.result(r, stars, first, improved)
  }
  function levelState (id) {
    var t = (B().state().trip || {}).lv || {}
    return t[id] || null
  }
  function unlocked (lvl) {
    var idx = D.levels.indexOf(lvl)
    var prev = D.levels[idx - 1]
    if (!prev || prev.cat !== lvl.cat) return true
    return !!levelState(prev.id)
  }
  function catStars (catId) {
    var s = 0
    var n = 0
    D.levels.forEach(function (l) { if (l.cat === catId) { n += 3; var o = levelState(l.id); if (o) s += o.stars } })
    return { have: s, of: n }
  }

  function work90 () { if (!run || run.work.length < 10) return 0; var a = run.work.slice().sort(function (x, y) { return x - y }); return a[Math.floor(a.length * 0.9)] }
  function pauseRun () { if (run && (run.state === 'play' || run.state === 'count')) { run.before = run.state; run.state = 'paused'; if (run.wx) run.wx.hush() } }
  function resumeRun () { if (run && run.state === 'paused') { run.state = run.before || 'play'; last = 0 } }
  w.document.addEventListener('visibilitychange', function () { if (w.document.hidden && run && run.state === 'play') UI.pause() })

  w.BlippiTrip = {
    engine: function (name, E) { engines[name] = E },
    setUI: function (u) { UI = u },
    D: D, craft: craft, crafts: crafts, setCraft: setCraft, frameSpr: frameSpr, frameBot: frameBot, halfSheet: halfSheet, fleet: fleet, ride: ride, setRide: setRide, rideRivals: rideRivals, start: start, stop: stop, answer: answer, resumeFromQuiz: resumeFromQuiz, pauseRun: pauseRun, resumeRun: resumeRun,
    scaled: scaled, levelState: levelState, unlocked: unlocked, catStars: catStars, url: url, load: load, img: img, spr: spr, rng: rng, clamp: clamp, lerp: lerp,
    running: function () { return !!run },
    // QA seam: jump the run to a progress (0..1) so a gate can look at the opening and the arrival
    qaSeek: function (p) { if (run) run.progress = clamp(p, 0, 0.999) },
    // QA seam: read-only snapshot for the gate
    qa: function () {
      return run ? { state: run.state, progress: run.progress, stars: run.stars, bumps: run.bumps, mul: run.mul, scale: run.scale, W: run.W, H: run.H,
        gates: run.gates.map(function (g) { return g.done }), quiz: run.quiz ? { prompt: run.quiz.q.prompt, answerIdx: run.quiz.q.choices.indexOf(run.quiz.q.answer), tries: run.quiz.tries, id: run.quiz.q.id } : null,
        qlog: run.qlog.slice(), seen: seenQ.slice(), lane: run.eng && run.eng.lane != null ? run.eng.lane : null, len: run.len, workP90: work90(), layers: run.eng && run.eng.layers ? run.eng.layers.slice() : [], reserves: run.reserves, fire: run.fire, pos: run.pos || 0, air: !!(run.eng && run.eng.air), corners: run.eng && run.eng.corners ? run.eng.corners.length : 0, cornerObs: run.eng && run.eng.cornerObs ? run.eng.cornerObs() : 0, ramps: run.eng && run.eng.ramps ? run.eng.ramps() : 0, rivals: run.eng && run.eng.rivals ? run.eng.rivals.length : 0, dts: run.dts.slice(), scale: run.scale, tween: tweens > 0, obsN: run.eng && run.eng.obsN != null ? run.eng.obsN : -1, rivalKeys: run.eng && run.eng.rivals ? run.eng.rivals.map(function (v) { return v.key }) : [], rivalArt: !!(run.eng && run.eng.rivals && run.eng.rivals.length && run.eng.rivals.every(function (v) { return !!img(v.key) })), turboGone: !!w.document.querySelector('[data-act=turbo].gone'), teach: !!w.document.querySelector('[data-act=turbo].teach'), meterN: run.meterN || 0, stretch: !!run.stretch, gifts: (run.gifts || []).slice(), giftBoxes: run.eng && run.eng.gifts ? run.eng.gifts() : 0, shieldT: run.shieldT || 0, magnetT: run.magnetT || 0, mulNow: run.mul, juiced: run.juiced, turboN: run.turboN || 0, drift: run.eng && run.eng.drift ? run.eng.drift() : null, wx: run.wx ? run.wx.state() : null, obs0: run.eng && run.eng.obs0 != null ? run.eng.obs0 : null } : null
    },
    reducedMotion: reduced, setRunLen: function () {}
  }
})(window)
