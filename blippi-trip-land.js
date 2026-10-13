/* G32 Blippi -- DARAT: 3-lane pseudo-3D road (rear view). Layers back to front: sky/far backdrop (opaque shared panorama, shifts
 * with the lane), drifting clouds, mid skyline strip, road bands in perspective (grass / road / kerb / lane dashes), roadside props,
 * items + soft obstacles, the vehicle, speed lines on boost. Entities live at a world coordinate z (level-seconds at speed 1);
 * ahead = z - progress*len, so the pace follows the core's speed multiplier (slow on a bump, fast on a boost) with no extra state.
 * Obstacles are soft (cone, crate, barrel, tyres): a bump slows and blinks, the obstacle tumbles away. Never all three lanes blocked. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  var D0 = 7
  var DMAX = 48
  // owner 2026-10-13 "superslow" + "object terlalu rapat": the world streams SPD world units per level-second (the run still
  // lasts the same), and items are drawn only up to EMAX ahead, so the road reads fast and the horizon is not a pile of things
  var SPD = 2.2
  var EMAX = 30
  var BAND = 1.8
  var OBST = ['cone', 'crate', 'barrel', 'tyres-2']
  var KEYS = { coin: 'lib:mojo-chase/items/coin', star: 'lib:mojo-chase/items/star', boost: 'lib:mojo-chase/items/boost-pad' }
  var BB = { cone: [70, 26, 270, 232], crate: [60, 20, 275, 230], barrel: [90, 20, 250, 232], 'tyres-2': [70, 30, 265, 230] }

  function assets (lvl) {
    var t = lvl.theme
    var a = ['lib:mojo-chase/cfar/' + t.far, 'lib:mojo-chase/cmid/' + t.mid, 'lib:nature/cloud', lvl.veh, KEYS.coin, KEYS.star, KEYS.boost]
    OBST.forEach(function (o) { a.push('lib:mojo-chase/items/' + o) })
    t.props.forEach(function (p) { a.push('lib:mojo-chase/props/' + p) })
    return a
  }

  function make (run) {
    var lvl = run.lvl
    var th = lvl.theme
    var r = run.rnd
    var ents = []
    var props = []
    var collectibles = 0
    var lane = 1
    var lanePos = 1
    var tilt = 0
    var Z = 0
    var gateT = lvl.gates.map(function (f) { return f * run.len })
    var G = { hy: 0, ny: 0, rw: 0, cx: 0 }

    function nearGate (z) { return gateT.some(function (g) { return Math.abs(g - z) < 1.6 }) || Math.abs(run.len - z) < 1.6 }
    // ----- level generation (deterministic from the run seed)
    var step = 4.4 - 1.6 * lvl.dens
    var z = 3.5
    while (z < run.len - 2) {
      if (!nearGate(z)) {
        var roll = r()
        if (roll < lvl.dens) {
          var kind = OBST[(r() * OBST.length) | 0]
          var l1 = (r() * 3) | 0
          ents.push({ z: z, lane: l1, type: kind, st: 0, t: 0 })
          if (r() < lvl.dens * 0.25) {
            var l2 = (l1 + 1 + ((r() * 2) | 0)) % 3
            ents.push({ z: z, lane: l2, type: OBST[(r() * OBST.length) | 0], st: 0, t: 0 })
          }
          // a reward line in a free lane right after, so avoiding feels good
          var free = [0, 1, 2].filter(function (q) { return !ents.some(function (e) { return e.z === z && e.lane === q }) })
          var fl = free[(r() * free.length) | 0]
          ents.push({ z: z + 0.7, lane: fl, type: 'star', st: 0, t: 0 }); collectibles++
        } else if (roll < lvl.dens + 0.1) {
          ents.push({ z: z, lane: (r() * 3) | 0, type: 'boost', st: 0, t: 0 })
        } else {
          var cl = (r() * 3) | 0
          var n = 3
          var q
          for (q = 0; q < n; q++) { ents.push({ z: z + q * 0.55, lane: cl, type: q === 1 ? 'star' : 'coin', st: 0, t: 0 }); collectibles++ }
        }
      }
      z += step * (0.8 + r() * 0.5)
    }
    ents.forEach(function (e) { e.z *= SPD })
    ents.sort(function (a, b) { return a.z - b.z })
    var gateZ = gateT.map(function (g) { return g * SPD })
    var endZ = run.len * SPD
    var pz = 1
    while (pz < endZ + 6) {
      var key = th.props[(r() * th.props.length) | 0]
      props.push({ z: pz, side: -1, k: 'lib:mojo-chase/props/' + key, off: 1.35 + r() * 0.9, sc: 0.8 + r() * 0.5 })
      props.push({ z: pz + r() * 0.8, side: 1, k: 'lib:mojo-chase/props/' + th.props[(r() * th.props.length) | 0], off: 1.35 + r() * 0.9, sc: 0.8 + r() * 0.5 })
      pz += 1.5 + r() * 1.1
    }
    props.sort(function (a, b) { return a.z - b.z })
    run.starTotal = Math.round(collectibles * 0.55)

    function geo () {
      G.hy = run.H * 0.4
      G.ny = run.H * 0.86
      G.rw = Math.min(run.W * 0.46, run.H * 0.6)
      G.cx = run.W / 2
    }
    geo()
    function P (d) { return 1 / (1 + d / D0) }
    // the road winds (owner 2026-10-13 "jauh lebih bagus, super smooth"): a slow sum of two sines of the world position bends
    // the far road sideways; the near road (p ~ 1) stays under the vehicle, so steering is unchanged and the curve only reads
    function bend (z) { return Math.sin(z * 0.05) * 0.7 + Math.sin(z * 0.13 + 1.3) * 0.3 }
    var b0 = 0
    var puffs = []
    var hz = null
    var hzKey = ''
    var puffT = 0
    function CX (p) { var f = Math.max(0, 1 - p); return G.cx + b0 * run.W * 0.75 * Math.pow(f, 1.6) }
    function Y (p) { return G.hy + (G.ny - G.hy) * p }
    var LS = function () { return G.rw * 0.62 }

    function update (dt) {
      Z = run.progress * endZ
      var m = run.in.moves
      while (m.length) {
        var mv = m.shift()
        lane = Math.max(0, Math.min(2, lane + mv))
      }
      lanePos += (lane - lanePos) * Math.min(1, dt * 15)
      tilt = (lane - lanePos) * -0.22
      var i
      for (i = 0; i < ents.length; i++) {
        var e = ents[i]
        var d = e.z - Z
        if (e.st === 1) { e.t += dt; continue }
        if (e.st === 2) continue
        if (d > 0.5) break // sorted: nothing nearer further on
        if (d < -0.5) { e.st = 2; continue }
        if (Math.abs(d) < 0.38 && Math.abs(lanePos - e.lane) < 0.55) {
          var sx = G.cx + (e.lane - 1) * LS()
          if (e.type === 'star' || e.type === 'coin') { e.st = 2; T0.collect(sx, G.ny - G.rw * 0.2, e.type === 'star') } else if (e.type === 'boost') { e.st = 2; T0.boost(sx, G.ny - 20) } else if (run.hitT <= 0) { e.st = 1; e.t = 0; T0.bump(sx, G.ny - 30) }
        }
      }
    }
    var T0 = run
    var DL = []
    var pool = []
    var poolN = 0
    function item (d, kind, o) { var it = pool[poolN] || (pool[poolN] = {}); poolN++; it.d = d; it.kind = kind; it.o = o; return it }
    var pi0 = 0
    var ei0 = 0
    function sortFar (a, b2) { return b2.d - a.d }

    function trap (path, cxF, cxN, hwFar, hwNear, yFar, yNear) {
      path.moveTo(cxF - hwFar, yFar)
      path.lineTo(cxF + hwFar, yFar)
      path.lineTo(cxN + hwNear, yNear)
      path.lineTo(cxN - hwNear, yNear)
      path.closePath()
    }

    var lastDt = 0.016
    function draw (c, dt) {
      lastDt = dt
      geo()
      var W = run.W
      var H = run.H
      // the bend ahead eases in, so a curve never jumps
      var bt = bend(Z + 20) - bend(Z)
      b0 += (bt - b0) * Math.min(1, dt * 3)
      var shift = (lanePos - 1) * 26 - b0 * 60
      // a short shake on a bump (never under reduced motion)
      var shk = run.hitT > 0.5 && !run.reduced() ? (run.hitT - 0.5) * 9 : 0
      c.save()
      if (shk) c.translate(Math.sin(run.t * 61) * shk, Math.cos(run.t * 47) * shk * 0.6)
      // sky + far panorama (opaque), cover so no seams; shifts a little with the lane
      var cf = 'lib:mojo-chase/cfar/' + th.far
      c.fillStyle = '#BFE6FF'
      c.fillRect(0, 0, W, H)
      if (!T.img(cf) || !run.cover(c, cf, -20, 0, W + 40, G.hy + 6, shift * 0.2 + run.t * 1.5)) run.grad(c, 0, G.hy, '#9ED8FF', '#EAF7FF')
      // clouds
      var ci = T.img('lib:nature/cloud')
      if (ci) {
        var q
        for (q = 0; q < 3; q++) {
          var cxp = ((q * 0.37 + run.t * 0.006 * (1 + q * 0.4)) % 1.25) * (W + 160) - 120 - shift * 0.3
          run.spr(c, 'lib:nature/cloud', cxp, G.hy * (0.22 + q * 0.13), 120 + q * 40, 80 + q * 24, { alpha: 0.85 })
        }
      }
      // mid skyline strip at the horizon
      var mk = 'lib:mojo-chase/cmid/' + th.mid
      var mi0 = T.img(mk)
      if (mi0) {
        var mw = Math.round(W * 1.35)
        var mh = Math.round(mw * mi0.height / mi0.width)
        var mc = T.scaled(mk, mw, mh)
        var mx = ((shift * 0.9 + run.t * 4) % mw + mw) % mw
        c.drawImage(mc, -mx - 20, G.hy - mh + 10)
        c.drawImage(mc, -mx - 20 + mw, G.hy - mh + 10)
      }
      // ground: grass + road bands in perspective, alternating with the world position so the road streams toward us.
      // Every colour is ONE batched path (a handful of fill calls per frame, not one per band).
      c.fillStyle = th.grass[0]
      c.fillRect(0, G.hy, W, H - G.hy)
      var off = ((Z % (BAND * 2)) + BAND * 2) % (BAND * 2)
      var b
      var start = -off - BAND * 2
      var cx0 = G.cx
      var rw = G.rw
      var gE = new Path2D()
      var rA = new Path2D()
      var rB = new Path2D()
      var kA = new Path2D()
      var kB = new Path2D()
      var dd = new Path2D()
      for (b = 0; b * BAND + start < DMAX; b++) {
        var d0 = Math.max(-2, start + b * BAND)
        var d1 = Math.min(DMAX, start + (b + 1) * BAND)
        if (d1 <= -2 || d0 >= DMAX) continue
        var even = (b % 2) === 1
        var pn = P(d0 + 0.0001)
        var pf = P(d1)
        var yn = Y(pn)
        var yf = Y(pf)
        if (even) gE.rect(0, yf, W, yn - yf + 1)
        var cf0 = CX(pf)
        var cn0 = CX(pn)
        trap(even ? kA : kB, cf0, cn0, rw * 1.08 * pf, rw * 1.08 * pn, yf, yn)
        trap(even ? rA : rB, cf0, cn0, rw * pf, rw * pn, yf, yn)
        if (even) {
          var da = Math.max(-2, start + b * BAND + 0.2)
          var db = Math.min(DMAX, start + (b + 1) * BAND - 0.2)
          if (db > da) {
            var pa = P(da)
            var pb = P(db)
            var xs = [-0.31, 0.31]
            var si
            for (si = 0; si < 2; si++) {
              var lx = xs[si] * rw
              var cb = CX(pb)
              var ca = CX(pa)
              dd.moveTo(cb + lx * pb - 3 * pb, Y(pb))
              dd.lineTo(cb + lx * pb + 3 * pb, Y(pb))
              dd.lineTo(ca + lx * pa + 3 * pa, Y(pa))
              dd.lineTo(ca + lx * pa - 3 * pa, Y(pa))
              dd.closePath()
            }
          }
        }
      }
      c.fillStyle = th.grass[1]
      c.fill(gE)
      c.fillStyle = '#FFFFFF'
      c.fill(kA)
      c.fillStyle = '#FFB3A3'
      c.fill(kB)
      c.fillStyle = th.road[0]
      c.fill(rA)
      c.fillStyle = th.road[1]
      c.fill(rB)
      c.fillStyle = 'rgba(255,255,255,.8)'
      c.fill(dd)
      // horizon haze: the far road and the land melt into the sky (depth), one gradient strip
      if (hzKey !== G.hy + ':' + G.ny) {
        hzKey = G.hy + ':' + G.ny
        hz = c.createLinearGradient(0, G.hy - 4, 0, G.hy + (G.ny - G.hy) * 0.22)
        hz.addColorStop(0, th.haze || 'rgba(255,255,255,.55)')
        hz.addColorStop(1, 'rgba(255,255,255,0)')
      }
      c.fillStyle = hz
      c.fillRect(0, G.hy - 4, W, (G.ny - G.hy) * 0.22 + 4)
      // world objects far -> near
      var drawList = DL
      drawList.length = 0
      poolN = 0
      var i
      while (pi0 < props.length && props[pi0].z - Z < -1.2) pi0++
      for (i = pi0; i < props.length; i++) { var pr = props[i]; var dd2 = pr.z - Z; if (dd2 >= DMAX) break; drawList.push(item(dd2, 'prop', pr)) }
      while (ei0 < ents.length && ents[ei0].z - Z < -1.2) ei0++
      for (i = ei0; i < ents.length; i++) { var en = ents[i]; var de = en.z - Z; if (de >= EMAX) break; if (en.st !== 2) drawList.push(item(de, 'ent', en)) }
      for (i = 0; i < gateZ.length + 1; i++) { var gz = i < gateZ.length ? gateZ[i] : endZ; var dg = gz - Z; if (dg > -1.2 && dg < DMAX) drawList.push(item(dg, i < gateZ.length ? 'gate' : 'finish', { z: gz })) }
      drawList.sort(sortFar)
      var playerDrawn = false
      for (i = 0; i < drawList.length; i++) {
        var it = drawList[i]
        if (!playerDrawn && it.d < 0) { drawPlayer(c); playerDrawn = true }
        drawItem(c, it)
      }
      if (!playerDrawn) drawPlayer(c)
      speedStreaks(c, dt)
      c.restore()
      // speed lines on boost
      if (run.boostT > 0 && !run.reduced()) {
        c.strokeStyle = 'rgba(255,255,255,.4)'
        c.lineWidth = 3
        var li
        for (li = 0; li < 14; li++) {
          var ang = (li / 14) * Math.PI * 2 + run.t * 0.4
          var rx = Math.cos(ang)
          var ry = Math.sin(ang) * 0.6
          c.beginPath()
          c.moveTo(G.cx + rx * W * 0.28, G.hy + 40 + ry * H * 0.3)
          c.lineTo(G.cx + rx * W * 0.62, G.hy + 40 + ry * H * 0.7)
          c.stroke()
        }
      }
    }

    function drawItem (c, it) {
      var p = P(it.d)
      var y = Y(p)
      if (y > run.H + 120) return
      var o = it.o
      if (it.kind === 'prop') {
        var px = CX(p) + o.side * G.rw * o.off * p
        run.spr(c, o.k, px, y, G.rw * 0.9 * o.sc * p, G.rw * 1.0 * o.sc * p, { anchor: 'bottom' })
      } else if (it.kind === 'ent') {
        var ex = CX(p) + (o.lane - 1) * LS() * p
        var sz = G.rw * 0.46 * p
        if (o.st === 1) {
          // knocked away: tumble sideways and fade
          var k = Math.min(1, o.t / 0.7)
          run.spr(c, 'lib:mojo-chase/items/' + o.type, ex + (o.lane - 1 || 1) * k * G.rw * 0.9 * p, y - k * 60 * p, sz, sz, { anchor: 'bottom', rot: k * 5, alpha: 1 - k })
          return
        }
        if (o.type === 'star' || o.type === 'coin') {
          var bob = Math.sin(run.t * 5 + o.z) * 5 * p
          run.spr(c, KEYS[o.type], ex, y - sz * 0.55 + bob, sz * 0.8, sz * 0.8, {})
        } else if (o.type === 'boost') run.spr(c, KEYS.boost, ex, y, sz * 1.1, sz * 0.7, { anchor: 'bottom' })
        else run.spr(c, 'lib:mojo-chase/items/' + o.type, ex, y + sz * 0.1, sz, sz, { anchor: 'bottom' })
        // soft shadow
        if (o.type !== 'boost') { c.fillStyle = 'rgba(40,60,90,.18)'; c.beginPath(); c.ellipse(ex, y + 1, sz * 0.35, sz * 0.09, 0, 0, 6.3); c.fill() }
      } else {
        var hw = G.rw * 1.0 * p
        var h = G.rw * 0.95 * p
        var fin = it.kind === 'finish'
        var gcx = CX(p)
        c.fillStyle = '#FFFFFF'
        c.fillRect(gcx - hw - 8 * p, y - h, 14 * p, h)
        c.fillRect(gcx + hw - 6 * p, y - h, 14 * p, h)
        var bx = gcx - hw
        var by = y - h - 6 * p
        var bh = h * 0.34
        if (fin) {
          var cs = 16 * p
          var ix
          var iy
          for (iy = 0; iy < 2; iy++) for (ix = 0; ix < Math.ceil(hw * 2 / cs); ix++) { c.fillStyle = (ix + iy) % 2 ? '#2B3A7A' : '#FFFFFF'; c.fillRect(bx + ix * cs, by + iy * cs, cs, cs) }
        } else {
          var gg = c.createLinearGradient(0, by, 0, by + bh)
          gg.addColorStop(0, '#FFE29A')
          gg.addColorStop(1, '#FFB347')
          c.fillStyle = gg
          run.rrect(c, bx, by, hw * 2, bh, 12 * p)
          c.fill()
          c.fillStyle = '#13318A'
          c.font = '700 ' + Math.max(10, 52 * p) + 'px Fredoka,Nunito,sans-serif'
          c.textAlign = 'center'
          c.textBaseline = 'middle'
          c.fillText('SOAL!', gcx, by + bh / 2)
        }
      }
    }

    // light speed streaks along both road edges (always, faint), streaming toward the camera
    function speedStreaks (c, dt) {
      if (run.reduced()) return
      var a = 0.16 + (run.boostT > 0 ? 0.2 : 0)
      c.strokeStyle = 'rgba(255,255,255,' + a + ')'
      c.lineWidth = 2
      c.beginPath()
      var q
      for (q = 0; q < 6; q++) {
        var ph = ((run.t * run.rate * 0.9 + q / 6) % 1)
        var p = 0.35 + ph * 0.75
        var y = Y(p)
        var side = q % 2 ? 1 : -1
        var x = CX(p) + side * G.rw * (1.18 + (q % 3) * 0.07) * p
        var len = 26 * p * (run.boostT > 0 ? 1.8 : 1)
        c.moveTo(x, y)
        c.lineTo(x + side * len * 0.35, y + len)
      }
      c.stroke()
    }
    // dust puffs from the rear wheels: drift toward the camera, grow and fade (a small pool, no allocation per frame)
    function dust (c, dt, px, sz) {
      if (run.reduced()) return
      puffT -= dt
      if (puffT <= 0 && run.state === 'play') {
        puffT = run.boostT > 0 ? 0.03 : 0.07
        var q
        for (q = -1; q <= 1; q += 2) {
          var pf = puffs.length < 28 ? {} : puffs.shift()
          pf.x = px + q * sz * 0.36 + (Math.random() - 0.5) * 6; pf.y = G.ny - 4; pf.t = 0; pf.vx = q * (8 + Math.random() * 14); pf.r = 4 + Math.random() * 4
          puffs.push(pf)
        }
      }
      c.fillStyle = th.dust || 'rgba(236,228,210,1)'
      var i
      for (i = 0; i < puffs.length; i++) {
        var u = puffs[i]
        u.t += dt
        var k = u.t / 0.6
        if (k >= 1) continue
        c.globalAlpha = (1 - k) * 0.45
        c.beginPath(); c.arc(u.x + u.vx * u.t, u.y + u.t * 38, u.r + k * 14, 0, 6.3); c.fill()
      }
      c.globalAlpha = 1
    }

    function drawPlayer (c) {
      var bob = Math.sin(run.t * 16) * 1.6
      var px = G.cx + (lanePos - 1) * LS()
      var sz = Math.min(G.rw * 0.62, run.H * 0.3)
      c.fillStyle = 'rgba(30,40,70,.28)'
      c.beginPath()
      c.ellipse(px, G.ny + 4, sz * 0.46, sz * 0.09, 0, 0, 6.3)
      c.fill()
      dust(c, lastDt, px, sz)
      var alpha = run.hitT > 0 && !run.reduced() ? (Math.floor(run.t * 12) % 2 ? 0.45 : 1) : 1
      // leans into the curve ahead a little, on top of the lane-change tilt
      run.spr(c, lvl.veh, px, G.ny + bob, sz, sz * 0.86, { anchor: 'bottom', rot: tilt + b0 * 0.05, alpha: alpha })
      if (run.boostT > 0 && !run.reduced()) run.spr(c, 'fx:speed', px, G.ny - sz * 0.1, sz * 1.1, sz * 0.8, { alpha: 0.5 })
    }

    return { update: update, draw: draw, resize: geo, layers: ['sky', 'panorama', 'clouds', 'skyline', 'road', 'props', 'items', 'vehicle'], get lane () { return lane }, ents: ents }
  }
  T.engine('land', { assets: assets, make: make })
})(window)
