/* G32 Blippi -- UDARA: side-scrolling seaplane. Starts on the water (wave rows, spray), accelerates, LIFTS OFF (the water line slides
 * down out of frame as the camera follows the plane up into the sky), flies free (drag up/down), then glides back down and lands on
 * the water at the end. Layers (6): sky gradient (+ stars at night), sun/moon, horizon silhouette + island sprites, far/mid/near clouds
 * at three speeds with vertical camera parallax, the water with wave rows, the foreground wisps. The seaplane floats are drawn here
 * until the owner ships 'veh-seaplane-sisi' (see ART-SLOTS.md); that art replaces the whole sprite automatically. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  var TO0 = 0.07
  var TO1 = 0.14
  var LD0 = 0.92
  var LD1 = 0.985

  function sstep (a, b, v) { var t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) }

  // rivals (owner 2026-10-14 "balapan kurang seru", CTR): three other Blippi aircraft, side view, never the child's own
  var RIVALS = ['biplane', 'light-plane', 'turboprop', 'floatplane']
  function rivalIds (lvl) { var own = (/race:([^/]+)\//.exec(lvl.veh) || [])[1]; return RIVALS.filter(function (v) { return v !== own }).slice(0, 3) }

  function assets (lvl) {
    var a = [lvl.veh, 'lib:nature/cloud', 'lib:mojo-chase/cmid/' + lvl.theme.far, 'lib:game/hot-air-balloon', 'lib:animals/eagle',
      'lib:animals/parrot', 'lib:game/star', 'lib:nature/sun', 'lib:nature/moon-stars', 'lib:nature/rainbow', 'lib:tk-world/palm-island', 'lib:tk-world/lighthouse-island', 'lib:tk-world/storm-cloud',
      'fx:spark', 'fx:dust', 'fx:speed', 'fx:gold-star', 'fx:confetti', 'fx:droplets', 'fx:ripple', 'fx:bubbles']
    rivalIds(lvl).forEach(function (v) { a.push('race:' + v + '/standard-side') })
    return a
  }

  function make (run) {
    var lvl = run.lvl
    var th = lvl.theme
    var r = run.rnd
    var ents = []
    var clouds = []
    var starsBg = []
    var G = { px: 0, ps: 0, wl0: 0, pxu: 0 }
    var Z = 0
    var lift = 0
    var py = 0
    var rot = 0
    var wobble = 0
    var spray = 0
    var announced = false
    var hold = -1 // the height (fraction of H) the plane keeps while no finger is down
    var collectibles = 0
    var gateZ = lvl.gates.map(function (f) { return f * run.len })
    function nearGate (z) { return gateZ.some(function (g) { return Math.abs(g - z) < 1.6 }) }
    var z = run.len * 0.2
    while (z < run.len * 0.9) {
      if (!nearGate(z)) {
        var roll = r()
        var yf = 0.2 + r() * 0.52
        if (roll < lvl.dens * 0.8) {
          var kind = ['balloon', 'eagle', 'parrot', 'storm'][(r() * 4) | 0]
          ents.push({ z: z, y: yf, type: kind, st: 0, t: 0, ph: r() * 6 })
          // a reward arc on the opposite side of the screen so avoiding is rewarded
          var ry = yf > 0.45 ? 0.26 : 0.66
          ents.push({ z: z + 0.5, y: ry, type: 'star', st: 0, t: 0, ph: 0 }); collectibles++
        } else if (roll < lvl.dens * 0.8 + 0.18) {
          ents.push({ z: z, y: yf, type: 'ring', st: 0, t: 0, ph: 0 }); collectibles += 2
        } else {
          var n
          for (n = 0; n < 4; n++) { ents.push({ z: z + n * 0.45, y: yf + Math.sin(n * 0.9) * 0.07, type: 'star', st: 0, t: 0, ph: n }); collectibles++ }
        }
      }
      z += 2.3 - lvl.dens * 0.9 + r() * 0.8
    }
    ents.sort(function (a, b) { return a.z - b.z })
    // CTR turbo meter zones = tail-wind streams: no obstacles inside (the child watches the meter), a star line through it
    var winds = run.zones(gateZ, run.len * 0.2)
    function windAt (zz) { return run.zoneAt(winds, zz) }
    ents = ents.filter(function (e) { return e.type === 'star' || e.type === 'ring' || windAt(e.z) < 0 })
    winds.forEach(function (wd) {
      var q
      for (q = wd.z0 + 0.6; q < wd.z1 - 0.3; q += 0.7) { ents.push({ z: q, y: 0.45 + Math.sin(q * 1.3) * 0.12, type: 'star', st: 0, t: 0, ph: q }); collectibles++ }
    })
    // gift boxes mid-sky, clear of the wind streams and gates, with the sky around them kept free of obstacles
    run.giftSpots(function (zz) { return windAt(zz) >= 0 || windAt(zz + 1) >= 0 || nearGate(zz) || zz < run.len * 0.2 }).forEach(function (zz) {
      ents = ents.filter(function (e) { return e.type === 'star' || e.type === 'ring' || Math.abs(e.z - zz) > 1.2 })
      ents.push({ z: zz, y: 0.45, type: 'gift', st: 0, t: 0, ph: 0 })
    })
    ents.sort(function (a, b) { return a.z - b.z })
    var drift = run.meter()
    var told = false
    // rivals start ahead (the child starts last and flies up the field); CTR-style rubber band keeps them near
    var rivals = rivalIds(lvl).map(function (v, i) { return { id: v, key: 'race:' + v + '/standard-side', z: 1.2 + i * 1.3, y: [0.3, 0.62, 0.46][i], ty: [0.3, 0.62, 0.46][i], f: [0.86, 0.9, 0.95][i] * (0.96 + r() * 0.08), cool: 0, ph: r() * 6 } })
    run.pos = run.racers = rivals.length + 1
    var nudgeT = 0
    var ci
    // a calm sky: few clouds, so the stars, rings, birds and storm clouds the child steers around read at a glance
    for (ci = 0; ci < 9; ci++) clouds.push({ x: r(), y: r() * 0.7, s: 0.4 + r() * 0.8, layer: ci % 3 })
    for (ci = 0; ci < 70; ci++) starsBg.push({ x: r(), y: r() * 0.85, s: 1 + r() * 2, ph: r() * 6 })
    run.starTotal = Math.round(collectibles * 0.5)

    function geo () {
      var W = run.W
      var H = run.H
      G.ps = Math.min(W * 0.26, H * 0.3)
      G.px = W * (W < H ? 0.3 : 0.26)
      G.wl0 = H * 0.8
      G.pxu = Math.max(W * 0.2, 150)
    }
    geo()
    py = G.wl0 - G.ps * 0.3

    function liftAt (p) { return sstep(TO0, TO1, p) * (1 - sstep(LD0, LD1, p)) }
    function wl () { return G.wl0 + (run.H * 0.62) * lift }

    function update (dt) {
      Z = run.progress * run.len
      lift = liftAt(run.progress)
      var H = run.H
      var steer = Math.max(H * 0.17, Math.min(H * 0.74, run.in.y * H))
      // hold position when the finger lifts; a plane never flown (still at the water line, which falls away below the screen
      // on take-off) climbs to a cruise height instead of sinking out of sight with the water
      if (run.in.down || run.in.ky) hold = -1
      else if (lift < 0.9) steer = H * 0.42 // an untouched take-off climbs to the cruise height
      else {
        if (hold < 0) hold = py < H * 0.17 || py > H * 0.74 ? 0.42 : py / H
        steer = hold * H
      }
      var water = wl() - G.ps * 0.3
      var target = water + (steer - water) * lift
      var prev = py
      py += (target - py) * Math.min(1, dt * 11)
      rot += ((py - prev) * 0.012 * (lift > 0.3 ? 1 : 0) - rot) * Math.min(1, dt * 6)
      rot = Math.max(-0.35, Math.min(0.35, rot))
      wobble = Math.max(0, wobble - dt)
      spray = lift < 0.9 ? 1 : 0
      if (!announced && lift > 0.5) { announced = true; run.say('Lepas landas! Kita terbang tinggi!'); run.fx('droplets', G.px - 40, wl() - 10, 190); run.fx('ripple', G.px - 60, wl(), 220) }
      if (run.progress > LD0 + 0.02 && lift < 0.3 && announced === true) { announced = 'land'; run.say('Mendarat di air. Cipratannya seru!'); run.fx('ripple', G.px, wl() - 6, 260) }
      stepWind(dt)
      stepRivals(dt)
      var i
      for (i = 0; i < ents.length; i++) {
        var e = ents[i]
        var d = e.z - Z
        if (e.st === 1) { e.t += dt; continue }
        if (e.st === 2) continue
        if (d > 0.6) break
        if (d < -1.4) { e.st = 2; continue }
        var ex = G.px + d * G.pxu
        var ey = e.y * H + (e.type === 'balloon' || e.type === 'storm' ? Math.sin(run.t * 1.5 + e.ph) * 8 : 0)
        var dx = ex - G.px
        var dy = ey - py
        // the star magnet pulls stars from the whole sky column ahead
        var rs = run.magnetT > 0 ? H * 0.42 : G.ps * 0.45
        if (e.type === 'gift' && Math.abs(dx) < G.ps * 0.45 && Math.abs(dy) < G.ps * 0.45) { e.st = 2; run.gift(ex, ey) } else if (e.type === 'star' && Math.abs(dx) < G.ps * 0.45 && Math.abs(dy) < rs) { e.st = 2; run.collect(ex, ey, false) } else if (e.type === 'ring' && Math.abs(dx) < G.ps * 0.3 && Math.abs(dy) < H * 0.085) { e.st = 2; run.collect(ex, ey, true); run.fx('check-burst', ex, ey, 160); run.turbo(0.7, 0, ex, ey) /* a ring is CTR's turbo pad */ } else if (e.type !== 'star' && e.type !== 'ring' && e.type !== 'gift' && Math.abs(dx) < G.ps * 0.38 && Math.abs(dy) < G.ps * 0.3 && run.hitT <= 0) { e.st = 1; e.t = 0; wobble = 0.8; run.bump(G.px + G.ps * 0.4, py) }
      }
    }

    function stepWind (dt) {
      var wi = windAt(Z)
      if (!told && winds.length && winds[0].z0 - Z < 4 && winds[0].z0 > Z) { told = true; run.say('Angin kencang! Tekan TURBO saat lingkarannya merah!') }
      drift.step(dt, wi, 1)
    }
    function turbo () { drift.press(G.px - G.ps * 0.5, py) }
    // rivals fly their own pace with the rubber band; each climbs or dives out of an obstacle ahead and, near the child, out
    // of the child's height; touching one is a soft nudge, never a crash
    function stepRivals (dt) {
      nudgeT = Math.max(0, nudgeT - dt)
      var H = run.H
      var i
      for (i = 0; i < rivals.length; i++) {
        var rv = rivals[i]
        var gap = rv.z - Z
        rv.z += lvl.speed * rv.f * run.band(gap) * dt
        rv.cool = Math.max(0, rv.cool - dt)
        if (rv.cool <= 0) {
          var near = function (yy) { return ents.some(function (e) { return e.st === 0 && e.type !== 'star' && e.type !== 'ring' && e.z > rv.z && e.z - rv.z < 1.6 && Math.abs(e.y - yy) < 0.14 }) }
          var crowd = gap > 0 && gap < 1.2 && Math.abs(py / H - rv.ty) < 0.12
          if (near(rv.ty) || crowd) {
            var opts = [0.24, 0.38, 0.52, 0.66].filter(function (yy) { return Math.abs(yy - rv.ty) > 0.1 && !near(yy) && Math.abs(py / H - yy) > 0.12 })
            if (opts.length) { rv.ty = opts[(Math.random() * opts.length) | 0]; rv.cool = 1.2 }
          }
        }
        rv.y += (rv.ty - rv.y) * Math.min(1, dt * 2.5)
        if (lift > 0.6 && nudgeT <= 0 && Math.abs(gap) < 0.35 && Math.abs(rvY(rv) - py) < G.ps * 0.35) { nudgeT = 1; run.mul *= 0.85; rv.z += 0.3; run.fx('cloud', G.px, py, 110) }
      }
      run.place(rivals, Z)
    }
    // a rival on the water before take-off, in the air after (the same lift curve as the child, at its own progress)
    function rvY (rv) {
      var l = liftAt(rv.z / run.len)
      var water = G.wl0 + (run.H * 0.62) * lift - G.ps * 0.3
      return water + (rv.y * run.H + Math.sin(run.t * 1.3 + rv.ph) * 6 - water) * l
    }
    // tail-wind streams: a soft band of moving chevrons across the sky between the zone ends
    function drawWinds (c) {
      var H = run.H
      var i
      for (i = 0; i < winds.length; i++) {
        var x0 = G.px + (winds[i].z0 - Z) * G.pxu
        var x1 = G.px + (winds[i].z1 - Z) * G.pxu
        if (x1 < -40 || x0 > run.W + 40) continue
        var top = H * 0.16
        var bot = Math.min(wl(), H) - 10
        var g = c.createLinearGradient(x0, 0, x1, 0)
        g.addColorStop(0, 'rgba(160,240,200,0)'); g.addColorStop(0.15, 'rgba(160,240,200,.22)'); g.addColorStop(0.85, 'rgba(160,240,200,.22)'); g.addColorStop(1, 'rgba(160,240,200,0)')
        c.fillStyle = g
        c.fillRect(x0, top, x1 - x0, bot - top)
        c.strokeStyle = 'rgba(255,255,255,.8)'
        c.lineWidth = 5
        c.lineCap = 'round'
        var sp = 90
        var off = run.reduced() ? 0 : (run.t * 160) % sp
        var x
        var row
        for (row = 0; row < 4; row++) {
          var yy = top + (bot - top) * (0.15 + row * 0.24)
          for (x = x0 + off + (row % 2) * sp / 2; x < x1 - 10; x += sp) {
            c.beginPath(); c.moveTo(x - 14, yy - 14); c.lineTo(x, yy); c.lineTo(x - 14, yy + 14); c.stroke()
          }
        }
      }
    }
    function drawRivals (c) {
      var i
      for (i = 0; i < rivals.length; i++) {
        var rv = rivals[i]
        var x = G.px + (rv.z - Z) * G.pxu
        if (x < -G.ps || x > run.W + G.ps) continue
        var y = rvY(rv)
        c.save(); c.translate(x, y); c.rotate(Math.sin(run.t * 1.3 + rv.ph) * 0.04)
        run.spr(c, rv.key, 0, 0, G.ps * 1.15, G.ps * 0.85, { flip: true })
        c.restore()
      }
    }
    // CTR exhaust: a flame behind the tail while turbo reserves last, bigger and hotter per fire level
    function exhaust (c) {
      if (run.reserves <= 0 || run.reduced()) return
      var f = run.FIRE[run.fire]
      var fl = (0.7 + run.fire * 0.25) * (0.85 + Math.sin(run.t * 47) * 0.15) * Math.min(1, run.reserves * 2)
      var x = G.px - G.ps * 0.55
      var g = c.createLinearGradient(x, 0, x - G.ps * 0.6 * fl, 0)
      g.addColorStop(0, f[0]); g.addColorStop(0.45, f[1]); g.addColorStop(1, 'rgba(255,120,40,0)')
      c.fillStyle = g
      c.beginPath(); c.moveTo(x, py - G.ps * 0.09); c.quadraticCurveTo(x - G.ps * 0.7 * fl, py, x, py + G.ps * 0.09); c.closePath(); c.fill()
    }

    function portal (c, x, label, fin) {
      var H = run.H
      var top = H * 0.1
      var bot = Math.min(wl(), H) - 4
      if (bot < top + 40) bot = H * 0.9
      var g = c.createLinearGradient(0, top, 0, bot)
      g.addColorStop(0, fin ? 'rgba(255,255,255,.55)' : 'rgba(227,215,247,.6)')
      g.addColorStop(1, fin ? 'rgba(255,200,46,.25)' : 'rgba(205,239,224,.35)')
      c.fillStyle = g
      c.fillRect(x - 26, top, 52, bot - top)
      c.strokeStyle = fin ? '#FFC82E' : '#8F6FE0'
      c.lineWidth = 5
      c.setLineDash([12, 10])
      c.beginPath(); c.moveTo(x, top); c.lineTo(x, bot); c.stroke()
      c.setLineDash([])
      var bw = 150
      var bh = 46
      var by = H * 0.12
      var gg = c.createLinearGradient(0, by, 0, by + bh)
      gg.addColorStop(0, '#FFE29A'); gg.addColorStop(1, '#FFB347')
      c.fillStyle = fin ? '#FFFFFF' : gg
      run.rrect(c, x - bw / 2, by, bw, bh, 16)
      c.fill()
      if (fin) { var q; for (q = 0; q < 10; q++) { c.fillStyle = q % 2 ? '#2B3A7A' : '#FFFFFF'; c.fillRect(x - bw / 2 + q * bw / 10, by + (q % 2 ? 0 : bh / 2), bw / 10, bh / 2) } }
      c.fillStyle = '#13318A'
      c.font = '700 26px Fredoka,Nunito,sans-serif'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      if (!fin) c.fillText(label, x, by + bh / 2)
    }

    function drawSea (c, y0) {
      var W = run.W
      var H = run.H
      if (y0 >= H) return
      run.grad(c, y0, H, th.night ? '#3D5A9A' : '#7FD3E6', th.night ? '#26396F' : '#5EC2DA')
      c.lineWidth = 2.5
      var row
      for (row = 0; row < 7; row++) {
        var yy = y0 + 12 + row * (H - y0) / 7 * 1.05 + row * 4
        if (yy > H + 4) break
        var amp = 3 + row * 1.6
        var spd = (0.7 + row * 0.35)
        c.strokeStyle = 'rgba(255,255,255,' + (0.25 + row * 0.07) + ')'
        c.beginPath()
        var x
        for (x = -10; x <= W + 10; x += 22) {
          var yv = yy + Math.sin((x + Z * G.pxu * spd * 0.9) * 0.02 + row) * amp
          if (x === -10) c.moveTo(x, yv); else c.lineTo(x, yv)
        }
        c.stroke()
      }
    }

    function drawPlane (c) {
      var ps = G.ps
      var alpha = run.hitT > 0 && !run.reduced() ? (Math.floor(run.t * 12) % 2 ? 0.45 : 1) : 1
      var wob = wobble > 0 ? Math.sin(run.t * 30) * 0.12 * wobble : 0
      // wake spray while on the water
      if (spray && !run.reduced()) {
        c.fillStyle = 'rgba(255,255,255,.75)'
        var k
        for (k = 0; k < 8; k++) {
          var t = ((run.t * 2.2 + k / 8) % 1)
          c.beginPath()
          c.arc(G.px - ps * 0.35 - t * ps * 1.1, wl() - 2 - Math.sin(t * 3.1) * ps * 0.18 * (1 - lift), 5 * (1 - t) + 2, 0, 6.3)
          c.fill()
        }
      }
      c.save()
      c.translate(G.px, py)
      c.rotate(rot + wob)
      c.globalAlpha = alpha
      // owner floatplane (side view faces left; we fly right, so flipped). Floats are part of the art.
      run.spr(c, lvl.veh, 0, 0, ps * 1.35, ps * 1.0, { flip: true })
      c.restore()
      if (run.boostT > 0 && !run.reduced()) run.spr(c, 'fx:speed', G.px - ps * 0.8, py, ps, ps * 0.5, { alpha: 0.6, flip: true })
    }

    function draw (c, dt) {
      geo()
      var W = run.W
      var H = run.H
      var wlv = wl()
      var sk = th.sky
      // 1. sky: gradient sinks toward lilac higher up
      var g = c.createLinearGradient(0, 0, 0, H)
      g.addColorStop(0, sk[0])
      g.addColorStop(1, sk[1])
      c.fillStyle = g
      c.fillRect(0, 0, W, H)
      var camY = lift * H * 0.4
      if (th.night) {
        c.fillStyle = '#FFFFFF'
        var s
        for (s = 0; s < starsBg.length; s++) {
          var sb = starsBg[s]
          var tw = 0.4 + 0.6 * Math.abs(Math.sin(run.t * 1.4 + sb.ph))
          c.globalAlpha = tw
          c.fillRect(sb.x * W, sb.y * H + camY * 0.1, sb.s, sb.s)
        }
        c.globalAlpha = 1
      }
      // 2. sun / moon
      run.spr(c, th.night ? 'lib:nature/moon-stars' : 'lib:nature/sun', W * 0.78, H * 0.2 + camY * 0.25 - Z * 0.4 % 3, Math.min(W, H) * 0.2, Math.min(W, H) * 0.2, { alpha: th.night ? 0.95 : 0.9 })
      if (!th.night && T.img('fx:rays') && !run.reduced()) run.spr(c, 'fx:rays', W * 0.78, H * 0.2 + camY * 0.25, Math.min(W, H) * 0.7, Math.min(W, H) * 0.7, { alpha: 0.3, rot: run.t * 0.05 })
      // rainbow in the candy level
      if (lvl.id === 'udara-2') run.spr(c, 'lib:nature/rainbow', W * 0.55 - (Z * G.pxu * 0.02) % (W * 0.2), wlv - H * 0.14, W * 0.7, H * 0.4, { alpha: 0.85, anchor: 'bottom' })
      // 3. horizon silhouette + island sprites ride the water line
      var mk2 = 'lib:mojo-chase/cmid/' + th.far
      var mi = T.img(mk2)
      if (mi && wlv < H + 40) {
        var mw = Math.round(W * 1.4)
        var mh = Math.round(mw * mi.height / mi.width)
        var mc = T.scaled(mk2, mw, mh)
        var mx = ((Z * G.pxu * 0.05) % mw + mw) % mw
        c.globalAlpha = 0.9
        c.drawImage(mc, -mx, wlv - mh + 8)
        c.drawImage(mc, -mx + mw, wlv - mh + 8)
        c.globalAlpha = 1
        var il = ((Z * G.pxu * 0.12) % (W * 1.6))
        run.spr(c, 'lib:tk-world/palm-island', W * 1.1 - il, wlv - 6, G.ps * 0.7, G.ps * 0.7, { anchor: 'bottom' })
        run.spr(c, 'lib:tk-world/lighthouse-island', W * 2.0 - il * 1.0, wlv - 6, G.ps * 0.9, G.ps * 0.9, { anchor: 'bottom' })
      }
      // 4. clouds in three depth layers (vertical camera parallax)
      var i
      for (i = 0; i < clouds.length; i++) {
        var cl = clouds[i]
        var f = [0.08, 0.2, 0.42][cl.layer]
        var span = W + 260
        var cx = ((cl.x * span - Z * G.pxu * f - run.t * 4 * (cl.layer + 1)) % span + span) % span - 130
        var cy = cl.y * H * 0.75 + camY * (0.2 + cl.layer * 0.25) - H * 0.02
        var sz = (60 + cl.layer * 55) * cl.s
        run.spr(c, 'lib:nature/cloud', cx, cy, sz * 1.3, sz, { alpha: 0.32 + cl.layer * 0.14 })
      }
      // 5. water (the real one falls away on take-off; a distant strip of sea with islands stays below the clouds)
      drawSea(c, wlv)
      if (wlv > H * 0.93) {
        var fy = H * 0.93
        drawSea(c, fy)
        c.globalAlpha = 0.9
        run.spr(c, 'lib:tk-world/palm-island', ((W * 1.2 - (Z * G.pxu * 0.1) % (W * 1.5)) + W * 1.5) % (W * 1.5) - 60, fy + 6, G.ps * 0.5, G.ps * 0.5, { anchor: 'bottom' })
        run.spr(c, 'lib:tk-world/lighthouse-island', ((W * 0.5 - (Z * G.pxu * 0.07) % (W * 1.8)) + W * 1.8) % (W * 1.8) - 60, fy + 8, G.ps * 0.6, G.ps * 0.6, { anchor: 'bottom' })
        c.globalAlpha = 1
      }
      drawWinds(c)
      // entities and gates
      var gl = gateZ.concat([run.len])
      for (i = 0; i < ents.length; i++) {
        var e = ents[i]
        if (e.st === 2) continue
        var d = e.z - Z
        var ex = G.px + d * G.pxu
        if (ex < -120 || ex > W + 120) continue
        var ey = e.y * H + (e.type === 'balloon' || e.type === 'storm' || e.type === 'star' ? Math.sin(run.t * 1.6 + e.ph) * 8 : 0)
        var sz2 = G.ps * 0.62
        if (e.st === 1) { var k = Math.min(1, e.t / 0.8); ex += k * 80; ey -= k * 60; run.spr(c, eKey(e.type), ex, ey, sz2, sz2, { alpha: 1 - k, rot: k * 2 }); continue }
        if (e.type === 'gift') run.drawGift(c, ex, ey, G.ps * 0.5)
        else if (e.type === 'star') run.spr(c, 'lib:game/star', ex, ey, sz2 * 0.55, sz2 * 0.55, {})
        else if (e.type === 'ring') {
          c.strokeStyle = '#FFC82E'
          c.lineWidth = 8
          c.beginPath(); c.ellipse(ex, ey, G.ps * 0.14, H * 0.085, 0, 0, 6.3); c.stroke()
          c.strokeStyle = 'rgba(255,255,255,.85)'
          c.lineWidth = 3
          c.beginPath(); c.ellipse(ex, ey, G.ps * 0.14, H * 0.085, 0, 0, 6.3); c.stroke()
        } else run.spr(c, eKey(e.type), ex, ey, sz2, sz2, { flip: e.type === 'eagle' || e.type === 'parrot' })
      }
      for (i = 0; i < gl.length; i++) {
        var gx = G.px + (gl[i] - Z) * G.pxu
        if (gx > -80 && gx < W + 80) portal(c, gx, 'SOAL!', i === gl.length - 1)
      }
      drawRivals(c)
      exhaust(c)
      drawPlane(c)
      if (drift.on && !drift.spent) run.meterBar(c, drift, G.px, py - G.ps * 0.78, G.ps)
      // 7. birds (three flocks at different depths) and foreground clouds that pass IN FRONT of the plane
      c.lineCap = 'round'
      var bf
      for (bf = 0; bf < 9; bf++) {
        var dep = 0.4 + (bf % 3) * 0.3
        var bx = (((bf * 0.173 + 0.1) * (W + 200) - Z * G.pxu * 0.35 * dep - run.t * 14 * dep) % (W + 200) + (W + 200)) % (W + 200) - 100
        var by = H * (0.12 + (bf * 0.071) % 0.4) + Math.sin(run.t * 0.8 + bf) * 10 + camY * 0.3
        var fl = run.reduced() ? 0.3 : Math.sin(run.t * 7 + bf) * 0.5
        var bs = 9 * dep + 3
        c.strokeStyle = th.night ? 'rgba(255,255,255,.55)' : 'rgba(40,70,120,.55)'
        c.lineWidth = 2 * dep + 1
        c.beginPath(); c.moveTo(bx - bs, by - bs * (0.4 + fl)); c.quadraticCurveTo(bx - bs * 0.4, by + bs * 0.2, bx, by); c.quadraticCurveTo(bx + bs * 0.4, by + bs * 0.2, bx + bs, by - bs * (0.4 + fl)); c.stroke()
      }
      var fc
      // one wide foreground wisp, faint and far apart: three of them sat on the plane like a bubble
      for (fc = 0; fc < 1; fc++) {
        var fxp = (((fc * 0.43 + 0.1) * (W * 2 + 500) - Z * G.pxu * 0.9 - run.t * 20) % (W * 2 + 500) + (W * 2 + 500)) % (W * 2 + 500) - 250
        run.spr(c, 'lib:nature/cloud', fxp, H * 0.12 + camY * 0.9, 380, 230, { alpha: 0.22 })
      }
      // 8. foreground wisps
      c.globalAlpha = 0.35
      c.fillStyle = '#FFFFFF'
      var wsp
      for (wsp = 0; wsp < 4; wsp++) {
        var wxp = ((wsp * 0.33 - Z * G.pxu * 0.012 * (wsp + 3) / W) % 1 + 1) % 1 * (W + 300) - 150
        c.fillRect(wxp, H * (0.3 + wsp * 0.14) + camY * 0.5, 130 + wsp * 40, 3)
      }
      c.globalAlpha = 1
    }
    function eKey (t) { return t === 'balloon' ? 'lib:game/hot-air-balloon' : t === 'eagle' ? 'lib:animals/eagle' : t === 'parrot' ? 'lib:animals/parrot' : 'lib:tk-world/storm-cloud' }

    return { update: update, draw: draw, resize: geo, layers: ['sky', 'sun-rays', 'horizon', 'clouds-far', 'clouds-mid', 'clouds-near', 'sea', 'birds', 'clouds-front', 'plane'], get lane () { return null }, get lift () { return lift }, get py () { return py / run.H }, gifts: function () { return ents.filter(function (e) { return e.type === 'gift' }).length }, vpos: function () { return { x: G.px, y: py, s: G.ps * 0.95 } }, get pos () { return run.pos }, turbo: turbo, drift: function () { return drift }, rivals: rivals, corners: winds, cornerObs: function () { return ents.filter(function (e) { return e.type !== 'star' && e.type !== 'ring' && windAt(e.z) >= 0 }).length } }
  }
  T.engine('air', { assets: assets, make: make })
})(window)
