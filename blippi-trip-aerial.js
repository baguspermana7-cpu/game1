/* G32 Blippi -- BALAP PESAWAT (owner 2026-10-18): an air race seen from above the clouds. The owner: "bener2 immersive,
 * langitnya seolah itu pov dari atas awan, terlihat daratan dan laut, accurate, detail". The racers are the owner's
 * Planes pack (fleet 'balap', tools/ingest-planes.py), each with straight / left / right banking poses.
 *
 * The world under the plane, drawn far to near:
 *   ground   a procedural map (no tiles repeat): fbm height -> deep sea, shallow sea, surf, beach, farm fields in a
 *            patchwork with hedgerows, rivers, towns with street grids, forest, rock, snow; hill-shaded from the sun.
 *            Rendered at low resolution into chunk canvases (one row slice per frame, never a frame spike) and scaled up.
 *   shadows  each cloud's shadow on the ground, offset away from the sun, moving with the ground
 *   haze     aerial perspective: the ground fades toward the sky colour (it is kilometres below)
 *   deck     a broken cloud deck between the ground and the plane (faster than the ground: parallax = height)
 *   glint    the sun's reflection on the sea, a moving sparkle band
 *   fg       (over the plane) thin wisps rushing past, the speed of the race
 * Everything moves by world z (Z * G.pyu), so the scenery scrolls exactly with the obstacles. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  T.skins = T.skins || {}

  // fallback racers: the UDARA pack, only if data/blippi-fleet-balap.js (the owner's planes) did not load
  w.BlippiFleet = w.BlippiFleet || {}
  if (!w.BlippiFleet.balap && w.BlippiFleet.udara) {
    var RACERS = ['crop-duster', 'aerobatic-monoplane', 'vintage-biplane', 'delta-canard-jet', 'supersonic-recon-jet', 'business-jet', 'twin-boom-pusher', 'flying-wing', 'concorde', 'long-wing-glider', 'float-seaplane', 'ultralight-trike', 'regional-turboprop', 'vintage-dc-3']
    var U = w.BlippiFleet.udara
    w.BlippiFleet.balap = { frameMs: U.frameMs, dir: 'udara', placeholder: true, items: RACERS.map(function (id) { return U.items.filter(function (x) { return x.id === id })[0] }).filter(Boolean) }
  }

  // ---- deterministic noise (integer hash, no Math.random: the map must be the same every frame and every visit) ----
  function ih (x, y, s) {
    var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  function vnoise (x, y, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    var a = ih(xi, yi, s), b = ih(xi + 1, yi, s), c = ih(xi, yi + 1, s), d = ih(xi + 1, yi + 1, s)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  function fbm (x, y, s, oct) {
    var t = 0, amp = 0.5, f = 1, n = 0, i
    for (i = 0; i < oct; i++) { t += vnoise(x * f, y * f, s + i * 17) * amp; n += amp; amp *= 0.5; f *= 2.03 }
    return t / n
  }
  function hash (i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
  function wrap (v, m) { return ((v % m) + m) % m }
  function mix (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] }
  function hex (h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255] }

  // ---- the four worlds: where the sea is, how high the land goes, the light ----
  // sea: sea level on the 0..1 height; coast: how strongly the left of the map is pushed under water (a coastline run);
  // relief: mountain height; snow: snow line (> 1 = none); town / river: how much of each; time: the light
  var WORLD = {
    coast: { sea: 0.47, coast: 0.42, relief: 0.55, snow: 9, town: 0.62, river: 1, seed: 11,
      deep: '#1D5C8E', shallow: '#4FB3CF', sand: '#E9DBA8', fields: ['#9CC66A', '#B5CF72', '#D8CB84', '#86B95C', '#A9C463', '#C9B977'], forest: '#3F7A3D', rock: '#8E8676',
      sky: ['#9FD3FF', '#E3F4FF'], haze: '205,230,250', sun: [0.78, 0.12], grade: null },
    mountain: { sea: 0.24, coast: 0.05, relief: 1.35, mask: 0.42, snow: 0.8, rock: 0.5, town: 0.35, river: 1, seed: 23,
      deep: '#24577F', shallow: '#5AA7C4', sand: '#D9D0A8', fields: ['#8DBB5E', '#A3C468', '#B8C478', '#7CAE55', '#C2BE7D'], forest: '#2F6B3A', rock: '#9A8A74',
      sky: ['#8EC8FF', '#E8F5FF'], haze: '210,232,252', sun: [0.25, 0.1], grade: null },
    islands: { sea: 0.6, coast: 0, relief: 0.6, snow: 9, town: 0.2, river: 0, seed: 37,
      deep: '#0F6A9A', shallow: '#3FD0D6', sand: '#F3E6B6', fields: ['#7CC25A', '#93CF62', '#6DB453'], forest: '#2E8A45', rock: '#8F8A72',
      sky: ['#8FDAFF', '#E6FBFF'], haze: '200,240,250', sun: [0.7, 0.14], grade: null, reef: true },
    sunset: { sea: 0.4, coast: 0.25, relief: 0.6, snow: 9, town: 0.82, river: 1, seed: 53,
      deep: '#1F4F86', shallow: '#4C93BF', sand: '#E8C59A', fields: ['#9BB86A', '#B6B870', '#CDB27A', '#8BAA5E', '#C4A472'], forest: '#3E6A3C', rock: '#8C7A6C',
      sky: ['#FFB27A', '#FFE2B8'], haze: '255,190,140', sun: [0.2, 0.08], grade: 'rgba(255,140,70,.16)', glint: '255,190,120' }
  }
  function worldOf (lvl) { return WORLD[(lvl.theme && lvl.theme.world) || 'coast'] || WORLD.coast }

  // ---- ground generator: chunks of RES x ROWS map pixels, one slice of rows per call ----
  // RES map pixels across the screen: about one per 2 screen px (a tablet gets more, a small phone less); every
  // feature size is written for 168 across and scaled by Q, so the world looks the same at any RES
  var ROWS = 64, SLICE = 3, LIGHT = [-0.55, -0.6, 0.58]
  function makeGround (WD, RES) {
    var Q = 168 / RES
    var P = { deep: hex(WD.deep), shallow: hex(WD.shallow), sand: hex(WD.sand), forest: hex(WD.forest), rock: hex(WD.rock), snow: [244, 246, 249], fields: WD.fields.map(hex),
      foam: [250, 252, 255], river: mix(hex(WD.shallow), hex(WD.deep), 0.35), roof: [[196, 92, 70], [214, 120, 84], [186, 180, 172], [150, 150, 158], [232, 226, 214]], street: [168, 164, 160] }
    var chunks = {}, queue = []
    // height at map pixel (x across the screen 0..RES, v upward along the flight)
    function height (x, v) {
      var nx = x / RES
      x *= Q; v *= Q
      var h = fbm(x / 70, v / 70, WD.seed, 4)
      h += (fbm(x / 22, v / 22, WD.seed + 5, 3) - 0.5) * 0.12
      h -= (0.5 - nx) * WD.coast + (WD.coast ? 0.08 * Math.sin(v / 160) * WD.coast : 0)   // the coast bends in and out
      var m = fbm(x / 48 + 9, v / 48, WD.seed + 9, 4)
      var mk = WD.mask || 0.5
      if (m > mk) {
        // ridged noise inside the mountain mask: sharp crests and valleys, the way ranges look from above
        var rg = 1 - Math.abs(fbm(x / 13 + 300, v / 13, WD.seed + 61, 4) * 2 - 1)
        h += Math.pow((m - mk) / (1 - mk), 1.4) * (0.3 + 0.35 * rg * rg) * WD.relief
      }                     // ridges where the mountain mask rises
      return h
    }
    // every boundary (coast, beach, forest edge, rock, snow line, river bank) is a short smooth blend over its
    // threshold, not a hard per-pixel switch: scaled up 2x by the canvas, a hard switch reads as stair steps
    function ss (a, b, t) { t = (t - a) / (b - a); t = t < 0 ? 0 : t > 1 ? 1 : t; return t * t * (3 - 2 * t) }
    function seaCol (x, v, h, s) {
      var d = Math.min(1, Math.max(0, (s - h) / 0.22))
      var c = mix(P.shallow, P.deep, Math.pow(d, 0.7))
      if (WD.reef && d < 0.2 && ih(x >> 1, v >> 1, 3) > 0.55) c = mix(c, [120, 230, 220], 0.35)   // lagoon reef patches
      var wv = vnoise(x / 3, v / 1.6, WD.seed + 3)                                                 // wave texture
      if (wv > 0.8) c = mix(c, [255, 255, 255], (wv - 0.8) * 0.7)
      return mix(c, P.foam, ss(s - 0.016, s - 0.002, h) * (0.6 + 0.4 * ih(x, v, 7)))               // the surf line
    }
    function fieldCol (x, v, e) {
      // farm fields: a patchwork on a slightly rotated grid, each field its own crop colour, hedgerows between
      var fx = x * 0.96 + v * 0.28, fy = v * 0.96 - x * 0.28
      var cx = Math.floor(fx / 7), cy = Math.floor(fy / 9), ex = fx - cx * 7, ey = fy - cy * 9
      var c = P.fields[Math.floor(ih(cx, cy, WD.seed) * P.fields.length)]
      if (ih(cx, cy, 4) > 0.7) c = mix(c, [255, 255, 255], 0.1 * Math.sin(fx * 1.7) * Math.sin(fx * 1.7))   // plough lines
      var dd = Math.min(ex, 7 - ex, ey, 9 - ey), hg = 1 - ss(0.25 * Q, 1.15 * Q, dd)
      if (hg > 0) c = mix(c, P.forest, 0.5 * hg)
      // towns: blocks of roofs on a street grid where the town mask is high, near the coast and the rivers
      var tm = fbm(x / 26 + 70, v / 26, WD.seed + 31, 3), tt = ss(1 - WD.town * 0.42, 1 - WD.town * 0.42 + 0.03, tm) * (1 - ss(0.17, 0.2, e))
      if (tt > 0) {
        var bx = Math.floor(fx / 5), by = Math.floor(fy / 5), sx = fx - bx * 5, sy = fy - by * 5
        var sd = Math.min(sx, sy, 5 - sx, 5 - sy), st2 = 1 - ss(0.3 * Q, 1.0 * Q, sd)
        var rc = P.roof[Math.floor(ih(bx, by, 13) * 5)], rs = 0.88 + 0.24 * ih(Math.floor(fx / 1.6), Math.floor(fy / 1.6), 17)
        c = mix(c, mix([rc[0] * rs, rc[1] * rs, rc[2] * rs], P.street, st2), tt)
      }
      return c
    }
    function landCol (x, v, h, s) {
      var e = h - s
      var c = fieldCol(x, v, e)
      // above the farmland: open meadow (fields stop where the land gets steep and high)
      var md = ss(0.13, 0.22, e)
      if (md > 0) c = mix(c, mix([128, 168, 88], [104, 146, 72], vnoise(x / 5, v / 5, 33)), md)
      var fm = fbm(x / 30 + 40, v / 30, WD.seed + 21, 3)
      var fo = ss(0.54, 0.58, fm) * ss(0.04, 0.07, e)
      if (fo > 0) c = mix(c, mix(P.forest, [30, 70, 34], ih(x, v, 9) * 0.5), fo)   // forest: dark, speckled crowns
      // up the slopes: forest, then bare rock, then snow
      var r0 = WD.rock || 0.34
      var hi = ss(r0 - 0.08, r0, e)
      if (hi > 0) c = mix(c, mix(P.forest, [28, 66, 36], ih(x, v, 19) * 0.4), hi)
      var rk = Math.max(ss(r0, r0 + 0.1, e), ss(WD.snow - 0.1, WD.snow - 0.04, h))
      if (rk > 0) c = mix(c, mix(P.rock, [120, 112, 100], ih(x >> 1, v >> 1, 23) * 0.5), rk)
      var sn = ss(WD.snow - 0.01, WD.snow + 0.03, h + (vnoise(x / 4, v / 4, 29) - 0.5) * 0.03)
      if (sn > 0) c = mix(c, P.snow, sn)
      c = mix(P.sand, c, ss(0.012, 0.028, e))   // the beach
      // rivers: a meandering band where a second noise crosses its middle, down to the sea
      if (WD.river && e < 0.26) {
        var rv = Math.abs(fbm(x / 60 + 200, v / 90, WD.seed + 41, 4) - 0.5), rw = 0.009 + e * 0.004
        var rb = 1 - ss(rw * 0.55, rw * 1.25, rv)
        if (rb > 0) c = mix(c, P.river, rb)
      }
      return c
    }
    function colour (x, v, h, shade, out, o) {
      x *= Q; v *= Q
      var s = WD.sea, c, k = ss(s - 0.004, s + 0.004, h)   // 0 = sea, 1 = land, a pixel-wide blend between
      if (k <= 0) c = seaCol(x, v, h, s)
      else if (k >= 1) { c = landCol(x, v, h, s); c = [c[0] * shade, c[1] * shade, c[2] * shade] }
      else { var l = landCol(x, v, h, s); c = mix(seaCol(x, v, h, s), [l[0] * shade, l[1] * shade, l[2] * shade], k) }
      out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = 255
    }
    function chunk (n) {
      var cv = w.document.createElement('canvas')
      cv.width = RES; cv.height = ROWS
      var ch = { n: n, cv: cv, c: cv.getContext('2d'), row: 0, done: false }
      chunks[n] = ch; queue.push(ch)
      return ch
    }
    // one slice of rows: heights with a one-pixel border for the slope, then the hill shade and the colour
    function work (ch) {
      var r0 = ch.row, r1 = Math.min(ROWS, r0 + SLICE), rows = r1 - r0
      var img = ch.c.createImageData(RES, rows), out = img.data
      var hw = RES + 1, hb = new Float32Array(hw * (rows + 1)), r, x
      for (r = 0; r <= rows; r++) {
        var v = (ch.n + 1) * ROWS - (r0 + r)   // row 0 is the chunk's far (top) edge
        for (x = 0; x < hw; x++) hb[r * hw + x] = height(x, v)
      }
      for (r = 0; r < rows; r++) {
        var vv = (ch.n + 1) * ROWS - (r0 + r)
        for (x = 0; x < RES; x++) {
          var h = hb[r * hw + x], dx = (hb[r * hw + x + 1] - h) * 46 / Q, dy = (hb[(r + 1) * hw + x] - h) * 46 / Q
          var nl = Math.sqrt(dx * dx + dy * dy + 1)
          var sh = 0.72 + 0.55 * ((-dx * LIGHT[0] - dy * LIGHT[1] + LIGHT[2]) / nl)
          colour(x, vv, h, Math.max(0.55, Math.min(1.18, sh)), out, (r * RES + x) * 4)
        }
      }
      ch.c.putImageData(img, 0, r0)
      ch.row = r1
      if (r1 >= ROWS) ch.done = true
    }
    return {
      // make sure chunks a..b exist; run `budget` slices of the nearest unfinished ones
      need: function (a, b, budget) {
        var n
        for (n = a; n <= b; n++) if (!chunks[n]) chunk(n)
        for (n in chunks) if (+n < a - 1) delete chunks[n]
        queue = queue.filter(function (q) { return !q.done && chunks[q.n] === q })
        queue.sort(function (p, q) { return p.n - q.n })
        while (budget-- > 0 && queue.length) { work(queue[0]); if (queue[0].done) queue.shift() }
      },
      res: RES,
      get: function (n) { return chunks[n] || null },
      pending: function () { return queue.length }
    }
  }

  // ---- cloud puffs from above: rounded heaps, sunlit tops, soft grey undersides; and their shadows ----
  function puff (seed, wpx, hpx, dark) {
    var cv = w.document.createElement('canvas')
    cv.width = wpx; cv.height = hpx
    var c = cv.getContext('2d'), i
    for (i = 0; i < 26; i++) {
      var a = hash(seed + i) * 6.283, rr = Math.sqrt(hash(seed + i + 40))
      var x = wpx / 2 + Math.cos(a) * rr * wpx * 0.3, y = hpx / 2 + Math.sin(a) * rr * hpx * 0.26
      var r = Math.min(wpx, hpx) * (0.16 + hash(seed + i + 80) * 0.16)
      var g = c.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r)
      if (dark) { g.addColorStop(0, 'rgba(18,40,62,.34)'); g.addColorStop(1, 'rgba(18,40,62,0)') } else {
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(246,249,252,.95)'); g.addColorStop(0.85, 'rgba(214,224,236,.6)'); g.addColorStop(1, 'rgba(214,224,236,0)')
      }
      c.fillStyle = g
      c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill()
    }
    return cv
  }

  var A = null   // per-run state (built by assets(): the run's world, its ground generator and its cloud canvases)
  function state (run) {
    if (A && A.lvl === run.lvl) return A
    var WD = worldOf(run.lvl)
    var vw = run.W || w.innerWidth || 800
    A = { lvl: run.lvl, WD: WD, ground: makeGround(WD, Math.max(150, Math.min(300, Math.round(vw / 2)))), puffs: [], shadows: [], wisps: [], frame: 0 }
    var i
    for (i = 0; i < 4; i++) { A.puffs.push(puff(i * 31 + WD.seed, 300, 190, false)); A.shadows.push(puff(i * 31 + WD.seed, 300, 190, true)) }
    for (i = 0; i < 2; i++) A.wisps.push(puff(i * 57 + 900, 360, 120, false))
    return A
  }

  // the ground scrolls at GROUND x the obstacle speed, the deck at DECK, the wisps at WISP: height above the ground
  var GROUND = 0.32, DECK = 0.62, WISP = 2.1
  function drawGround (c, run, Z, G, S) {
    var RES = S.ground.res, W = run.W, H = run.H, k = W / RES, chH = ROWS * k
    var off = Z * G.pyu * GROUND + run.t * 2   // a little drift even on the grid, the plane never hangs still
    var nBot = Math.floor(off / chH), nTop = Math.floor((off + H) / chH)
    // two chunks of map kept ready above the screen; one slice every other frame keeps the frame cost flat
    S.ground.need(nBot, nTop + 2, S.warm ? 2 : (S.frame++ & 1))
    c.imageSmoothingEnabled = true
    var n
    for (n = nBot; n <= nTop; n++) {
      var ch = S.ground.get(n)
      var y = H - ((n + 1) * chH - off)
      if (ch && ch.row > 0) c.drawImage(ch.cv, 0, 0, RES, ch.row, 0, Math.floor(y), W, Math.ceil(ch.row * k) + 1)
    }
    if (!S.grain) S.grain = grain()
    if (S.grain) {
      c.save(); c.globalAlpha = 0.5; c.globalCompositeOperation = 'overlay'
      c.translate(0, wrap(off, 128)); c.fillStyle = S.grain; c.fillRect(0, -128, W, H + 128); c.restore()
    }
    return off
  }
  // a 128 px tile of fine grain (crop rows, tree crowns, roofs at screen resolution): drawn in 'overlay' it adds detail
  // the low-resolution map cannot hold, and it scrolls with the ground
  function grain () {
    try {
      var cv = w.document.createElement('canvas'); cv.width = cv.height = 128
      var c = cv.getContext('2d'), im = c.createImageData(128, 128), d = im.data, i
      for (i = 0; i < 128 * 128; i++) { var v = 128 + (ih(i & 127, i >> 7, 77) - 0.5) * 70 + (vnoise((i & 127) / 3, (i >> 7) / 3, 78) - 0.5) * 50; d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v; d[i * 4 + 3] = 255 }
      c.putImageData(im, 0, 0)
      return c.createPattern(cv, 'repeat')
    } catch (e) { return null }
  }
  function drawShadows (c, run, off, S) {
    var W = run.W, H = run.H, gap = H * 0.42, sx = W * 0.07, sy = H * 0.05
    var first = Math.floor(off / gap) - 1, i
    for (i = first; i < first + Math.ceil(H / gap) + 3; i++) {
      if (hash(i * 3 + S.WD.seed) < 0.35) continue
      var y = H - (i * gap - off) + sy, x = hash(i + 11) * W * 1.1 - W * 0.05 + sx, s = W * (0.32 + hash(i + 23) * 0.3)
      c.globalAlpha = 0.6
      c.drawImage(S.shadows[i & 3], x - s / 2, y - s * 0.32, s, s * 0.63)
    }
    c.globalAlpha = 1
  }
  function drawDeck (c, run, Z, G, S, alpha) {
    var W = run.W, H = run.H, gap = H * 0.42, off = Z * G.pyu * DECK + run.t * 5
    var first = Math.floor(off / gap) - 1, i
    for (i = first; i < first + Math.ceil(H / gap) + 3; i++) {
      if (hash(i * 3 + S.WD.seed) < 0.35) continue
      var y = H - (i * gap - off), x = hash(i + 11) * W * 1.1 - W * 0.05, s = W * (0.32 + hash(i + 23) * 0.3)
      c.globalAlpha = alpha * (0.78 + hash(i + 5) * 0.22)
      c.drawImage(S.puffs[i & 3], x - s / 2, y - s * 0.32, s, s * 0.63)
    }
    c.globalAlpha = 1
  }

  function bunting (c, run, y, sc) {
    var W = run.W, cols = ['#E2463F', '#FFD24A', '#3FA9F5', '#5BC46A', '#FF8A3D'], n = 12, i
    c.strokeStyle = 'rgba(60,60,60,.6)'; c.lineWidth = 2
    c.beginPath(); c.moveTo(0, y); c.quadraticCurveTo(W / 2, y + 24 * sc, W, y); c.stroke()
    for (i = 0; i < n; i++) {
      var t = (i + 0.5) / n, x = t * W, yy = y + 4 * t * (1 - t) * 24 * sc
      c.fillStyle = cols[i % cols.length]
      c.beginPath(); c.moveTo(x - 9 * sc, yy); c.lineTo(x + 9 * sc, yy); c.lineTo(x, yy + 20 * sc); c.closePath(); c.fill()
    }
  }
  // an air-race pylon: a tall inflatable cone, two colour bands, a soft ground shadow (seen from above it is a ring + cone)
  function pylon (c, x, y, s, col) {
    c.fillStyle = 'rgba(10,30,50,.18)'
    c.beginPath(); c.ellipse(x + s * 0.5, y + s * 0.35, s * 0.42, s * 0.2, 0.4, 0, 6.3); c.fill()
    var g = c.createLinearGradient(x - s * 0.3, 0, x + s * 0.3, 0)
    g.addColorStop(0, col); g.addColorStop(0.55, '#FFFFFF'); g.addColorStop(1, col)
    c.fillStyle = g
    c.beginPath(); c.moveTo(x - s * 0.3, y + s * 0.2); c.lineTo(x - s * 0.08, y - s * 0.95); c.lineTo(x + s * 0.08, y - s * 0.95); c.lineTo(x + s * 0.3, y + s * 0.2); c.closePath(); c.fill()
    c.fillStyle = col
    c.fillRect(x - s * 0.2, y - s * 0.45, s * 0.4, s * 0.14)
    c.beginPath(); c.ellipse(x, y + s * 0.2, s * 0.3, s * 0.09, 0, 0, 6.3); c.fill()
  }
  function opening (run) { return run.progress < 0.075 ? run.progress / 0.075 : -1 }
  function arrival (run) { if (run.progress <= 0.9) return -1; var o = Math.min(1, (run.progress - 0.9) / 0.1); return o * o * (3 - 2 * o) }

  T.skins.aerial = {
    cat: 'balap',
    assets: function (lvl) {
      A = null
      state({ lvl: lvl })
      // the first screens of map, generated while the art loads (the race starts on a finished ground)
      A.ground.need(0, 6, 0)
      while (A.ground.pending()) A.ground.need(0, 6, 8)
      return ['lib:tk-prop/seagull', 'lib:game/hot-air-balloon', 'lib:tk-world/storm-cloud', 'lib:game/gem-blue']
    },
    obs: ['gull', 'balloon', 'storm'],
    keys: { gull: 'lib:tk-prop/seagull', balloon: 'lib:game/hot-air-balloon', storm: 'lib:tk-world/storm-cloud' },
    big: 'lib:game/gem-blue',
    laneCol: '255,255,255',
    zoneLine: 'Angin dari belakang! Tekan TURBO saat lingkarannya merah!',
    layers: ['ground-map', 'cloud-shadows', 'haze', 'sea-glint', 'cloud-deck', 'plane', 'wisps'],
    // the start: the plane climbs out of a white cloud bank; the finish: two race pylons with a chequered banner
    ends: function (c, run, G) {
      var S = state(run), W = run.W, H = run.H, k = opening(run), i
      if (k >= 0) {
        var a = 1 - k
        c.globalAlpha = a * 0.92
        c.fillStyle = '#F4F8FC'
        c.fillRect(0, H * (0.55 + k * 0.6), W, H)
        for (i = 0; i < 9; i++) {
          var s = W * (0.45 + hash(i + 3) * 0.3)
          c.drawImage(S.puffs[i & 3], hash(i) * W - s / 2, H * (0.45 + k * 0.6) + hash(i + 9) * H * 0.2 - s * 0.3, s, s * 0.63)
        }
        c.globalAlpha = 1
      }
      var o = arrival(run)
      if (o >= 0) {
        var ay = -80 + o * (G.py - G.ps * 1.9 + 80), ps = G.ps * 1.3
        pylon(c, W * 0.14, ay, ps, '#E2463F'); pylon(c, W * 0.86, ay, ps, '#E2463F')
        var sq = Math.max(8, W * 0.022), x
        for (x = W * 0.14; x < W * 0.86; x += sq) {
          c.fillStyle = Math.floor((x - W * 0.14) / sq) % 2 ? '#1F2328' : '#FFFFFF'
          c.fillRect(x, ay - ps * 0.85, Math.min(sq, W * 0.86 - x), sq)
          c.fillStyle = Math.floor((x - W * 0.14) / sq) % 2 ? '#FFFFFF' : '#1F2328'
          c.fillRect(x, ay - ps * 0.85 + sq, Math.min(sq, W * 0.86 - x), sq)
        }
        bunting(c, run, ay - ps * 0.55, 0.8)
      }
    },
    bg: function (c, run, Z, G) {
      var S = state(run), WD = S.WD, W = run.W, H = run.H
      S.warm = run.progress < 0.02
      c.fillStyle = WD.sky[0]; c.fillRect(0, 0, W, H)
      var off = drawGround(c, run, Z, G, S)
      drawShadows(c, run, off, S)
      // aerial perspective: the ground is far below, so it is lighter and bluer toward the top of the screen (further off)
      var hz = c.createLinearGradient(0, 0, 0, H)
      hz.addColorStop(0, 'rgba(' + WD.haze + ',.5)'); hz.addColorStop(0.45, 'rgba(' + WD.haze + ',.24)'); hz.addColorStop(1, 'rgba(' + WD.haze + ',.12)')
      c.fillStyle = hz; c.fillRect(0, 0, W, H)
      // the sun's glint: a bright soft spot and a sparkle band that slides as the plane moves
      var gx = WD.sun[0] * W + Math.sin(run.t * 0.1) * W * 0.02, gy = WD.sun[1] * H + H * 0.3
      var gl = c.createRadialGradient(gx, gy, 0, gx, gy, W * 0.5)
      var gc = WD.glint || '255,248,228'
      gl.addColorStop(0, 'rgba(' + gc + ',.42)'); gl.addColorStop(0.4, 'rgba(' + gc + ',.12)'); gl.addColorStop(1, 'rgba(' + gc + ',0)')
      c.globalCompositeOperation = 'lighter'
      c.fillStyle = gl; c.fillRect(0, 0, W, H)
      if (!run.reduced()) {
        var i
        c.fillStyle = '#FFFFFF'
        for (i = 0; i < 26; i++) {
          var px = gx + (hash(i) - 0.5) * W * 0.55, py = gy + (hash(i + 30) - 0.5) * H * 0.4
          var tw = Math.sin(run.t * (3 + hash(i + 60) * 4) + i * 2.1)
          if (tw > 0.75) { c.globalAlpha = (tw - 0.75) * 2.4; c.fillRect(px, py, 2, 2) }
        }
        c.globalAlpha = 1
      }
      c.globalCompositeOperation = 'source-over'
      if (WD.grade) { c.fillStyle = WD.grade; c.fillRect(0, 0, W, H) }
      drawDeck(c, run, Z, G, S, 0.9)
    },
    // over the plane: a few thin wisps rushing past (speed); never more than a light veil, the race stays readable
    fg: function (c, run, Z, G) {
      if (run.reduced()) return
      var S = state(run), W = run.W, H = run.H, gap = H * 0.9, off = Z * G.pyu * WISP + run.t * 30
      var first = Math.floor(off / gap) - 1, i
      for (i = first; i < first + 3; i++) {
        if (hash(i * 7 + 2) < 0.45) continue
        var y = H - (i * gap - off), x = hash(i + 41) < 0.5 ? W * 0.12 : W * 0.88, s = W * 0.5
        c.globalAlpha = 0.28
        c.drawImage(S.wisps[i & 1], x - s / 2, y - s * 0.17, s, s * 0.33)
      }
      c.globalAlpha = 1
    },
    debug: function () { return A ? { world: A.lvl && A.lvl.theme && A.lvl.theme.world, pending: A.ground.pending() } : null }
  }
})(window)
