/* G32 Blippi -- RICH WORLDS, shared toolkit (owner 2026-10-20: "SEA, AIR and OUTER SPACE arenas are very, very lacking in richness").
 * The three top-down arenas (AIR = water, UDARA = sky, ANGKASA = space) get procedural worlds with many parallax depths, ambient
 * life, light and weather. No image assets: every sprite is drawn once into a small cached canvas and blitted per frame; every
 * scrolling band is baked once per screen size (same trick as the water bands in blippi-trip-top.js).
 * Modules: blippi-trip-rich-sea.js (T.rich.sea), -sky.js (T.rich.sky), -space.js (T.rich.space). Each returns a world object
 * { layers, ...draw hooks } the engine calls; nothing here can fail a run (a missing module falls back to the old scenery).
 * Rules: no Math.random inside a frame except to schedule a rare event (lightning, a comet); everything else is a hash of an
 * index, so the scene never shimmers. `lite` (render scale < 0.75) drops the ambient extras first. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  var R = T.rich = { cache: {} }

  R.hash = function (i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
  R.wrap = function (v, m) { return ((v % m) + m) % m }
  R.rgb = function (h) { var n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255] }
  R.mix = function (a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] }
  R.css = function (c, a) { return 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a == null ? 1 : a) + ')' }
  R.lite = function (run) { return run.scale < 0.75 }
  R.doc = function () { return w.document }

  // a canvas drawn once: w x h logical px at 2x
  R.mk = function (wd, ht, fn, q) {
    q = q || 2
    var cv = w.document.createElement('canvas')
    cv.width = Math.max(1, Math.ceil(wd * q)); cv.height = Math.max(1, Math.ceil(ht * q))
    var x = cv.getContext('2d'); x.scale(q, q)
    fn(x, wd, ht)
    cv.lw = wd; cv.lh = ht
    return cv
  }
  // cached sprite by key (shared by every run)
  R.sprite = function (key, wd, ht, fn, q) { return R.cache[key] || (R.cache[key] = R.mk(wd, ht, fn, q)) }
  // blit a cached sprite centred at (x, y), logical size sw x sh (default its own), rotated, faded
  R.put = function (c, cv, x, y, sw, sh, rot, a) {
    sw = sw || cv.lw; sh = sh || cv.lh
    if (!rot && (a == null || a >= 1)) { c.drawImage(cv, x - sw / 2, y - sh / 2, sw, sh); return }
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (a != null) c.globalAlpha = a
    c.drawImage(cv, -sw / 2, -sh / 2, sw, sh); c.restore()
  }

  // ---- tileable value noise (period p lattice cells): ground maps repeat without a seam ----
  function ih (x, y, s) {
    var h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296
  }
  R.pnoise = function (x, y, p, s) {
    var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf)
    var x0 = ((xi % p) + p) % p, x1 = (x0 + 1) % p, y0 = ((yi % p) + p) % p, y1 = (y0 + 1) % p
    var a = ih(x0, y0, s), b = ih(x1, y0, s), c = ih(x0, y1, s), d = ih(x1, y1, s)
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
  }
  R.pfbm = function (x, y, p, s, oct) {
    var t = 0, amp = 0.5, n = 0, i
    for (i = 0; i < oct; i++) { t += R.pnoise(x, y, p, s + i * 17) * amp; n += amp; amp *= 0.5; x *= 2; y *= 2; p *= 2 }
    return t / n
  }

  // ---- a screen-sized scrolling band: the tile baked once into a screen-plus-one-tile canvas, then ONE drawImage ----
  // st = the world's state (bands cache), yoff = scroll in px (any size, wraps), xoff = sideways parallax px
  R.band = function (st, c, run, key, tile, size, yoff, xoff, a) {
    var k = run.dpr * run.scale
    var bw = Math.ceil(run.W / size + 2) * size, bh = Math.ceil(run.H / size + 2) * size
    var id = bw + 'x' + bh + '@' + k
    var b = st.bands[key]
    if (!b || b.id !== id) {
      var cv = w.document.createElement('canvas')
      cv.width = Math.ceil(bw * k); cv.height = Math.ceil(bh * k)
      var x = cv.getContext('2d'); x.scale(k, k)
      x.fillStyle = x.createPattern(tile, 'repeat'); x.fillRect(0, 0, bw, bh)
      b = st.bands[key] = { id: id, cv: cv }
    }
    var ox = R.wrap(xoff || 0, size) - size, oy = R.wrap(yoff || 0, size) - size
    if (a != null && a < 1) { c.globalAlpha = a; c.drawImage(b.cv, ox, oy, bw, bh); c.globalAlpha = 1 } else c.drawImage(b.cv, ox, oy, bw, bh)
  }
  // a full-screen layer baked once per size and blitted (static gradients, tints, vignettes). q < 1 bakes it smaller: soft layers
  // (rays, vignette) cost a quarter of the memory at q = 0.5, and every big canvas counts: past about nine full-screen canvases the
  // software rasteriser fell off its fast path (frame work 20 ms instead of 1 ms), so soft layers are baked at half size
  R.full = function (st, c, run, key, fn, a, q) {
    q = q || 1
    var k = run.dpr * run.scale * q, id = run.W + 'x' + run.H + '@' + k
    var b = st.bands[key]
    if (!b || b.id !== id) {
      var cv = w.document.createElement('canvas')
      cv.width = Math.ceil(run.W * k); cv.height = Math.ceil(run.H * k)
      var x = cv.getContext('2d'); x.scale(k, k); fn(x, run.W, run.H)
      b = st.bands[key] = { id: id, cv: cv }
    }
    if (a != null && a < 1) { c.globalAlpha = a; c.drawImage(b.cv, 0, 0, run.W, run.H); c.globalAlpha = 1 } else c.drawImage(b.cv, 0, 0, run.W, run.H)
  }

  // ---- god rays: soft diagonal wedges of light from the sun's side, baked once, drifting slowly ----
  R.rays = function (st, c, run, col, a, sx, n) {
    n = n || 5
    R.full(st, c, run, 'rays', function (x, W, H) {
      var i, m
      for (i = 0; i < n; i++) {
        var bx = sx * W + (i - n / 2) * W * 0.16, wd0 = W * (0.05 + R.hash(i + 3) * 0.07)
        var g = x.createLinearGradient(sx * W, 0, bx + (bx - sx * W) * 1.6, H)
        g.addColorStop(0, R.css(col, 0.5)); g.addColorStop(1, R.css(col, 0))
        x.fillStyle = g
        // three nested wedges: a bright core and soft edges (one hard wedge read as a stripe)
        for (m = 1; m >= 0.3; m -= 0.35) {
          var wd = wd0 * m
          x.beginPath(); x.moveTo(sx * W - wd * 0.15, -10); x.lineTo(sx * W + wd * 0.15, -10); x.lineTo(bx + wd * 3 + (bx - sx * W) * 1.6, H); x.lineTo(bx - wd * 3 + (bx - sx * W) * 1.6, H); x.closePath(); x.fill()
        }
      }
    }, null, 0.5)
    c.globalAlpha = a * 0.55 * (0.78 + 0.22 * Math.sin(run.t * 0.5))
    c.drawImage(st.bands.rays.cv, Math.sin(run.t * 0.17) * 14, 0, run.W, run.H)
    c.globalAlpha = 1
  }

  // ---- lightning: a rare event scheduled with Math.random (never per frame), a flash that decays and a jagged bolt ----
  R.storm = function () { return { next: 2.5 + Math.random() * 3, at: -9, bolt: null, fl: 0 } }
  R.stormStep = function (s, run) {
    if (run.t > s.next) {
      s.at = run.t; s.next = run.t + 4.5 + Math.random() * 5
      var x = run.W * (0.15 + Math.random() * 0.7), y = -10, pts = [[x, y]], i
      for (i = 0; i < 9; i++) { x += (Math.random() - 0.5) * run.W * 0.16; y += run.H * (0.07 + Math.random() * 0.05); pts.push([x, y]) }
      s.bolt = pts
    }
    var age = run.t - s.at
    s.fl = age < 0.55 ? (age < 0.08 ? 1 : age < 0.18 ? 0.35 : age < 0.26 ? 0.8 : Math.max(0, 0.5 - (age - 0.26) * 1.7)) : 0
    return s.fl
  }
  R.drawBolt = function (c, s, run) {
    if (!s.bolt || run.t - s.at > 0.3) return
    var i, p = s.bolt
    c.lineJoin = 'round'
    c.strokeStyle = 'rgba(200,215,255,.5)'; c.lineWidth = 9
    c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.stroke()
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 3
    c.beginPath(); c.moveTo(p[0][0], p[0][1]); for (i = 1; i < p.length; i++) c.lineTo(p[i][0], p[i][1]); c.stroke()
    // one fork
    var m = p[4]; c.lineWidth = 2; c.beginPath(); c.moveTo(m[0], m[1]); c.lineTo(m[0] + run.W * 0.1, m[1] + run.H * 0.07); c.lineTo(m[0] + run.W * 0.07, m[1] + run.H * 0.15); c.stroke()
  }

  // ---- shared little sprites ----
  // a gull / bird seen from above: two swept wings; flap = 0..1 squashes the span
  R.bird = function (col) {
    return R.sprite('bird' + col, 30, 18, function (x) {
      x.fillStyle = col; x.beginPath(); x.moveTo(15, 5)
      x.quadraticCurveTo(8, 1, 1, 7); x.quadraticCurveTo(8, 6, 13, 9); x.lineTo(15, 14)
      x.lineTo(17, 9); x.quadraticCurveTo(22, 6, 29, 7); x.quadraticCurveTo(22, 1, 15, 5); x.fill()
    })
  }
  // draw a bird at (x,y) heading `rot` with a wing flap; size s
  R.flap = function (c, cv, x, y, s, rot, t, ph) {
    var f = 0.55 + 0.45 * Math.abs(Math.sin(t * 7 + ph))
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(f, 1); c.drawImage(cv, -s / 2, -s * 0.3, s, s * 0.6); c.restore()
  }
  // a soft round glow, additive-looking, baked per colour
  R.glow = function (col, rad) {
    return R.sprite('glow' + col + rad, rad * 2, rad * 2, function (x) {
      var g = x.createRadialGradient(rad, rad, 0, rad, rad, rad)
      g.addColorStop(0, 'rgba(' + col + ',1)'); g.addColorStop(0.35, 'rgba(' + col + ',.35)'); g.addColorStop(1, 'rgba(' + col + ',0)')
      x.fillStyle = g; x.fillRect(0, 0, rad * 2, rad * 2)
    }, 1)
  }
  // a smoothly sliding sideways drift of the whole world with the steering (px = 0..1 plane position)
  R.par = function (px, k) { return (0.5 - px) * k }
})(window)
