/* G32 Blippi -- AIR (water) and LUAR ANGKASA (space): top-down vertical scrollers with FREE horizontal steering (drag anywhere / arrow keys).
 * One shared mechanic (entities at world z, ahead = z - progress*len, soft obstacles that slow + wobble + tumble away), two skins:
 *   water  - tiled wave patterns at two speeds, drifting islands/icebergs at the edges (parallax 0.9), foam wake, buoy gates
 *   space  - gradient + nebula blobs, three star layers (0.15/0.35/0.7), slow planets (0.35) with rings, asteroid obstacles, rocket flame
 * Nothing here can fail the run. Sprites come from the shared library; the rocket is the shared 'rocket' sticker (owner art slot
 * 'veh-roket' reserved in ART-SLOTS.md). Offscreen tiles are rendered once; per frame only drawImage/fillRect with translate. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  var ROCKET = 'lib:mojo-chase/items/rocket'
  // owner art (Dunia gt/asteroid, white sticker ring removed): a dark cratered rock that reads as danger against the purple sky;
  // the drawn lavender rock is the fallback
  var ROCK = 'sp:asteroid'
  // world units (about seconds at speed 1) at the start with no obstacles: the how-to chip shows for 3.6 s
  var GRACE = 6.5

  function tileCanvas (size, fn) {
    var cv = w.document.createElement('canvas')
    cv.width = size
    cv.height = size
    fn(cv.getContext('2d'), size)
    return cv
  }

  function assets (lvl, skin) {
    var a = ['lib:nature/cloud', 'fx:splash', 'fx:ripple', 'fx:bubbles', 'lib:game/star', 'lib:game/lifebuoy', 'lib:game/gem-blue', 'lib:game/barrel', 'lib:tk-world/iceberg-2', 'fx:spark', 'fx:dust', 'fx:speed', 'fx:gold-star', 'fx:confetti', 'fx:droplets', 'fx:ripple', 'fx:bubbles']
    if (skin === 'water') {
      a.push(lvl.veh)
      lvl.theme.deco.forEach(function (d) { a.push('lib:tk-world/' + d) })
    } else {
      // the child's chosen animated craft (BlippiSpace); the old rocket art stays as the fallback
      var cr = T.craft && T.craft()
      a.push(ROCKET, 'lib:nature/moon-stars', ROCK)
      if (cr) a.push('sp:' + cr.id)
    }
    return a
  }

  function make (run, skin) {
    var lvl = run.lvl
    var th = lvl.theme
    var r = run.rnd
    var ents = []
    var deco = []
    var planets = []
    var G = { ps: 0, py: 0, pyu: 0 }
    var Z = 0
    var px = 0.5
    var tilt = 0
    var wobble = 0
    var wake = []
    var spin = []
    var trail = []
    var waves3 = null
    var skyLine = 0
    var wakeT = 0
    var collectibles = 0
    var gateZ = lvl.gates.map(function (f) { return f * run.len })
    function nearGate (z) { return gateZ.some(function (g) { return Math.abs(g - z) < 1.5 }) }
    var water = skin === 'water'
    var craft = !water && T.craft ? T.craft() : null
    var obsKeys = water ? th.obs : ['asteroid']
    var z = 3
    var step = 2.5 - lvl.dens * 1.1
    while (z < run.len - 2) {
      if (!nearGate(z)) {
        var roll = r()
        if (z < GRACE) roll = 1 // the opening is a star trail only: the child learns to steer while the how-to chip is up
        if (roll < lvl.dens) {
          var x1 = 0.14 + r() * 0.72
          ents.push({ z: z, x: x1, type: obsKeys[(r() * obsKeys.length) | 0], st: 0, t: 0, ph: r() * 6, sc: 0.9 + r() * 0.5 })
          if (r() < lvl.dens * 0.45) {
            var x2 = x1 > 0.5 ? x1 - 0.34 - r() * 0.2 : x1 + 0.34 + r() * 0.2
            ents.push({ z: z + 0.2, x: Math.max(0.1, Math.min(0.9, x2)), type: obsKeys[(r() * obsKeys.length) | 0], st: 0, t: 0, ph: r() * 6, sc: 0.9 + r() * 0.4 })
          }
          ents.push({ z: z + 1, x: x1 > 0.5 ? 0.25 : 0.75, type: 'star', st: 0, t: 0, ph: 0 }); collectibles++
        } else if (roll < lvl.dens + 0.16) {
          ents.push({ z: z, x: 0.2 + r() * 0.6, type: 'big', st: 0, t: 0, ph: 0 }); collectibles += 2
        } else {
          var cx = 0.2 + r() * 0.6
          var q
          for (q = 0; q < 4; q++) { ents.push({ z: z + q * 0.5, x: Math.max(0.1, Math.min(0.9, cx + Math.sin(q * 1.1) * 0.12)), type: 'star', st: 0, t: 0, ph: q }); collectibles++ }
        }
      }
      z += step * (0.8 + r() * 0.5)
    }
    ents.sort(function (a, b) { return a.z - b.z })
    var dz = 0
    while (dz < run.len + 8) {
      if (water) deco.push({ z: dz, side: r() < 0.5 ? -1 : 1, k: 'lib:tk-world/' + th.deco[(r() * th.deco.length) | 0], off: 0.04 + r() * 0.1, sc: 0.8 + r() * 0.6 })
      dz += 2.2 + r() * 2
    }
    if (!water) {
      var pz = 2
      while (pz < run.len + 10) {
        planets.push({ z: pz, x: 0.1 + r() * 0.8, rad: 0.05 + r() * 0.09, col: th.planets[(r() * th.planets.length) | 0], ring: r() < 0.4, ph: r() })
        pz += 3.5 + r() * 3.5
      }
    }
    run.starTotal = Math.round(collectibles * 0.5)

    // pre-rendered tiles
    var nebBig = null
    var nebKey = ''
    var waves = null
    var waves2 = null
    var starTiles = null
    var nebula = null
    var rock = null
    function tiles () {
      if (water && !waves) {
        waves = tileCanvas(256, function (c, s) {
          // broken, softer crests instead of six unbroken lines per tile (that read as wallpaper, not sea)
          c.strokeStyle = 'rgba(255,255,255,.34)'
          c.lineWidth = 3
          c.lineCap = 'round'
          c.setLineDash([46, 38])
          var i
          for (i = 0; i < 6; i++) {
            c.beginPath()
            var y0 = (i + 0.5) * s / 6
            var x
            for (x = 0; x <= s; x += 8) { var yy = y0 + Math.sin(x / s * 6.283 * 2 + i * 1.7) * 7; if (x === 0) c.moveTo(x, yy); else c.lineTo(x, yy) }
            c.stroke()
          }
        })
        waves3 = tileCanvas(340, function (c, s2) {
          c.strokeStyle = 'rgba(255,255,255,.28)'
          c.lineWidth = 5
          var i
          for (i = 0; i < 5; i++) { var x = (i * 97) % s2; var y = (i * 131) % s2; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x + 30, y - 22, x + 70, y + 22, x + 110, y); c.stroke() }
        })
        waves2 = tileCanvas(180, function (c, s) {
          c.strokeStyle = 'rgba(255,255,255,.4)'
          c.lineWidth = 2
          var i
          for (i = 0; i < 9; i++) { var x = (i * 53) % s; var y = (i * 71) % s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 12, y - 8, x + 26, y); c.stroke() }
        })
      }
      if (!water && !starTiles) {
        starTiles = [0, 1, 2].map(function (li) {
          var arr = []
          var n = 44 - li * 12
          var i
          for (i = 0; i < n; i++) arr.push({ x: r(), y: r(), s: 1 + li * 0.9 + r() * 1.2, gold: r() < 0.3 })
          return arr
        })
        nebula = tileCanvas(512, function (c, s) {
          var k
          for (k = 0; k < 3; k++) {
            var gr = 90 + r() * 70
            var gx = gr + r() * (s - 2 * gr)
            var gy = gr + r() * (s - 2 * gr)
            var g = c.createRadialGradient(gx, gy, 4, gx, gy, gr)
            g.addColorStop(0, th.neb[k % th.neb.length] + '99')
            g.addColorStop(1, th.neb[k % th.neb.length] + '00')
            c.fillStyle = g
            c.fillRect(gx - gr, gy - gr, gr * 2, gr * 2)
          }
        })
        rock = tileCanvas(160, function (c, s) {
          c.translate(s / 2, s / 2)
          c.beginPath()
          var i
          for (i = 0; i < 12; i++) { var a = i / 12 * 6.283; var rr = s * 0.38 * (0.82 + r() * 0.22); if (i === 0) c.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) }
          c.closePath()
          var g = c.createRadialGradient(-s * 0.1, -s * 0.12, 4, 0, 0, s * 0.4)
          g.addColorStop(0, '#F1E4F7'); g.addColorStop(1, '#B9A2CF')
          c.fillStyle = g
          c.fill()
          c.lineWidth = 5
          c.strokeStyle = '#FFFFFF'
          c.stroke()
          c.fillStyle = 'rgba(120,96,160,.35)'
          c.beginPath(); c.arc(-s * 0.1, s * 0.08, s * 0.07, 0, 6.3); c.arc(s * 0.12, -s * 0.1, s * 0.05, 0, 6.3); c.arc(s * 0.1, s * 0.14, s * 0.04, 0, 6.3); c.fill()
        })
      }
    }
    tiles()

    function geo () {
      G.ps = Math.min(run.W * 0.24, run.H * 0.2)
      G.py = run.H * 0.78
      G.pyu = run.H * 0.2
    }
    geo()
    px = 0.5

    function update (dt) {
      Z = run.progress * run.len
      var tx = run.in.x
      var prev = px
      px += (Math.max(0.08, Math.min(0.92, tx)) - px) * Math.min(1, dt * 12)
      tilt += ((px - prev) * 10 - tilt) * Math.min(1, dt * 8)
      tilt = Math.max(-0.4, Math.min(0.4, tilt))
      wobble = Math.max(0, wobble - dt)
      wakeT -= dt
      if (wakeT <= 0) { wakeT = 0.04; if (!water) { trail.push({ x: px * run.W, y: G.py + G.ps * 0.5, t: 0 }); if (trail.length > 22) trail.shift() } wake.push({ x: px * run.W, y: G.py + G.ps * 0.7, t: 0 }); if (wake.length > 30) wake.shift() }
      var i
      for (i = 0; i < wake.length; i++) wake[i].t += dt
      for (i = 0; i < trail.length; i++) trail[i].t += dt
      var W = run.W
      for (i = 0; i < ents.length; i++) {
        var e = ents[i]
        if (e.st === 1) { e.t += dt; continue }
        if (e.st === 2) continue
        var d = e.z - Z
        if (d > 0.9) break
        if (d < -1.4) { e.st = 2; continue }
        var ex = e.x * W
        var ey = G.py - d * G.pyu
        var dx = ex - px * W
        var dy = ey - G.py
        var small = e.type === 'star' || e.type === 'big'
        var rr = small ? G.ps * 0.5 : G.ps * (0.3 + 0.28 * (e.sc || 1))
        if (Math.abs(dx) < rr && Math.abs(dy) < rr) {
          if (small) { e.st = 2; run.collect(ex, ey, e.type === 'big') } else if (run.hitT <= 0) { e.st = 1; e.t = 0; wobble = 0.8; run.bump(ex, ey) }
        }
      }
    }

    function eSprite (e) {
      if (e.type === 'star') return 'lib:game/star'
      if (e.type === 'big') return water ? 'lib:game/lifebuoy' : 'lib:game/gem-blue'
      if (e.type === 'barrel') return 'lib:game/barrel'
      if (e.type === 'iceberg-2') return 'lib:tk-world/iceberg-2'
      return null
    }

    function drawGate (c, z0, fin) {
      var y = G.py - (z0 - Z) * G.pyu
      if (y < -80 || y > run.H + 60) return
      var W = run.W
      var bx = W * 0.06
      var bw = W * 0.88
      c.strokeStyle = fin ? '#FFFFFF' : 'rgba(255,255,255,.9)'
      c.lineWidth = 5
      c.setLineDash([14, 10])
      c.beginPath(); c.moveTo(bx, y); c.lineTo(bx + bw, y); c.stroke()
      c.setLineDash([])
      if (water) { run.spr(c, 'lib:game/lifebuoy', bx, y, 70, 70, {}); run.spr(c, 'lib:game/lifebuoy', bx + bw, y, 70, 70, {}) } else {
        c.strokeStyle = fin ? '#FFE29A' : '#CFE6FB'
        c.lineWidth = 6
        c.beginPath(); c.ellipse(bx, y, 24, 40, 0, 0, 6.3); c.stroke()
        c.beginPath(); c.ellipse(bx + bw, y, 24, 40, 0, 0, 6.3); c.stroke()
      }
      var bh = 48
      var w2 = 150
      var gg = c.createLinearGradient(0, y - 80, 0, y - 80 + bh)
      gg.addColorStop(0, '#FFE29A'); gg.addColorStop(1, '#FFB347')
      c.fillStyle = fin ? '#FFFFFF' : gg
      run.rrect(c, W / 2 - w2 / 2, y - 80, w2, bh, 16)
      c.fill()
      if (fin) { var q; for (q = 0; q < 10; q++) { c.fillStyle = q % 2 ? '#2B3A7A' : '#FFFFFF'; c.fillRect(W / 2 - w2 / 2 + q * w2 / 10, y - 80 + (q % 2 ? 0 : bh / 2), w2 / 10, bh / 2) } } else {
        c.fillStyle = '#13318A'
        c.font = '700 26px Fredoka,Nunito,sans-serif'
        c.textAlign = 'center'
        c.textBaseline = 'middle'
        c.fillText('SOAL!', W / 2, y - 80 + bh / 2)
      }
    }

    // a wave band = its tile baked ONCE into a screen-plus-one-tile canvas, then blitted at the scrolled offset: one drawImage
    // per band (a pattern fill under a moving transform cost ~100 ms a frame on a slow tablet: 4 fps, owner "superslow")
    var bandCv = {}
    var bgCv = null
    function band (c, key, tile, size, speed, dxk, extra) {
      var k = run.dpr * run.scale
      var bw = Math.ceil(run.W / size + 1) * size
      var bh = Math.ceil(run.H / size + 1) * size
      var id = key + bw + 'x' + bh + '@' + k
      var bc = bandCv[key]
      if (!bc || bc.id !== id) {
        var cv = w.document.createElement('canvas')
        cv.width = Math.ceil(bw * k)
        cv.height = Math.ceil(bh * k)
        var x = cv.getContext('2d')
        x.scale(k, k)
        x.fillStyle = x.createPattern(tile, 'repeat')
        x.fillRect(0, 0, bw, bh)
        bc = bandCv[key] = { id: id, cv: cv }
      }
      var tx = (((0.5 - px) * dxk) % size) + run.t * (extra ? 0 : speed * 4)
      var oy = (Z * G.pyu * speed + (extra || 0)) % size
      c.drawImage(bc.cv, ((tx % size) + size) % size - size, ((oy % size) + size) % size - size, bw, bh)
    }
    function drawBgWater (c) {
      var W = run.W
      var H = run.H
      // 1 deep-to-shallow water + 2 the warm sky reflection of a sunset level: both static, baked once per size into one opaque
      // canvas (a full-screen gradient fill every frame was the other big cost on a slow tablet)
      var k = run.dpr * run.scale
      var bid = W + 'x' + H + '@' + k
      if (!bgCv || bgCv.id !== bid) {
        var cv = w.document.createElement('canvas')
        cv.width = Math.ceil(W * k)
        cv.height = Math.ceil(H * k)
        var x = cv.getContext('2d')
        x.scale(k, k)
        run.grad(x, 0, H, th.water[0], th.water[1])
        if (th.glow) {
          var gg = x.createLinearGradient(0, 0, 0, H * 0.75)
          gg.addColorStop(0, th.glow); gg.addColorStop(1, 'rgba(255,150,80,0)')
          x.fillStyle = gg
          x.fillRect(0, 0, W, H * 0.75)
          var sg = x.createRadialGradient(W * 0.5, H * 0.04, 4, W * 0.5, H * 0.04, W * 0.4)
          sg.addColorStop(0, 'rgba(255,230,170,.55)'); sg.addColorStop(1, 'rgba(255,230,170,0)')
          x.fillStyle = sg
          x.fillRect(0, 0, W, H * 0.5)
        }
        bgCv = { id: bid, cv: cv }
      }
      c.drawImage(bgCv.cv, 0, 0, W, H)
      // 3 three wave bands at three speeds (slow broad swell, mid ripples, fast glints)
      band(c, 'w3', waves3, 340, 0.55, 18)
      band(c, 'w1', waves, 256, 0.9, 30)
      band(c, 'w2', waves2, 180, 1.35, 60, 0)
      // 4 slow cloud shadows / drifting clouds at the horizon edge
      var ci
      for (ci = 0; ci < 3; ci++) {
        var cyy = ((ci * 0.41 + Z * G.pyu * 0.0006 * (ci + 1) + 0.1) % 1.3) * (H + 200) - 100
        run.spr(c, 'lib:nature/cloud', ((ci * 0.37 + 0.2) % 1) * W - (px - 0.5) * 18, cyy, 260 + ci * 60, 150 + ci * 30, { alpha: 0.2 })
      }
      var i
      for (i = 0; i < deco.length; i++) {
        var d = deco[i]
        var yy = G.py - (d.z - Z) * G.pyu * 0.9
        if (yy < -160 || yy > H + 160) continue
        var sz = G.ps * 1.5 * d.sc
        var x = d.side < 0 ? sz * 0.28 - (d.off * W * 0.5) : W - sz * 0.28 + d.off * W * 0.5
        run.spr(c, d.k, x - (px - 0.5) * 24, yy, sz, sz, {})
      }
    }

    function drawBgSpace (c) {
      var W = run.W
      var H = run.H
      run.grad(c, 0, H, th.bg[0], th.bg[1])
      var nk = W + 'x' + H
      if (nebKey !== nk) {
        nebKey = nk
        nebBig = tileCanvas(Math.max(W, H * 2), function (cc, sz) { cc.drawImage(nebula, 0, 0, sz, sz) })
      }
      var oy = (Z * G.pyu * 0.08) % nebBig.height
      c.globalAlpha = 0.9
      c.drawImage(nebBig, 0, 0, nebBig.width, nebBig.height, -((px - 0.5) * 20), oy - nebBig.height, nebBig.width, nebBig.height)
      c.drawImage(nebBig, 0, 0, nebBig.width, nebBig.height, -((px - 0.5) * 20), oy, nebBig.width, nebBig.height)
      c.globalAlpha = 1
      var li
      for (li = 0; li < 3; li++) {
        var arr = starTiles[li]
        var sp = [0.15, 0.35, 0.7][li]
        var span = H + 20
        var shiftY = (Z * G.pyu * sp + run.t * (6 + li * 6)) % span
        var shiftX = (0.5 - px) * (14 + li * 18)
        c.globalAlpha = run.reduced() ? 0.85 : 0.65 + 0.35 * Math.sin(run.t * (1.3 + li * 0.9) + li)
        c.fillStyle = '#FFFFFF'
        var pw = new Path2D()
        var pg = new Path2D()
        var q
        for (q = 0; q < arr.length; q++) {
          var st = arr[q]
          var sy = (st.y * span + shiftY) % span - 10
          var sx = st.x * W + shiftX
          ;(st.gold ? pg : pw).rect(sx, sy, st.s, st.s)
        }
        c.fill(pw)
        c.fillStyle = '#FFE9A8'
        c.fill(pg)
        c.globalAlpha = 1
      }
      var i
      for (i = 0; i < planets.length; i++) {
        var p = planets[i]
        var yy = G.py - (p.z - Z) * G.pyu * 0.35 - H * 0.12
        var rad = p.rad * Math.min(W, H) * 1.5
        if (yy < -rad * 2 || yy > H + rad * 2) continue
        var xx = p.x * W - (px - 0.5) * 40
        var g = c.createRadialGradient(xx - rad * 0.35, yy - rad * 0.35, rad * 0.1, xx, yy, rad)
        g.addColorStop(0, '#FFFFFF')
        g.addColorStop(0.25, p.col)
        g.addColorStop(1, p.col)
        c.fillStyle = g
        c.beginPath(); c.arc(xx, yy, rad, 0, 6.3); c.fill()
        // slow rotation: soft surface bands slide across the disc, clipped to it
        c.save()
        c.beginPath(); c.arc(xx, yy, rad, 0, 6.3); c.clip()
        c.fillStyle = 'rgba(255,255,255,.22)'
        var bi
        for (bi = 0; bi < 3; bi++) { var bx = ((run.t * (run.reduced() ? 0 : 6) + bi * rad * 0.9 + p.ph * 90) % (rad * 2.7)) - rad * 1.35; c.fillRect(xx + bx, yy - rad, rad * 0.28, rad * 2) }
        c.fillStyle = 'rgba(80,60,140,.2)'
        c.beginPath(); c.arc(xx + rad * 0.3, yy + rad * 0.25, rad * 0.95, -0.6, 2.8); c.fill()
        c.restore()
        if (p.ring) { c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = Math.max(3, rad * 0.14); c.beginPath(); c.ellipse(xx, yy, rad * 1.7, rad * 0.45, -0.4, 0, 6.3); c.stroke() }
      }
    }

    function drawPlayer (c) {
      var x = px * run.W
      var y = G.py
      var ps = G.ps
      var alpha = run.hitT > 0 && !run.reduced() ? (Math.floor(run.t * 12) % 2 ? 0.45 : 1) : 1
      var wob = wobble > 0 ? Math.sin(run.t * 30) * 0.12 * wobble : 0
      if (water) {
        // layered wake: wide soft foam ribbon + bright inner V, both fading and spreading with age
        var i
        c.fillStyle = th.foam
        for (i = 0; i < wake.length; i++) {
          var wk = wake[i]
          var a = Math.max(0, 1 - wk.t * 0.9)
          var yy = wk.y + wk.t * G.pyu * run.rate
          var sp = wk.t * 26
          c.globalAlpha = a * 0.45
          c.beginPath(); c.arc(wk.x - sp, yy, 5 + wk.t * 9, 0, 6.3); c.arc(wk.x + sp, yy, 5 + wk.t * 9, 0, 6.3); c.fill()
          c.globalAlpha = a * 0.75
          c.beginPath(); c.arc(wk.x + Math.sin(i + wk.t * 3) * 4, yy, 4 + wk.t * 6, 0, 6.3); c.fill()
        }
        c.globalAlpha = 1
        var bob = run.reduced() ? 0 : Math.sin(run.t * 2.6) * 3
        var roll = run.reduced() ? 0 : Math.sin(run.t * 1.9) * 0.05
        c.fillStyle = 'rgba(10,50,90,.1)'
        c.beginPath(); c.ellipse(x + 5, y + 8 + bob, ps * 0.4, ps * 0.8, 0, 0, 6.3); c.fill()
        c.save(); c.translate(x, y + bob); c.rotate(tilt * 0.5 + wob + roll); c.globalAlpha = alpha
        run.spr(c, lvl.veh, 0, 0, ps * 1.25, ps * 1.5, {})
        c.restore()
        // bow splash
        c.fillStyle = th.foam
        c.globalAlpha = 0.8
        c.beginPath(); c.ellipse(x, y - ps * 0.82 + bob, ps * 0.2 + Math.sin(run.t * 9) * 2, ps * 0.07, 0, 0, 6.3); c.fill()
        c.globalAlpha = 1
      } else {
        var ti
        for (ti = 0; ti < trail.length; ti++) {
          var tr = trail[ti]
          var ta = Math.max(0, 1 - tr.t * 1.4)
          c.fillStyle = ti % 2 ? 'rgba(255,214,150,' + (ta * 0.55) + ')' : 'rgba(255,255,255,' + (ta * 0.4) + ')'
          c.beginPath(); c.arc(tr.x + Math.sin(ti) * 3, tr.y + tr.t * G.pyu * 1.2, 3 + tr.t * 11, 0, 6.3); c.fill()
        }
        c.save(); c.translate(x, y); c.rotate(tilt * 0.35 + wob); c.globalAlpha = alpha
        var fl = (run.boostT > 0 ? 1.6 : 1) * (run.progress < 0.075 ? 1.7 : 1) * (0.85 + Math.sin(run.t * 40) * 0.15)
        if (craft && T.img('sp:' + craft.id)) {
          // the chosen craft, animated (its own micro movement), with a soft engine glow under it; only the rocket gets a flame
          if (craft.id !== 'rocket') {
            var eg = c.createRadialGradient(0, ps * 0.5, 2, 0, ps * 0.5, ps * 0.42 * fl)
            eg.addColorStop(0, 'rgba(160,220,255,.75)'); eg.addColorStop(1, 'rgba(160,220,255,0)')
            c.fillStyle = eg
            c.beginPath(); c.ellipse(0, ps * 0.5, ps * 0.42 * fl, ps * 0.42 * fl, 0, 0, 6.3); c.fill()
          }
        }
        var flame = !craft || craft.id === 'rocket' || !T.img('sp:' + craft.id)
        if (flame) {
        var fg = c.createLinearGradient(0, ps * 0.2, 0, ps * (0.5 + 0.35 * fl))
        fg.addColorStop(0, 'rgba(255,240,170,.95)'); fg.addColorStop(0.5, 'rgba(255,170,90,.8)'); fg.addColorStop(1, 'rgba(255,170,90,0)')
        c.fillStyle = fg
        c.beginPath(); c.moveTo(-ps * 0.12, ps * 0.2); c.quadraticCurveTo(0, ps * (0.75 * fl), ps * 0.12, ps * 0.2); c.closePath(); c.fill()
        }
        if (craft && T.frameSpr(c, 'sp:' + craft.id, craft.play, run.t, 0, 0, ps * 1.2, ps * 1.2)) { /* drawn */ } else if (T.img('g:veh-roket')) run.spr(c, 'g:veh-roket', 0, 0, ps * 0.9, ps * 1.1, {})
        else run.spr(c, ROCKET, 0, 0, ps * 1.25, ps * 1.25, { rot: -Math.PI / 4 })
        c.restore()
      }
    }

    function draw (c, dt) {
      geo()
      if (water) drawBgWater(c); else drawBgSpace(c)
      var W = run.W
      var H = run.H
      var i
      for (i = 0; i < ents.length; i++) {
        var e = ents[i]
        if (e.st === 2) continue
        var d = e.z - Z
        var ey = G.py - d * G.pyu
        if (ey < -120 || ey > H + 120) continue
        var ex = e.x * W
        var sz = G.ps * 0.8 * (e.sc || 1)
        if (e.st === 1) {
          var k = Math.min(1, e.t / 0.8)
          drawObs(c, e, ex + (e.x > 0.5 ? 1 : -1) * k * 90, ey + k * 30, sz, 1 - k, k * 3)
          continue
        }
        if (e.type === 'star') run.spr(c, 'lib:game/star', ex, ey + Math.sin(run.t * 4 + e.ph) * 4, G.ps * 0.5, G.ps * 0.5, {})
        else if (e.type === 'big') run.spr(c, eSprite(e), ex, ey + Math.sin(run.t * 3) * 4, G.ps * 0.7, G.ps * 0.7, {})
        else drawObs(c, e, ex, ey, sz, 1, Math.sin(run.t * 1.6 + e.ph) * 0.06)
      }
      var gl = gateZ.concat([run.len])
      for (i = 0; i < gl.length; i++) drawGate(c, gl[i], i === gl.length - 1)
      if (!water) drawIntroOutro(c)
      drawPlayer(c)
      if (run.boostT > 0 && !run.reduced()) {
        c.strokeStyle = 'rgba(255,255,255,.35)'
        c.lineWidth = 3
        var li
        for (li = 0; li < 10; li++) { var lx = ((li * 0.137 + 0.05) % 1) * W; var ly = ((run.t * 2 + li * 0.31) % 1) * H; c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx, ly + 70); c.stroke() }
      }
    }
    // launch pad slides away under the rocket in the first 7 percent; a big destination planet rises and the rocket circles into orbit at the end
    function drawIntroOutro (c) {
      var W = run.W
      var H = run.H
      var p = run.progress
      if (p < 0.075) {
        var k = p / 0.075
        var gy = G.py + G.ps * 0.62 + k * H * 0.5
        c.fillStyle = '#B9C4DD'
        c.fillRect(0, gy, W, H)
        c.fillStyle = '#8FA0C8'
        c.fillRect(0, gy, W, 8)
        c.fillStyle = '#FFD25E'
        c.fillRect(W * 0.5 - G.ps * 0.9, gy - 6, G.ps * 1.8, 8)
        c.strokeStyle = '#C5CFE6'
        c.lineWidth = 6
        c.beginPath(); c.moveTo(W * 0.5 - G.ps * 0.8, gy); c.lineTo(W * 0.5 - G.ps * 0.8, gy - G.ps * 1.6); c.moveTo(W * 0.5 + G.ps * 0.8, gy); c.lineTo(W * 0.5 + G.ps * 0.8, gy - G.ps * 1.6); c.stroke()
        if (!run.reduced() && k < 0.8) { c.fillStyle = 'rgba(255,255,255,.55)'; var q; for (q = 0; q < 6; q++) { c.beginPath(); c.arc(W * 0.5 + Math.sin(q * 2 + run.t * 5) * G.ps * (0.5 + q * 0.12), gy - 8 - q * 6, 14 + q * 3, 0, 6.3); c.fill() } }
      }
      if (p > 0.9) {
        var o = Math.min(1, (p - 0.9) / 0.1)
        o = o * o * (3 - 2 * o)
        var rad = H * 0.3
        var cy = -rad + o * (rad * 1.45)
        var g = c.createRadialGradient(W * 0.5 - rad * 0.3, cy - rad * 0.3, rad * 0.1, W * 0.5, cy, rad)
        g.addColorStop(0, '#FFFFFF'); g.addColorStop(0.3, '#FFD9A8'); g.addColorStop(1, '#F2A6C2')
        c.fillStyle = g
        c.beginPath(); c.arc(W * 0.5, cy, rad, 0, 6.3); c.fill()
        c.strokeStyle = 'rgba(255,255,255,.7)'
        c.lineWidth = rad * 0.1
        c.beginPath(); c.ellipse(W * 0.5, cy, rad * 1.6, rad * 0.4, -0.3, 0, 6.3); c.stroke()
      }
    }
    // QA: where the first obstacle sits, in world units (the opening must stay clear while the how-to chip is up)
    function firstObs () { var o = ents.filter(function (e) { return e.type !== 'star' && e.type !== 'big' })[0]; return o ? o.z : Infinity }
    function drawObs (c, e, x, y, sz, alpha, rot) {
      if (!water) {
        var ang = rot + e.ph + run.t * (0.5 + (e.ph % 1)) * (e.ph > 3 ? -1 : 1)
        if (T.img(ROCK)) { run.spr(c, ROCK, x, y, sz * 1.15, sz * 1.15, { alpha: alpha, rot: ang }); return }
        c.save(); c.globalAlpha = alpha; c.translate(x, y); c.rotate(ang); c.drawImage(rock, -sz / 2, -sz / 2, sz, sz); c.restore()
      } else run.spr(c, eSprite(e), x, y, sz, sz, { alpha: alpha, rot: rot })
    }

    return { update: update, draw: draw, resize: geo, layers: water ? ['gradient', 'glow', 'waves-swell', 'waves-mid', 'waves-glint', 'clouds', 'islands', 'wake', 'boat'] : ['gradient', 'nebula', 'stars-far', 'stars-mid', 'stars-near', 'planets', 'asteroids', 'trail', 'rocket', 'pad-orbit'], get lane () { return null }, obs0: firstObs() }
  }
  T.engine('water', { assets: function (l) { return assets(l, 'water') }, make: function (run) { return make(run, 'water') } })
  T.engine('space', { assets: function (l) { return assets(l, 'space') }, make: function (run) { return make(run, 'space') } })
})(window)
