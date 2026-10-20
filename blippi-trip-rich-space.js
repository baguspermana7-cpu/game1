/* G32 Blippi -- ANGKASA (outer space): eight procedural worlds for blippi-trip-top.js (T.rich.space).
 * The engine paints the gradient, its nebula blobs, three star layers and its planets; this adds, in two hooks:
 *   under  (behind the stars)  hero bodies that drift past over the whole run -- Earth, a cratered moon, a ringed giant with
 *          orbiting moons, a spiral galaxy, layered nebulae, a blazing sun with a rotating corona -- each at its own slow parallax
 *   over   (in front of the planets) belt rocks in three depths, comets with tails, a space station with solar arrays and signal
 *          pulses, satellites with blinking lights, four-point twinkles, shooting stars, drifting dust and solar wind
 *   fg     fast speed motes streaking past the rocket
 * Every body is a baked sprite; positions are functions of world z (Z * G.pyu * factor) and run.t. Obstacles live at x 0.14..0.86
 * and are the owner's asteroid art; background rocks are bluish, small and faint so they never read as obstacles. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  var R = T.rich
  var hash = R.hash, wrap = R.wrap

  // heroes: [sprite id, x, y0, parallax, size (x W), rot, alpha]
  var WORLDS = {
    moon: { heroes: [['earth', 0.2, 0.1, 0.08, 0.95, 0, 1], ['moon', 0.9, -0.2, 0.13, 0.85, 0.3, 1]], sat: 2, shoot: 1, twinkle: 1, dust: 1 },
    planets: { heroes: [['ringed', 0.68, 0.06, 0.07, 1.05, -0.32, 1], ['gas', 0.1, 0.5, 0.1, 0.34, 0, 1]], orbit: 1, sat: 0, shoot: 1, twinkle: 1, dust: 1 },
    belt: { heroes: [['ringed', 0.2, 0.14, 0.05, 0.5, 0.4, 0.8]], belt: 1, dust: 1, shoot: 0, twinkle: 1 },
    galaxy: { heroes: [['galaxy', 0.5, 0.12, 0.05, 1.7, 0, 0.95], ['galaxy', 0.08, 0.7, 0.07, 0.6, 1, 0.8]], spin: 1, twinkle: 2, shoot: 1, dust: 1 },
    nebula: { heroes: [['nebA', 0.3, 0.0, 0.05, 1.9, 0, 0.9], ['nebB', 0.8, 0.5, 0.09, 1.5, 1, 0.85]], twinkle: 2, motes: 1, shoot: 1 },
    comet: { heroes: [['nebC', 0.5, 0.1, 0.05, 2.0, 0.5, 0.7]], comet: 3, ice: 1, shoot: 1, twinkle: 1 },
    station: { heroes: [['earth', 0.5, 0.88, 0.06, 1.9, 0.2, 1]], station: 1, sat: 3, pulse: 1, twinkle: 1, shoot: 1 },
    corona: { heroes: [['sun', 0.82, 0.04, 0.05, 1.15, 0, 1]], wind: 1, flare: 1, shadowPlanet: 1, twinkle: 1 }
  }

  function circ (x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, 6.3) }
  var SP = {}
  SP.earth = function () {
    return R.sprite('sp-earth', 340, 340, function (x) {
      var g = x.createRadialGradient(170, 170, 120, 170, 170, 170); g.addColorStop(0, 'rgba(120,190,255,.55)'); g.addColorStop(0.55, 'rgba(120,190,255,.2)'); g.addColorStop(1, 'rgba(120,190,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 340, 340)
      x.save(); circ(x, 170, 170, 125); x.clip()
      var o = x.createRadialGradient(130, 125, 10, 170, 170, 125); o.addColorStop(0, '#5BB2F0'); o.addColorStop(1, '#1E5FB0'); x.fillStyle = o; x.fillRect(0, 0, 340, 340)
      var i
      x.fillStyle = '#4FB06A'
      for (i = 0; i < 9; i++) { x.beginPath(); x.ellipse(60 + hash(i + 1) * 220, 60 + hash(i + 11) * 220, 18 + hash(i + 21) * 34, 12 + hash(i + 31) * 26, hash(i) * 3, 0, 6.3); x.fill() }
      x.fillStyle = '#D9C27A'; for (i = 0; i < 4; i++) { x.beginPath(); x.ellipse(70 + hash(i + 41) * 200, 70 + hash(i + 51) * 200, 9, 6, hash(i), 0, 6.3); x.fill() }
      x.fillStyle = 'rgba(255,255,255,.7)'
      for (i = 0; i < 14; i++) { x.beginPath(); x.ellipse(40 + hash(i + 61) * 260, 40 + hash(i + 71) * 260, 20 + hash(i + 81) * 28, 5 + hash(i + 91) * 6, hash(i + 5) * 1.2 - 0.6, 0, 6.3); x.fill() }
      x.fillStyle = '#FFFFFF'; circ(x, 170, 48, 24); x.fill()
      var t = x.createRadialGradient(120, 115, 40, 190, 190, 140); t.addColorStop(0, 'rgba(0,10,40,0)'); t.addColorStop(1, 'rgba(0,10,40,.6)'); x.fillStyle = t; x.fillRect(0, 0, 340, 340)
      x.restore()
    }, 1)
  }
  SP.moon = function () {
    return R.sprite('sp-moon', 300, 300, function (x) {
      x.save(); circ(x, 150, 150, 130); x.clip()
      var g = x.createRadialGradient(110, 105, 10, 150, 150, 135); g.addColorStop(0, '#F2EEE6'); g.addColorStop(1, '#8C8A92'); x.fillStyle = g; x.fillRect(0, 0, 300, 300)
      var i
      for (i = 0; i < 22; i++) {
        var cx = 20 + hash(i + 3) * 260, cy = 20 + hash(i + 33) * 260, r = 6 + hash(i + 63) * 24
        x.fillStyle = 'rgba(80,78,92,.35)'; circ(x, cx, cy, r); x.fill()
        x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(cx - r * 0.12, cy - r * 0.12, r * 0.86, 0.6, 3.6); x.fill()
        x.fillStyle = 'rgba(60,58,72,.4)'; circ(x, cx + r * 0.1, cy + r * 0.1, r * 0.7); x.fill()
      }
      var s = x.createRadialGradient(110, 105, 60, 190, 190, 150); s.addColorStop(0, 'rgba(0,0,30,0)'); s.addColorStop(1, 'rgba(0,0,30,.55)'); x.fillStyle = s; x.fillRect(0, 0, 300, 300)
      x.restore()
    }, 1)
  }
  SP.ringed = function () {
    return R.sprite('sp-ringed', 460, 300, function (x) {
      var ring = function (front) {
        var i, C = ['rgba(255,236,200,.75)', 'rgba(220,190,150,.6)', 'rgba(255,246,225,.8)', 'rgba(190,160,130,.5)']
        for (i = 0; i < 4; i++) { x.strokeStyle = C[i]; x.lineWidth = 9; x.beginPath(); x.ellipse(230, 150, 215 - i * 17, 52 - i * 4, 0, front ? 0 : Math.PI, front ? Math.PI : 6.283); x.stroke() }
      }
      ring(false)
      var g = x.createRadialGradient(200, 120, 6, 230, 150, 100); g.addColorStop(0, '#FFE9C8'); g.addColorStop(0.6, '#E8A878'); g.addColorStop(1, '#9A5A62')
      x.save(); circ(x, 230, 150, 100); x.clip(); x.fillStyle = g; x.fillRect(0, 0, 460, 300)
      var i
      for (i = 0; i < 6; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.18)' : 'rgba(110,50,70,.18)'; x.fillRect(120, 78 + i * 24 + Math.sin(i) * 4, 220, 12) }
      var s = x.createRadialGradient(200, 120, 40, 260, 180, 130); s.addColorStop(0, 'rgba(0,0,30,0)'); s.addColorStop(1, 'rgba(10,0,40,.5)'); x.fillStyle = s; x.fillRect(0, 0, 460, 300)
      x.restore(); ring(true)
    }, 1)
  }
  SP.gas = function () {
    return R.sprite('sp-gas', 200, 200, function (x) {
      x.save(); circ(x, 100, 100, 90); x.clip()
      var g = x.createLinearGradient(0, 10, 0, 190); g.addColorStop(0, '#9FD8FF'); g.addColorStop(1, '#4E7FC4'); x.fillStyle = g; x.fillRect(0, 0, 200, 200)
      var i; for (i = 0; i < 7; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.22)' : 'rgba(30,60,130,.2)'; x.fillRect(0, 18 + i * 24, 200, 11) }
      x.fillStyle = 'rgba(255,255,255,.55)'; x.beginPath(); x.ellipse(120, 120, 14, 8, 0, 0, 6.3); x.fill()
      var s = x.createRadialGradient(70, 70, 30, 120, 120, 100); s.addColorStop(0, 'rgba(0,0,30,0)'); s.addColorStop(1, 'rgba(0,0,40,.55)'); x.fillStyle = s; x.fillRect(0, 0, 200, 200)
      x.restore()
    }, 1)
  }
  SP.galaxy = function (th) {
    return R.sprite('sp-galaxy', 520, 520, function (x) {
      var g = x.createRadialGradient(260, 260, 0, 260, 260, 130); g.addColorStop(0, 'rgba(255,240,250,.95)'); g.addColorStop(0.3, 'rgba(255,170,220,.5)'); g.addColorStop(1, 'rgba(160,120,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 520, 520)
      var arm, i, C = [[255, 190, 230], [190, 170, 255], [150, 215, 255]]
      for (arm = 0; arm < 3; arm++) for (i = 0; i < 520; i++) {
        var t = i / 520, a = arm * 2.094 + t * 6.2, r = 20 + t * 225
        var px = 260 + Math.cos(a) * r + (hash(arm * 700 + i) - 0.5) * (14 + t * 46), py = 260 + Math.sin(a) * r * 0.82 + (hash(arm * 700 + i + 300) - 0.5) * (14 + t * 40)
        var c = R.mix(C[arm], [255, 255, 255], 1 - t)
        x.fillStyle = R.css(c, (1 - t) * 0.8 + 0.12); x.beginPath(); x.arc(px, py, 0.8 + hash(i + arm) * 1.8, 0, 6.3); x.fill()
      }
    }, 1)
  }
  SP.nebA = function () { return nebS('A', [[255, 120, 190], [110, 220, 210], [255, 210, 120]], 3) }
  SP.nebB = function () { return nebS('B', [[150, 120, 255], [255, 140, 170], [110, 200, 255]], 8) }
  SP.nebC = function () { return nebS('C', [[110, 200, 255], [190, 170, 255], [255, 255, 255]], 13) }
  function nebS (id, cols, seed) {
    return R.sprite('sp-neb' + id, 600, 600, function (x) {
      var i
      for (i = 0; i < 14; i++) {
        var r = 70 + hash(seed + i + 40) * 110, cx = r + hash(seed + i) * (600 - 2 * r), cy = r + hash(seed + i + 20) * (600 - 2 * r), c = cols[i % cols.length]
        var g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, R.css(c, 0.42)); g.addColorStop(0.5, R.css(c, 0.16)); g.addColorStop(1, R.css(c, 0)); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2)
      }
      x.lineCap = 'round'
      for (i = 0; i < 18; i++) { x.strokeStyle = R.css(cols[i % cols.length], 0.22); x.lineWidth = 1.5; var a = hash(seed + i + 60) * 6.3, cx2 = 300 + Math.cos(a) * 120, cy2 = 300 + Math.sin(a) * 120; x.beginPath(); x.moveTo(cx2, cy2); x.bezierCurveTo(cx2 + 60, cy2 - 40, cx2 + 90, cy2 + 40, cx2 + 150, cy2 + hash(i) * 40 - 20); x.stroke() }
    }, 1)
  }
  SP.sun = function () {
    return R.sprite('sp-sun', 520, 520, function (x) {
      var g = x.createRadialGradient(260, 260, 60, 260, 260, 260); g.addColorStop(0, 'rgba(255,200,120,.65)'); g.addColorStop(0.5, 'rgba(255,120,60,.22)'); g.addColorStop(1, 'rgba(255,90,40,0)'); x.fillStyle = g; x.fillRect(0, 0, 520, 520)
      var d = x.createRadialGradient(240, 240, 8, 260, 260, 110); d.addColorStop(0, '#FFFFFF'); d.addColorStop(0.35, '#FFE680'); d.addColorStop(0.8, '#FFA640'); d.addColorStop(1, '#F27A2E'); x.fillStyle = d; circ(x, 260, 260, 105); x.fill()
      x.fillStyle = 'rgba(255,255,255,.25)'; var i; for (i = 0; i < 7; i++) { circ(x, 260 + (hash(i) - 0.5) * 120, 260 + (hash(i + 9) - 0.5) * 120, 8 + hash(i + 3) * 14); x.fill() }
    }, 1)
  }
  SP.rays = function () {
    return R.sprite('sp-rays', 520, 520, function (x) {
      var i, n = 26
      for (i = 0; i < n; i++) {
        var a = i / n * 6.283, len = 90 + hash(i + 4) * 70, wd = 0.07 + hash(i + 8) * 0.05
        var g = x.createRadialGradient(260, 260, 100, 260, 260, 100 + len); g.addColorStop(0, 'rgba(255,200,120,.55)'); g.addColorStop(1, 'rgba(255,150,80,0)')
        x.fillStyle = g; x.beginPath(); x.moveTo(260 + Math.cos(a - wd) * 100, 260 + Math.sin(a - wd) * 100); x.lineTo(260 + Math.cos(a) * (100 + len), 260 + Math.sin(a) * (100 + len)); x.lineTo(260 + Math.cos(a + wd) * 100, 260 + Math.sin(a + wd) * 100); x.closePath(); x.fill()
      }
    }, 1)
  }
  var rockS = function (v) {
    return R.sprite('sp-rock' + v, 64, 64, function (x) {
      var i, n = 9
      x.beginPath()
      for (i = 0; i < n; i++) { var a = i / n * 6.283, r = 22 + hash(v * 13 + i) * 9; if (!i) x.moveTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); else x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r) }
      x.closePath()
      var g = x.createRadialGradient(24, 22, 2, 32, 32, 30); g.addColorStop(0, '#9AA6C8'); g.addColorStop(1, '#4C5578'); x.fillStyle = g; x.fill()
      x.fillStyle = 'rgba(30,36,64,.35)'; circ(x, 26, 36, 5); x.fill(); circ(x, 40, 26, 4); x.fill()
    })
  }
  var stationS = R.sprite('sp-station', 260, 150, function (x) {
    var i
    x.fillStyle = '#B9C3D6'; x.fillRect(20, 70, 220, 10)
    var panel = function (px, py) {
      x.fillStyle = '#2B5FB8'; x.fillRect(px, py, 56, 54); x.strokeStyle = 'rgba(180,215,255,.7)'; x.lineWidth = 1
      for (i = 1; i < 4; i++) { x.beginPath(); x.moveTo(px + i * 14, py); x.lineTo(px + i * 14, py + 54); x.stroke() }
      x.beginPath(); x.moveTo(px, py + 27); x.lineTo(px + 56, py + 27); x.stroke()
      x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(px, py, 56, 8)
    }
    panel(4, 6); panel(4, 90); panel(200, 6); panel(200, 90)
    x.fillStyle = '#E8ECF4'; x.beginPath(); x.roundRect ? x.roundRect(94, 54, 72, 42, 10) : x.rect(94, 54, 72, 42); x.fill()
    x.fillStyle = '#FF9A3C'; x.fillRect(94, 70, 72, 8)
    x.fillStyle = '#C9D2E4'; x.beginPath(); x.roundRect ? x.roundRect(60, 62, 34, 26, 6) : x.rect(60, 62, 34, 26); x.fill(); x.beginPath(); x.roundRect ? x.roundRect(166, 62, 34, 26, 6) : x.rect(166, 62, 34, 26); x.fill()
    x.fillStyle = '#FFE680'; for (i = 0; i < 4; i++) x.fillRect(102 + i * 15, 58, 8, 5)
    x.fillStyle = '#9CD8FF'; circ(x, 130, 75, 7); x.fill()
  })
  var satS = R.sprite('sp-sat', 70, 40, function (x) {
    x.fillStyle = '#2B5FB8'; x.fillRect(2, 10, 24, 20); x.fillRect(44, 10, 24, 20)
    x.strokeStyle = 'rgba(180,215,255,.7)'; x.beginPath(); x.moveTo(14, 10); x.lineTo(14, 30); x.moveTo(56, 10); x.lineTo(56, 30); x.stroke()
    x.fillStyle = '#E8D88A'; x.fillRect(26, 12, 18, 16); x.fillStyle = '#B9C3D6'; x.fillRect(32, 4, 6, 8); circ(x, 35, 4, 4); x.fill()
  })
  var planetShadowS = R.sprite('sp-pshadow', 200, 200, function (x) {
    var g = x.createRadialGradient(80, 80, 10, 100, 100, 90); g.addColorStop(0, '#5A3A4A'); g.addColorStop(1, '#1B1020'); x.fillStyle = g; circ(x, 100, 100, 88); x.fill()
    x.strokeStyle = 'rgba(255,170,100,.55)'; x.lineWidth = 3; x.beginPath(); x.arc(100, 100, 89, 3.6, 5.4); x.stroke()
  }, 1)
  var starS = function (col) {
    return R.sprite('sp-star4' + col, 24, 24, function (x) {
      var g = x.createRadialGradient(12, 12, 0, 12, 12, 7); g.addColorStop(0, 'rgba(' + col + ',1)'); g.addColorStop(1, 'rgba(' + col + ',0)'); x.fillStyle = g; x.fillRect(0, 0, 24, 24)
      x.fillStyle = 'rgba(' + col + ',.95)'; x.beginPath(); x.moveTo(12, 0); x.lineTo(13.6, 10.4); x.lineTo(24, 12); x.lineTo(13.6, 13.6); x.lineTo(12, 24); x.lineTo(10.4, 13.6); x.lineTo(0, 12); x.lineTo(10.4, 10.4); x.closePath(); x.fill()
    }, 1)
  }

  // the engine's planets, redrawn: gas giants with banded atmospheres, cratered rock worlds, swirled ocean worlds; lit from the upper
  // left with a terminator, a bright rim, and rings that pass behind and in front (the old ones were flat discs)
  var PLANET = {}
  function planetS (kind, col, ring) {
    var key = 'sp-planet' + kind + col + (ring ? 'r' : '')
    return PLANET[key] || (PLANET[key] = R.sprite(key, 300, 220, function (x) {
      var base = R.rgb(col), dark = R.mix(base, [60, 40, 130], 0.3), lite = R.mix(base, [255, 255, 255], 0.5), i
      var R0 = 80, cx = 150, cy = 110
      var rg = function (front) {
        if (!ring) return
        x.lineWidth = 7
        for (i = 0; i < 3; i++) { x.strokeStyle = R.css(R.mix(lite, base, i * 0.3), 0.75 - i * 0.12); x.beginPath(); x.ellipse(cx, cy, R0 * (1.9 - i * 0.14), R0 * (0.5 - i * 0.04), -0.35, front ? 0 : Math.PI, front ? Math.PI : 6.283); x.stroke() }
      }
      rg(false)
      x.save(); circ(x, cx, cy, R0); x.clip()
      var g = x.createRadialGradient(cx - 30, cy - 34, 4, cx, cy, R0); g.addColorStop(0, R.css(lite)); g.addColorStop(0.5, R.css(base)); g.addColorStop(1, R.css(dark)); x.fillStyle = g; x.fillRect(0, 0, 300, 220)
      if (kind === 0) { for (i = 0; i < 7; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.2)' : R.css(dark, 0.25); x.fillRect(60, 40 + i * 17 + Math.sin(i * 2) * 3, 180, 8) } }
      else if (kind === 1) { for (i = 0; i < 11; i++) { var qx = 90 + hash(i + 3) * 120, qy = 50 + hash(i + 13) * 120, qr = 4 + hash(i + 23) * 11; x.fillStyle = R.css(dark, 0.4); circ(x, qx, qy, qr); x.fill(); x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.arc(qx - 1, qy - 1, qr * 0.8, 0.7, 3.8); x.fill() } }
      else { x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 5; x.lineCap = 'round'; for (i = 0; i < 4; i++) { x.beginPath(); x.moveTo(75, 70 + i * 24); x.bezierCurveTo(110, 55 + i * 24, 150, 90 + i * 24, 225, 68 + i * 24); x.stroke() } }
      var t = x.createRadialGradient(cx - 40, cy - 40, 50, cx + 30, cy + 30, 120); t.addColorStop(0, 'rgba(10,0,40,0)'); t.addColorStop(1, 'rgba(20,10,70,.4)'); x.fillStyle = t; x.fillRect(0, 0, 300, 220)
      x.restore()
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, R0 - 1, 3.3, 4.9); x.stroke()
      rg(true)
    }, 1))
  }
  function planet (c, p, xx, yy, rad, i) {
    var kind = (p.ph * 3 | 0) % 3, sp = planetS(kind, p.col, p.ring), s = rad / 80
    c.drawImage(sp, xx - 150 * s, yy - 110 * s, 300 * s, 220 * s)
  }

  T.rich.space = function (run, th) {
    var key = (th.world && WORLDS[th.world]) ? th.world : 'moon'
    var C = WORLDS[key]
    var S = { bands: {}, key: key, shoot: { next: 2.5, t: -9, x: 0, y: 0, a: 0 }, ice: [] }
    var layers = ['gradient', 'nebula', 'stars-far', 'stars-mid', 'stars-near', 'planets', 'asteroids', 'trail', 'rocket', 'pad-orbit']
    layers.splice(2, 0, 'hero-bodies')
    if (C.orbit) layers.push('orbiting-moons')
    if (C.belt) layers.push('belt-far', 'belt-mid', 'belt-edge')
    if (C.comet) layers.push('comets')
    if (C.station) layers.push('space-station', 'signal-pulses')
    if (C.sat) layers.push('satellites')
    if (C.twinkle) layers.push('twinkles')
    if (C.shoot) layers.push('shooting-stars')
    if (C.dust || C.motes || C.ice || C.wind) layers.push('dust')
    if (C.flare) layers.push('corona-flares')
    layers.push('speed-motes')

    function hero (c, Z, G, px, h, t, lite) {
      var W = run.W, H = run.H, k = G.pyu
      var sp = SP[h[0]](), size = h[4] * W, x = h[1] * W + R.par(px, 12 * h[3] * 10), y = h[2] * H + Z * k * h[3] + (h[0] === 'galaxy' || h[0] === 'sun' ? 0 : Math.sin(t * 0.1) * 2)
      // the hero keeps drifting after the first pass: a second copy a long span later
      var span = H * 3.2
      y = wrap(y + H * 0.8, span) - H * 0.8
      if (y < -size * 0.7 || y > H + size * 0.7) return
      var rot = h[5] + (C.spin && h[0] === 'galaxy' ? t * 0.03 : 0)
      if (h[0] === 'sun') {
        var cr = size * 1.2
        c.globalAlpha = 0.9; R.put(c, SP.rays(), x, y, cr, cr, t * 0.05); R.put(c, SP.rays(), x, y, cr * 0.8, cr * 0.8, -t * 0.07 + 0.3, 0.7); c.globalAlpha = 1
      }
      var dim = sp.lh / sp.lw
      R.put(c, sp, x, y, size, size * dim, rot, h[6])
      if (h[0] === 'ringed' && C.orbit && !lite) {   // moons circling the giant
        var i
        for (i = 0; i < 2; i++) {
          var a = t * (0.35 + i * 0.2) + i * 2.5, mx = x + Math.cos(a) * size * (0.55 + i * 0.12), my = y + Math.sin(a) * size * 0.14
          var far = Math.sin(a) < 0
          if (far) continue
          c.fillStyle = i ? '#D9E4FF' : '#FFC9D6'; c.beginPath(); c.arc(mx, my, size * (0.03 + i * 0.012), 0, 6.3); c.fill()
        }
      }
    }
    function under (c, Z, G, px) {
      var t = run.t, lite = R.lite(run), i
      for (i = 0; i < C.heroes.length; i++) hero(c, Z, G, px, C.heroes[i], t, lite)
    }
    function drawTail (c, x, y, ang, len, col, wd) {
      c.save(); c.translate(x, y); c.rotate(ang)
      var g = c.createLinearGradient(0, 0, len, 0); g.addColorStop(0, 'rgba(' + col + ',.85)'); g.addColorStop(0.4, 'rgba(' + col + ',.3)'); g.addColorStop(1, 'rgba(' + col + ',0)')
      c.fillStyle = g; c.beginPath(); c.moveTo(0, -wd); c.quadraticCurveTo(len * 0.5, -wd * 1.5, len, -wd * 0.2); c.lineTo(len, wd * 0.2); c.quadraticCurveTo(len * 0.5, wd * 1.8, 0, wd); c.closePath(); c.fill()
      c.restore()
    }
    function over (c, Z, G, px) {
      var W = run.W, H = run.H, t = run.t, k = G.pyu, lite = R.lite(run), par = R.par(px, 26), i, j
      if (C.belt) {
        // three depths: far dots, mid rocks, and a few big out-of-focus rocks at the edges
        var L = [[26, 0.3, 12, 0.34, 0.5], [14, 0.6, 24, 0.4, 0.85], [6, 1.4, 62, 0.28, 0]]
        for (j = 0; j < 3; j++) {
          var cfg = L[j], n = lite ? Math.ceil(cfg[0] / 2) : cfg[0], span = H + 160
          for (i = 0; i < n; i++) {
            var rx = hash(i * 3 + j * 50 + 1)
            if (j === 2) rx = i % 2 ? 0.02 + rx * 0.08 : 0.9 + rx * 0.08
            var ry = wrap(hash(i * 3 + j * 50 + 2) * span + Z * k * cfg[1] + t * 4 * cfg[1], span) - 80, s = cfg[2] * (0.7 + hash(i + j * 9) * 0.7)
            c.globalAlpha = cfg[3]
            c.save(); c.translate(rx * W + par * cfg[1] * 0.6, ry); c.rotate(t * (0.2 + hash(i) * 0.4) * (i % 2 ? 1 : -1) + i)
            c.drawImage(rockS((i + j) % 4), -s / 2, -s / 2, s, s); c.restore()
          }
        }
        c.globalAlpha = 1
      }
      if (C.comet) {
        for (i = 0; i < C.comet; i++) {
          var P = 11 + i * 3, u = wrap(t + i * 4.2, P) / P, ex = (1.15 - u * 1.5) * W + par * 0.3, ey = (-0.1 + u * 0.4 + hash(i + 3) * 0.3) * H
          drawTail(c, ex, ey, Math.PI - 0.38 + i * 0.1, 260 + i * 60, i % 2 ? '255,230,200' : '170,225,255', 10 + i * 3)
          drawTail(c, ex, ey, Math.PI - 0.5 + i * 0.1, 160, '255,255,255', 5)
          R.put(c, R.glow('220,240,255', 26), ex, ey, 52 + i * 8, 52 + i * 8)
          c.fillStyle = '#FFFFFF'; c.beginPath(); c.arc(ex, ey, 5 + i, 0, 6.3); c.fill()
        }
      }
      if (C.station) {
        var sy = wrap(Z * k * 0.22 + H * 1.0, H * 2.4) - H * 0.7, sx = W * 0.5 + Math.sin(t * 0.12) * W * 0.12 + par * 0.4
        R.put(c, stationS, sx, sy, 190, 110, 0.5 + Math.sin(t * 0.1) * 0.12)
        if (C.pulse) {
          var pu = wrap(t * 0.5, 1)
          c.strokeStyle = 'rgba(160,230,255,' + (0.5 * (1 - pu)) + ')'; c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, 30 + pu * 110, 0, 6.3); c.stroke()
          var pu2 = wrap(t * 0.5 + 0.5, 1); c.strokeStyle = 'rgba(160,230,255,' + (0.4 * (1 - pu2)) + ')'; c.beginPath(); c.arc(sx, sy, 30 + pu2 * 110, 0, 6.3); c.stroke()
        }
        if (Math.floor(t * 2) % 2) { c.fillStyle = '#FF6B6B'; c.beginPath(); c.arc(sx - 70, sy - 40, 3, 0, 6.3); c.fill() }
      }
      for (i = 0; i < (C.sat || 0); i++) {
        var tx = wrap(hash(i + 70) * (W + 160) + t * (7 + i * 3) * (i % 2 ? -1 : 1), W + 160) - 80 + par * 0.5, ty = wrap(hash(i + 71) * (H + 300) + Z * k * (0.35 + i * 0.1), H + 300) - 150
        R.put(c, satS, tx, ty, 38, 22, 0.6 + i, 0.9)
        if (Math.floor(t * 1.5 + i) % 2) { c.fillStyle = '#7DFFA0'; c.beginPath(); c.arc(tx, ty, 2, 0, 6.3); c.fill() }
      }
      if (C.twinkle) {
        var n4 = lite ? 6 : 14 * C.twinkle
        for (i = 0; i < n4; i++) {
          var tw = Math.sin(t * (1.4 + hash(i + 300) * 2) + i * 2)
          if (tw < 0.1) continue
          var sz = 10 + hash(i + 310) * 14
          c.globalAlpha = tw; R.put(c, starS(i % 3 === 0 ? '255,214,160' : i % 3 === 1 ? '190,220,255' : '255,255,255'), hash(i + 320) * W + par * 0.3, wrap(hash(i + 330) * H + Z * k * 0.15, H), sz * tw, sz * tw)
        }
        c.globalAlpha = 1
      }
      if (C.shoot && !lite) {
        var sh = S.shoot
        if (t > sh.next) { sh.t = t; sh.next = t + 3.5 + Math.random() * 4; sh.x = W * (0.3 + Math.random() * 0.7); sh.y = H * Math.random() * 0.4 }
        var age = t - sh.t
        if (age < 0.8) {
          var qx = sh.x - age * W * 0.7, qy = sh.y + age * H * 0.3, g = c.createLinearGradient(qx, qy, qx + 90, qy - 38)
          g.addColorStop(0, 'rgba(255,255,255,' + (1 - age / 0.8) + ')'); g.addColorStop(1, 'rgba(255,255,255,0)')
          c.strokeStyle = g; c.lineWidth = 2.6; c.lineCap = 'round'; c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx + 90, qy - 38); c.stroke()
        }
      }
      if (C.dust || C.motes || C.ice || C.wind) {
        var nd = lite ? 12 : 26, col = C.wind ? '255,190,110' : C.ice ? '200,235,255' : C.motes ? '255,200,240' : '220,225,255'
        var gl = R.glow(col, 8)
        for (i = 0; i < nd; i++) {
          var dx = wrap(hash(i + 400) * W + Math.sin(t * 0.5 + i) * 10 + (C.wind ? t * 18 : 0), W), dy = wrap(hash(i + 430) * H + Z * k * (0.5 + hash(i + 460) * 0.6) + t * 8, H)
          c.globalAlpha = 0.25 + 0.5 * Math.abs(Math.sin(t * 1.3 + i)); c.drawImage(gl, dx - 5, dy - 5, 10, 10)
        }
        c.globalAlpha = 1
      }
      if (C.flare && !lite) {   // prominence arcs breathing off the sun's limb
        var sx0 = W * 0.82 + par * 0.3, sy0 = wrap(H * 0.04 + Z * k * 0.05 + H * 0.8, H * 3.2) - H * 0.8, rr = W * 1.15 * 0.2
        for (i = 0; i < 3; i++) {
          var br = 0.5 + 0.5 * Math.sin(t * 0.8 + i * 2.1), a0 = 1.9 + i * 0.9
          c.strokeStyle = 'rgba(255,170,90,' + (0.2 + 0.35 * br) + ')'; c.lineWidth = 5 + br * 3; c.lineCap = 'round'
          c.beginPath(); c.arc(sx0 + Math.cos(a0) * rr * 1.05, sy0 + Math.sin(a0) * rr * 1.05, rr * (0.28 + 0.1 * br), a0 + 1.6, a0 + 4.7); c.stroke()
        }
      }
      if (C.shadowPlanet) {
        var py = wrap(Z * k * 0.2 + H * 0.5, H * 2.2) - H * 0.6
        R.put(c, planetShadowS, W * 0.2 + par * 0.4, py, W * 0.32, W * 0.32, 0, 0.95)
      }
      if (C.flare) { c.fillStyle = 'rgba(255,140,60,.08)'; c.fillRect(0, 0, W, H) }
    }
    function fg (c, Z, G, px) {
      if (run.reduced()) return
      var W = run.W, H = run.H, t = run.t, k = G.pyu, i, n = R.lite(run) ? 6 : 12
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1.5
      for (i = 0; i < n; i++) {
        var x = hash(i + 500) * W, y = wrap(hash(i + 530) * (H + 160) + Z * k * 2.4 + t * 60, H + 160) - 80, len = 14 + hash(i + 560) * 26
        c.globalAlpha = 0.2 + hash(i + 590) * 0.3
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + len); c.stroke()
      }
      c.globalAlpha = 1
    }
    return { layers: layers, under: under, over: over, fg: fg, planet: planet, key: key }
  }
})(window)
