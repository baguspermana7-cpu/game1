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
  var cache = {}
  var run = null
  var raf = 0
  var UI = null // set by blippi-trip-ui.js
  var seenQ = []
  var FXK = ['fx:spark', 'fx:dust', 'fx:speed', 'fx:gold-star', 'fx:confetti', 'fx:check-burst', 'fx:droplets', 'fx:ripple']

  function B () { return w.Blippi }
  function url (key) {
    var k = String(key)
    if (k.indexOf('lib:') === 0) return '../Dunia-Emosi/assets/db/lib/' + k.slice(4) + '.webp'
    if (k.indexOf('g:') === 0) return 'assets/blippi/' + k.slice(2) + '.webp'
    if (k.indexOf('fx:') === 0) return V[k.slice(3)] ? V[k.slice(3)].file : ''
    return k
  }
  // load a list of art keys; cb() when every one settled. cache[key] = Image (ok) | false (missing -> labelled placeholder)
  function load (keys, cb) {
    var need = []
    var i
    for (i = 0; i < keys.length; i++) if (cache[keys[i]] === undefined && need.indexOf(keys[i]) < 0) need.push(keys[i])
    var left = need.length
    if (!left) { cb(); return }
    need.forEach(function (k) {
      var im = new Image()
      im.onload = function () { cache[k] = im; if (--left === 0) cb() }
      im.onerror = function () { cache[k] = false; if (--left === 0) cb() }
      im.src = url(k)
    })
  }
  function img (key) { return cache[key] || null }
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
  function reduced () { return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) }

  /* ---------- drawing helpers shared by every engine ---------- */
  // draw art centred at (x,y) fitted INSIDE (bw,bh) (contain). opt: rot (rad), alpha, flip, anchor 'bottom' (y = bottom edge), label
  function spr (c, key, x, y, bw, bh, opt) {
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
    if (!run || !V[name] || run.fxs.length > 14) return
    o = o || {}
    run.fxs.push({ k: 'fx:' + name, x: x, y: y, s: size || 120, t: 0, d: o.dur || 0.8, rise: o.rise || 0, blend: V[name].blend })
    if (cache['fx:' + name] === undefined) load(['fx:' + name], function () {})
  }
  function drawFx (c, dt) {
    var i
    for (i = run.fxs.length - 1; i >= 0; i--) {
      var f = run.fxs[i]
      f.t += dt
      var p = f.t / f.d
      if (p >= 1) { run.fxs.splice(i, 1); continue }
      var im = cache[f.k]
      if (!im) continue
      var a = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7
      var sc = reduced() ? 1 : 0.5 + p * 0.7
      var wd = f.s * sc
      var ht = wd * im.height / im.width
      c.save()
      c.globalAlpha = clamp(a, 0, 1)
      if (f.blend === 'screen') c.globalCompositeOperation = 'screen'
      c.drawImage(im, f.x - wd / 2, f.y - ht / 2 - f.rise * p, wd, ht)
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
      lvl: lvl, E: E, cv: cv, c: cv.getContext('2d'), W: 0, H: 0, scale: 1, dpr: 1,
      rnd: rng(opts.seed || ((Date.now() & 0xffff) + 17)), len: lvl.len * (opts.len || 1),
      progress: 0, mul: 1, slowT: 0, boostT: 0, hitT: 0, rate: lvl.speed, t: 0,
      stars: 0, starTotal: 0, bumps: 0, state: 'loading', fxs: [], gates: [], quiz: null, qlog: [], bonus: 0,
      in: { down: false, x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, moves: [], kx: 0, ky: 0 },
      work: [], slowFrames: 0, finishT: 0, say: say, fx: fx, spr: spr, img: img, cover: coverC, scaled: scaled, grad: grad, rrect: rrect, clamp: clamp, lerp: lerp, reduced: reduced,
      collect: collect, bump: bump, boost: boost
    }
    run.gates = lvl.gates.map(function (f) { return { f: f, done: false } })
    resize()
    var mine = run
    load(E.assets(lvl).concat(FXK), function () {
      if (!run || run !== mine) return
      run.eng = E.make(run)
      run.state = 'play'
      UI.hud(run)
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
    run = null
  }

  function resize () {
    if (!run) return
    var cv = run.cv
    var r = cv.parentNode.getBoundingClientRect()
    run.W = Math.max(200, Math.round(r.width))
    run.H = Math.max(200, Math.round(r.height))
    run.dpr = Math.min(w.devicePixelRatio || 1, 1.5)
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
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016
    last = ts
    // adaptive render scale: sustained long frames drop resolution (floor 0.6); never raises again within a run
    if (dt > 0.024) run.slowFrames++
    else run.slowFrames = Math.max(0, run.slowFrames - 1)
    if (run.slowFrames > 40 && run.scale > 0.61) { run.scale = Math.max(0.6, run.scale - 0.15); run.slowFrames = 0; resize() }
    var w0 = w.performance.now()
    if (run.state === 'play' || run.state === 'finishing') update(dt)
    var c = run.c
    var k = run.dpr * run.scale
    c.setTransform(k, 0, 0, k, 0, 0)
    run.eng.draw(c, dt)
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
    r.boostT = Math.max(0, r.boostT - dt)
    r.hitT = Math.max(0, r.hitT - dt)
    var target = r.slowT > 0 ? 0.42 : (r.boostT > 0 ? 1.65 : 1)
    r.mul += (target - r.mul) * Math.min(1, dt * 5)
    if (r.state === 'finishing') { r.finishT += dt; r.mul = lerp(r.mul, 0.55, Math.min(1, dt * 2)) }
    r.rate = r.lvl.speed * r.mul
    r.eng.update(dt)
    if (r.lvl.cat !== 'darat') r.in.moves.length = 0
    if (r.state === 'finishing') {
      if (r.finishT > 1.6) finish()
      return
    }
    r.progress = Math.min(1, r.progress + r.rate * dt / r.len)
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
        if (Math.abs(dx) > 34) { run.in.moves.push(dx > 0 ? 1 : -1); sx = p.px; moved = 99 }
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
    // gentle ease so a finger jump never snaps the vehicle
    var k = Math.min(1, dt * 9)
    i.x += (i.tx - i.x) * k
    i.y += (i.ty - i.y) * k
  }

  /* ---------- events from engines ---------- */
  var LINES_STAR = ['Bintang! Hebat!', 'Satu lagi. Kamu pintar!', 'Wah, berkilau!', 'Terus kumpulkan, ya!']
  var LINES_BUMP = ['Oops! Tidak apa-apa. Ayo lanjut!', 'Aduh, pelan sedikit ya. Coba lagi!', 'Tidak masalah! Kita lanjut jalan.']
  function say (t) { if (UI && UI.say) UI.say(t) }
  function collect (x, y, big) {
    if (!run) return
    run.stars += big ? 2 : 1
    B().sfx('tap')
    fx('spark', x, y, 120)
    if (run.stars % 4 === 0) say(LINES_STAR[(run.stars / 4) % LINES_STAR.length | 0])
  }
  function bump (x, y) {
    if (!run || run.slowT > 0.2) return
    run.bumps++
    run.slowT = 1.1
    run.hitT = 0.9
    B().sfx('bad')
    fx('dust', x, y, 130)
    say(LINES_BUMP[run.bumps % LINES_BUMP.length])
  }
  function boost (x, y) {
    if (!run) return
    run.boostT = 2.4
    run.slowT = 0
    B().sfx('ok')
    fx('speed', x, y, 160)
    say('Wuuush! Cepat sekali!')
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
  function pauseRun () { if (run && run.state === 'play') run.state = 'paused' }
  function resumeRun () { if (run && run.state === 'paused') { run.state = 'play'; last = 0 } }
  w.document.addEventListener('visibilitychange', function () { if (w.document.hidden && run && run.state === 'play') UI.pause() })

  w.BlippiTrip = {
    engine: function (name, E) { engines[name] = E },
    setUI: function (u) { UI = u },
    D: D, start: start, stop: stop, answer: answer, resumeFromQuiz: resumeFromQuiz, pauseRun: pauseRun, resumeRun: resumeRun,
    scaled: scaled, levelState: levelState, unlocked: unlocked, catStars: catStars, url: url, load: load, img: img, spr: spr, rng: rng, clamp: clamp, lerp: lerp,
    running: function () { return !!run },
    // QA seam: read-only snapshot for the gate
    qa: function () {
      return run ? { state: run.state, progress: run.progress, stars: run.stars, bumps: run.bumps, mul: run.mul, scale: run.scale, W: run.W, H: run.H,
        gates: run.gates.map(function (g) { return g.done }), quiz: run.quiz ? { prompt: run.quiz.q.prompt, answerIdx: run.quiz.q.choices.indexOf(run.quiz.q.answer), tries: run.quiz.tries, id: run.quiz.q.id } : null,
        qlog: run.qlog.slice(), seen: seenQ.slice(), lane: run.eng && run.eng.lane != null ? run.eng.lane : null, len: run.len, workP90: work90() } : null
    },
    reducedMotion: reduced, setRunLen: function () {}
  }
})(window)
