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

  function assets (lvl) {
    var a = [lvl.veh, 'lib:nature/cloud', 'lib:mojo-chase/cmid/' + lvl.theme.far, 'lib:game/hot-air-balloon', 'lib:animals/eagle',
      'lib:animals/parrot', 'lib:game/star', 'lib:nature/sun', 'lib:nature/moon-stars', 'lib:nature/rainbow', 'lib:tk-world/palm-island', 'lib:tk-world/lighthouse-island', 'lib:tk-world/storm-cloud',
      'fx:spark', 'fx:dust', 'fx:speed', 'fx:gold-star', 'fx:confetti', 'fx:droplets', 'fx:ripple', 'fx:bubbles']
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
    var ci
    for (ci = 0; ci < 18; ci++) clouds.push({ x: r(), y: r() * 0.7, s: 0.4 + r() * 0.9, layer: ci % 3 })
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
      if (!run.in.down && !run.in.ky) steer = py < H * 0.17 ? H * 0.4 : py // hold position when the finger lifts
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
        if (e.type === 'star' && Math.abs(dx) < G.ps * 0.45 && Math.abs(dy) < G.ps * 0.45) { e.st = 2; run.collect(ex, ey, false) } else if (e.type === 'ring' && Math.abs(dx) < G.ps * 0.3 && Math.abs(dy) < H * 0.085) { e.st = 2; run.collect(ex, ey, true); run.fx('check-burst', ex, ey, 160) } else if (e.type !== 'star' && e.type !== 'ring' && Math.abs(dx) < G.ps * 0.38 && Math.abs(dy) < G.ps * 0.3 && run.hitT <= 0) { e.st = 1; e.t = 0; wobble = 0.8; run.bump(G.px + G.ps * 0.4, py) }
      }
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
        run.spr(c, 'lib:nature/cloud', cx, cy, sz * 1.3, sz, { alpha: 0.5 + cl.layer * 0.15 })
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
        if (e.type === 'star') run.spr(c, 'lib:game/star', ex, ey, sz2 * 0.55, sz2 * 0.55, {})
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
      drawPlane(c)
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
      for (fc = 0; fc < 3; fc++) {
        var fxp = (((fc * 0.43 + 0.1) * (W + 500) - Z * G.pxu * 0.9 - run.t * 20) % (W + 500) + (W + 500)) % (W + 500) - 250
        run.spr(c, 'lib:nature/cloud', fxp, H * (0.2 + fc * 0.28) + camY * 0.9, 340 + fc * 70, 220 + fc * 40, { alpha: 0.4 })
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

    return { update: update, draw: draw, resize: geo, layers: ['sky', 'sun-rays', 'horizon', 'clouds-far', 'clouds-mid', 'clouds-near', 'sea', 'birds', 'clouds-front', 'plane'], get lane () { return null }, get lift () { return lift } }
  }
  T.engine('air', { assets: assets, make: make })
})(window)
