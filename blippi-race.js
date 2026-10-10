/* G32 Blippi -- BALAPAN: arena racing core (state machine, simulation, canvas draw, peek cycle, ghost, save). UI is in blippi-race-ui.js.
 * Contract (docs/CLAUDE-HANDOFF-COMPLETE.md section 6): start/respawn in `standard`; 6000 ms cycle 30% standard / 70% blippi_peek; 120 ms crossfade of
 * the SAME logical view; both layers switch to the new view together when the heading changes; clock resets on countdown / respawn / hide / restart and
 * only runs while driving input is live; reduced motion = instantaneous matched-angle swap at 30%.
 * Routes (centerline / width / start / obstacles / occluders / HUD) are AUTHORED in data/blippi-race-routes.js and never inferred from pixels. */
(function (w) {
  'use strict'
  var RD = w.BlippiRaceData
  var RR = w.BlippiRaceRoutes
  var V = w.BlippiVFX || {}
  var NAMES = { ambulance: 'AMBULANS', 'fire-engine': 'MOBIL PEMADAM', 'police-suv': 'MOBIL POLISI', 'recycling-truck': 'TRUK DAUR ULANG', 'school-bus': 'BUS SEKOLAH',
    biplane: 'PESAWAT SAYAP DUA', floatplane: 'PESAWAT LAUT', 'light-plane': 'PESAWAT KECIL', 'passenger-jet': 'PESAWAT PENUMPANG', turboprop: 'PESAWAT BALING-BALING',
    sailboat: 'KAPAL LAYAR', speedboat: 'KAPAL CEPAT', submarine: 'KAPAL SELAM', tugboat: 'KAPAL TUNDA', workboat: 'KAPAL KERJA' }
  var ANAMES = { 'kota-roda': 'Kota Roda', 'taman-air': 'Taman Air', 'eco-park': 'Eco Park', 'kebun-ceria': 'Kebun Ceria', pelabuhan: 'Pelabuhan', 'wonder-lab': 'Wonder Lab', 'hutan-lumpur': 'Hutan Lumpur', konstruksi: 'Konstruksi' }
  var VIEWS = RD.views
  var CYCLE = RD.peek.default_cycle_ms
  var STD_MS = CYCLE * RD.peek.standard_ratio
  var XFADE = 120
  var SPEED = 250
  var TURN = 3.4
  var cache = {}
  var R = null // live race
  var raf = 0
  var UI = null
  var down = null

  function B () { return w.Blippi }
  function reduced () { return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) }
  function clamp (v, a, b) { return v < a ? a : v > b ? b : v }
  function vehicle (id) { for (var i = 0; i < RD.vehicles.length; i++) if (RD.vehicles[i].id === id) return RD.vehicles[i]; return null }
  function arenaRec (id) { for (var i = 0; i < RD.arenas.length; i++) if (RD.arenas[i].id === id) return RD.arenas[i]; return null }
  function oriNow () { return w.innerWidth < w.innerHeight ? 'portrait' : 'landscape' }
  function vurl (id, state, view) { return 'assets/race/' + id + '/' + state + '-' + view + '.webp' }
  function aurl (id, ori) { return 'assets/arena/' + id + '-' + ori + '.webp' }

  function load (urls, cb) {
    var left = 0
    var done = false
    urls.forEach(function (u) { if (cache[u] === undefined) left++ })
    if (!left) { cb(); return }
    urls.forEach(function (u) {
      if (cache[u] !== undefined) return
      var im = new Image()
      im.onload = function () { cache[u] = im; if (--left === 0 && !done) { done = true; cb() } }
      im.onerror = function () { cache[u] = false; if (--left === 0 && !done) { done = true; cb() } }
      im.src = u
    })
  }
  function vehicleUrls (id) {
    var o = []
    VIEWS.forEach(function (v) { o.push(vurl(id, 'standard', v)); o.push(vurl(id, 'blippi_peek', v)) })
    return o
  }

  /* ---------- route geometry ---------- */
  function prep (route) {
    var pts = route.centerline
    var cum = [0]
    var i
    for (i = 0; i < pts.length; i++) {
      var a = pts[i]
      var b = pts[(i + 1) % pts.length]
      cum.push(cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]))
    }
    return { pts: pts, cum: cum, L: cum[pts.length], n: pts.length, tw: route.trackWidth, obs: route.obstacles, occ: route.occluders, start: route.start }
  }
  // nearest point on the loop within a window of segments around `hint` (so a shortcut across the infield never counts)
  function nearest (g, x, y, hint) {
    var best = 1e9
    var out = { d: 0, s: 0, seg: hint, px: 0, py: 0, tx: 1, ty: 0 }
    var k
    for (k = -3; k <= 4; k++) {
      var si = ((hint + k) % g.n + g.n) % g.n
      var a = g.pts[si]
      var b = g.pts[(si + 1) % g.n]
      var dx = b[0] - a[0]
      var dy = b[1] - a[1]
      var l2 = dx * dx + dy * dy
      var t = l2 ? clamp(((x - a[0]) * dx + (y - a[1]) * dy) / l2, 0, 1) : 0
      var qx = a[0] + dx * t
      var qy = a[1] + dy * t
      var d = Math.hypot(x - qx, y - qy)
      if (d < best) { best = d; out = { d: d, s: g.cum[si] + t * Math.sqrt(l2), seg: si, px: qx, py: qy, tx: dx / Math.sqrt(l2 || 1), ty: dy / Math.sqrt(l2 || 1) } }
    }
    return out
  }
  function pointAt (g, s) {
    s = ((s % g.L) + g.L) % g.L
    var i = 0
    while (i < g.n - 1 && g.cum[i + 1] <= s) i++
    var a = g.pts[i]
    var b = g.pts[(i + 1) % g.n]
    var l = g.cum[i + 1] - g.cum[i]
    var t = l ? (s - g.cum[i]) / l : 0
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
  }
  function inPoly (poly, x, y) {
    var c = false
    var i
    var j = poly.length - 1
    for (i = 0; i < poly.length; i++) {
      if ((poly[i][1] > y) !== (poly[j][1] > y) && x < (poly[j][0] - poly[i][0]) * (y - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0]) c = !c
      j = i
    }
    return c
  }

  /* ---------- view selection (matched angle, mirror east) ---------- */
  function viewFor (heading) {
    var vx = Math.cos(heading)
    var vy = Math.sin(heading)
    var th = Math.atan2(Math.abs(vx), vy) * 180 / Math.PI // 0 = toward camera (south), 180 = away (north)
    var best = 0
    var bd = 999
    var i
    for (i = 0; i < VIEWS.length; i++) {
      var d = Math.abs(th - RD.angles[VIEWS[i]])
      if (d < bd) { bd = d; best = i }
    }
    return { view: VIEWS[best], mirror: vx > 0.05 } // native side/3-4 art faces left, so heading east is the mirrored case
  }

  /* ---------- start / loop ---------- */
  function start (o) {
    stop()
    var ori = oriNow()
    var route = RR[o.arena] && RR[o.arena][ori]
    if (!route) return false
    var g = prep(route)
    var veh = vehicle(o.vehicle)
    var cv = o.canvas
    var laps = o.laps || 2
    var mm = /[?&]racelaps=([0-9.]+)/.exec(w.location.search)
    if (mm) laps = parseFloat(mm[1])
    R = {
      o: o, g: g, ori: ori, veh: veh, cv: cv, c: cv.getContext('2d'), mode: o.mode, laps: laps, W: ori === 'portrait' ? 941 : 1672, H: ori === 'portrait' ? 1672 : 941,
      state: 'count', x: g.start.x, y: g.start.y, hd: g.start.dir * Math.PI / 180, speed: 0, seg: 0, s: 0, sPrev: 0, lap: 0, lapT: 0, laptimes: [], t: 0, clock: 0,
      slowT: 0, bumpCool: 0, view: 'front', mirror: false, blend: 0, off: false, wrong: 0, fx: [], rec: [], recT: 0, ghost: null, ghostT: 0, finished: false,
      in: { down: false, px: 0, py: 0, kx: 0 }, k: 1, ox: 0, oy: 0, cw: 0, ch: 0, work: [], bumps: 0, input: false
    }
    var vv = viewFor(R.hd)
    R.view = vv.view
    R.mirror = vv.mirror
    if (R.mode === 'hantu') {
      var gh = (B().state().race.ghost || {})[o.arena + ':' + ori]
      if (gh && gh.p && gh.p.length > 6) R.ghost = gh
    }
    bind(cv)
    resize()
    last = 0
    raf = w.requestAnimationFrame(frame)
    return true
  }
  function stop () {
    if (raf) w.cancelAnimationFrame(raf)
    raf = 0
    if (R && R.cv) unbind(R.cv)
    R = null
  }
  function resize () {
    if (!R) return
    var p = R.cv.parentNode.getBoundingClientRect()
    var cw = Math.max(200, Math.round(p.width))
    var ch = Math.max(200, Math.round(p.height))
    var dpr = Math.min(w.devicePixelRatio || 1, 1.25)
    R.cv.width = Math.round(cw * dpr)
    R.cv.height = Math.round(ch * dpr)
    R.cv.style.width = cw + 'px'
    R.cv.style.height = ch + 'px'
    R.dpr = dpr
    R.cw = cw
    R.ch = ch
    R.k = Math.min(cw / R.W, ch / R.H)
    R.ox = (cw - R.W * R.k) / 2
    R.oy = (ch - R.H * R.k) / 2
  }
  w.addEventListener('resize', function () {
    if (!R) return
    if (oriNow() !== R.ori) { if (UI && UI.orientationChanged) UI.orientationChanged(); return }
    resize()
  })

  var last = 0
  function frame (ts) {
    raf = 0
    if (!R) return
    var dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016
    last = ts
    var w0 = w.performance.now()
    if (R.state === 'race' || R.state === 'settle') step(dt)
    R.t += dt
    draw(dt)
    if (UI && UI.tick) UI.tick(R)
    R.work.push(w.performance.now() - w0)
    if (R.work.length > 240) R.work.shift()
    raf = w.requestAnimationFrame(frame)
  }

  function begin () { // driving input becomes live: the 30/70 clock starts here
    if (!R) return
    R.state = 'race'
    R.clock = 0
    R.input = true
    R.blend = 0
    R.lapT = 0
    R.t0 = R.t
    R.recT = 0
    R.rec = []
    R.ghostT = 0
  }

  function step (dt) {
    var r = R
    var g = r.g
    if (r.state === 'race') { r.clock += dt * 1000; r.lapT += dt }
    r.bumpCool = Math.max(0, r.bumpCool - dt)
    r.slowT = Math.max(0, r.slowT - dt)
    // ---- steering: finger follows, keys rotate, otherwise the invisible hand eases toward the route
    var near = nearest(g, r.x, r.y, r.seg)
    var want = null
    if (r.input && r.in.down) want = Math.atan2(r.in.py - r.y, r.in.px - r.x)
    var rt = Math.atan2(near.ty, near.tx)
    if (r.input && r.in.kx) { r.hd += r.in.kx * 2.6 * dt } else if (want != null) {
      var dd = Math.atan2(Math.sin(want - r.hd), Math.cos(want - r.hd))
      r.hd += clamp(dd, -TURN * dt, TURN * dt)
    } else {
      var d2 = Math.atan2(Math.sin(rt - r.hd), Math.cos(rt - r.hd))
      r.hd += clamp(d2, -1.2 * dt, 1.2 * dt)
    }
    var half = g.tw / 2
    r.off = near.d > half * 1.05
    if (r.off) { // friendly nudge: lean toward the road, never a stop
      var toR = Math.atan2(near.py - r.y, near.px - r.x)
      var d3 = Math.atan2(Math.sin(toR - r.hd), Math.cos(toR - r.hd))
      r.hd += clamp(d3, -1.6 * dt, 1.6 * dt)
    }
    var target = SPEED * (r.off ? 0.55 : 1) * (r.slowT > 0 ? 0.45 : 1)
    r.speed += (target - r.speed) * Math.min(1, dt * 4)
    r.x += Math.cos(r.hd) * r.speed * dt
    r.y += Math.sin(r.hd) * r.speed * dt
    if (near.d > g.tw * 1.25) { // gentle pull so nobody drifts into the scenery
      r.x += (near.px - r.x) * Math.min(1, dt * 1.8)
      r.y += (near.py - r.y) * Math.min(1, dt * 1.8)
    }
    r.x = clamp(r.x, 10, r.W - 10)
    r.y = clamp(r.y, 10, r.H - 10)
    near = nearest(g, r.x, r.y, r.seg)
    r.seg = near.seg
    // progress along the route (monotonic window, jump-guarded)
    var cur = near.s + Math.floor(r.sPrev / g.L) * g.L
    var diff = cur - r.sPrev
    if (diff < -g.L / 2) cur += g.L
    else if (diff > g.L / 2) cur -= g.L
    if (Math.abs(cur - r.sPrev) < 220) r.s = Math.max(r.s - 40, cur) // small backing up is fine
    r.sPrev = r.s
    // wrong way hint (no penalty)
    var dot = Math.cos(r.hd) * near.tx + Math.sin(r.hd) * near.ty
    r.wrong = dot < -0.3 ? r.wrong + dt : Math.max(0, r.wrong - dt * 2)
    // soft obstacles
    var i
    for (i = 0; i < g.obs.length; i++) {
      if (r.bumpCool <= 0 && inPoly(g.obs[i], r.x, r.y)) { r.bumpCool = 1.4; r.slowT = 0.9; r.bumps++; B().sfx('bump'); spawnFx('dust', r.x, r.y, 150); if (UI && UI.say) UI.say('Oops, pelan-pelan ya!') }
    }
    // laps
    var lapNow = Math.floor(r.s / g.L)
    if (lapNow > r.lap && r.state === 'race') {
      r.lap = lapNow
      r.laptimes.push(r.lapT)
      r.lapT = 0
      spawnFx('spark', r.x, r.y, 170)
      B().sfx('collect')
      if (r.mode !== 'bebas' && r.s >= r.laps * g.L - 1) { finish(); return }
      if (UI && UI.say) UI.say('Putaran ' + (r.lap + 1) + '! Terus!')
    }
    if (r.mode !== 'bebas' && r.state === 'race' && r.s >= r.laps * g.L) { finish(); return }
    // ghost + record
    r.recT += dt
    if (r.recT >= 0.1 && r.state === 'race') { r.recT -= 0.1; r.rec.push(Math.round(r.x), Math.round(r.y), Math.round(r.hd * 100)) }
    r.ghostT += dt
    if (r.ghost && r.state === 'race') {
      var gi = Math.floor(r.clock / 100) * 3
      if (gi + 2 < r.ghost.p.length) {
        var gh = r.ghost.p
        var gv = viewFor(gh[gi + 2] / 100)
        r.ghostPose = { x: gh[gi], y: gh[gi + 1], view: gv.view, mirror: gv.mirror }
      } else r.ghostPose = null
    }
    // peek blend: target 1 (peek) during the last 70% of each 6 s cycle
    var phase = r.clock % CYCLE
    var tgt = phase >= STD_MS ? 1 : 0
    var vv = viewFor(r.hd)
    r.view = vv.view
    r.mirror = vv.mirror
    if (reduced()) r.blend = tgt
    else r.blend += clamp(tgt - r.blend, -dt / (XFADE / 1000), dt / (XFADE / 1000))
  }

  function finish () {
    if (!R || R.finished) return
    R.finished = true
    R.state = 'settle'
    R.input = false
    R.in.down = false
    R.finishAt = R.t
    if (UI && UI.finish) UI.finish(R)
  }

  function spawnFx (name, x, y, size) {
    if (!R || !V[name] || R.fx.length > 8) return
    R.fx.push({ k: V[name].file, x: x, y: y, s: size, t: 0, d: 0.7, b: V[name].blend })
    if (cache[V[name].file] === undefined) load([V[name].file], function () {})
  }

  /* ---------- draw ---------- */
  function drawVeh (c, id, view, mirror, blend, x, y, scale, alpha) {
    var rec = vehicle(id)
    var box = rec.box[view]
    var an = rec.anchor[view]
    var wd = box[0] * scale
    var ht = box[1] * scale
    var sA = cache[vurl(id, 'standard', view)]
    var pA = cache[vurl(id, 'blippi_peek', view)]
    c.save()
    c.translate(x, y)
    if (mirror) c.scale(-1, 1)
    var ax = (mirror ? 1 - an[0] : an[0])
    c.globalAlpha = alpha * (1 - blend)
    if (sA && blend < 1) c.drawImage(sA, -wd * ax, -ht * an[1], wd, ht)
    c.globalAlpha = alpha * blend
    if (pA && blend > 0) c.drawImage(pA, -wd * ax, -ht * an[1], wd, ht)
    c.restore()
  }
  function draw (dt) {
    var r = R
    var c = r.c
    var k = r.k * r.dpr
    c.setTransform(r.dpr, 0, 0, r.dpr, 0, 0)
    c.fillStyle = '#173B66'
    c.fillRect(0, 0, r.cw, r.ch)
    c.setTransform(k, 0, 0, k, r.ox * r.dpr, r.oy * r.dpr)
    var plate = cache[aurl(r.o.arena, r.ori)]
    if (plate) c.drawImage(plate, 0, 0, r.W, r.H)
    var sc = 0.55
    // shadow
    c.fillStyle = 'rgba(20,30,60,.25)'
    c.beginPath(); c.ellipse(r.x, r.y + 8, 52, 20, 0, 0, 6.3); c.fill()
    if (r.ghostPose) drawVeh(c, r.o.vehicle, r.ghostPose.view, r.ghostPose.mirror, 0, r.ghostPose.x, r.ghostPose.y, sc, 0.42)
    var bob = reduced() ? 0 : (r.state === 'race' ? Math.sin(r.t * 14) * 1.2 : 0)
    drawVeh(c, r.o.vehicle, r.view, r.mirror, r.blend, r.x, r.y + bob, sc, 1)
    // occluders: re-draw the plate over the vehicle where the road passes behind scenery
    if (plate && r.g.occ && r.g.occ.length) {
      var q
      for (q = 0; q < r.g.occ.length; q++) {
        var poly = r.g.occ[q]
        c.save()
        c.beginPath()
        poly.forEach(function (p, i) { if (i) c.lineTo(p[0], p[1]); else c.moveTo(p[0], p[1]) })
        c.closePath()
        c.clip()
        c.drawImage(plate, 0, 0, r.W, r.H)
        c.restore()
      }
    }
    // fx
    var i
    for (i = r.fx.length - 1; i >= 0; i--) {
      var f = r.fx[i]
      f.t += (r.state === 'paused' ? 0 : dt)
      var p2 = f.t / f.d
      if (p2 >= 1) { r.fx.splice(i, 1); continue }
      var im = cache[f.k]
      if (!im) continue
      c.save()
      c.globalAlpha = p2 < 0.3 ? p2 / 0.3 : 1 - (p2 - 0.3) / 0.7
      if (f.b === 'screen') c.globalCompositeOperation = 'screen'
      var wd = f.s * (reduced() ? 1 : 0.5 + p2 * 0.7)
      c.drawImage(im, f.x - wd / 2, f.y - wd * im.height / im.width / 2, wd, wd * im.height / im.width)
      c.restore()
    }
  }

  /* ---------- input ---------- */
  function toPlate (e) {
    var rc = R.cv.getBoundingClientRect()
    return { x: (e.clientX - rc.left - R.ox) / R.k, y: (e.clientY - rc.top - R.oy) / R.k }
  }
  function bind (cv) {
    cv.style.touchAction = 'none'
    down = {
      pd: function (e) { if (!R) return; var p = toPlate(e); R.in.down = true; R.in.px = p.x; R.in.py = p.y; try { cv.setPointerCapture(e.pointerId) } catch (x) { /* synthetic */ } },
      pm: function (e) { if (!R || !R.in.down) return; var p = toPlate(e); R.in.px = p.x; R.in.py = p.y },
      pu: function () { if (R) R.in.down = false },
      kd: function (e) { if (!R) return; if (e.key === 'ArrowLeft' || e.key === 'a') R.in.kx = -1; else if (e.key === 'ArrowRight' || e.key === 'd') R.in.kx = 1; else if (e.key === 'Escape') { if (UI && UI.pause) UI.pause() } else return; e.preventDefault() },
      ku: function (e) { if (!R) return; if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'ArrowRight' || e.key === 'd') R.in.kx = 0 }
    }
    cv.addEventListener('pointerdown', down.pd)
    cv.addEventListener('pointermove', down.pm)
    cv.addEventListener('pointerup', down.pu)
    cv.addEventListener('pointercancel', down.pu)
    w.addEventListener('keydown', down.kd)
    w.addEventListener('keyup', down.ku)
  }
  function unbind (cv) {
    if (!down) return
    cv.removeEventListener('pointerdown', down.pd)
    cv.removeEventListener('pointermove', down.pm)
    cv.removeEventListener('pointerup', down.pu)
    cv.removeEventListener('pointercancel', down.pu)
    w.removeEventListener('keydown', down.kd)
    w.removeEventListener('keyup', down.ku)
    down = null
  }

  /* ---------- save ---------- */
  function saveResult (r) {
    var total = r.clock / 1000
    var key = r.o.arena + ':' + r.ori
    var res = { total: total * 1000, laps: r.laptimes.slice(), newBest: false, prev: null, ghostSaved: false }
    if (r.mode === 'bebas') return res
    var st = B().state().race || {}
    var prev = (st.best || {})[key]
    res.prev = prev == null ? null : prev
    B().commit(function (s) {
      s.race = s.race || { best: {}, ghost: {}, runs: 0 }
      s.race.runs = (s.race.runs || 0) + 1
      var b = s.race.best[key]
      if (b == null || res.total < b) { s.race.best[key] = Math.round(res.total); res.newBest = true; if (r.rec.length < 4000) { s.race.ghost[key] = { t: Math.round(res.total), v: r.o.vehicle, p: r.rec.slice() }; res.ghostSaved = true } }
    })
    return res
  }

  w.BlippiRace = {
    D: RD, R: RR, NAMES: NAMES, ANAMES: ANAMES, setUI: function (u) { UI = u }, start: start, stop: stop, begin: begin, load: load, vehicleUrls: vehicleUrls, vurl: vurl, aurl: aurl, vehicle: vehicle, arena: arenaRec,
    oriNow: oriNow, reduced: reduced, finish: finish, saveResult: saveResult, resize: resize, cache: cache, viewFor: viewFor, nearest: nearest, pointAt: pointAt, prep: prep,
    running: function () { return !!R },
    pauseRun: function () { if (R && R.state === 'race') { R.state = 'paused'; R.pausedAt = R.t } },
    resumeRun: function () { if (R && R.state === 'paused') { R.state = 'race'; last = 0 } },
    qa: function () {
      if (!R) return null
      var near = nearest(R.g, R.x, R.y, R.seg)
      var ahead = pointAt(R.g, R.s + 170)
      return { state: R.state, mode: R.mode, ori: R.ori, view: R.view, mirror: R.mirror, blend: R.blend, clock: R.clock, phase: (R.clock % CYCLE) < STD_MS ? 'standard' : 'peek',
        lap: R.lap, laps: R.laps, s: R.s, L: R.g.L, d: near.d, off: R.off, x: R.x, y: R.y, hd: R.hd, speed: R.speed, bumps: R.bumps, wrong: R.wrong, finished: R.finished,
        k: R.k, ox: R.ox, oy: R.oy, aim: [ahead[0] * R.k + R.ox, ahead[1] * R.k + R.oy], workP90: (function () { var a = R.work.slice().sort(function (p, q) { return p - q }); return a.length > 10 ? a[Math.floor(a.length * 0.9)] : 0 })(),
        ghost: !!R.ghost, laptimes: R.laptimes.slice(), fx: R.fx.length }
    }
  }
})(window)
