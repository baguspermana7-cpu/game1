/* G32 Blippi -- sky skins for the top-down journey engine (blippi-trip-top.js), owner 2026-10-15:
 *   sky    UDARA: the child's own aircraft from behind (25-aircraft animated pack), clouds at three depths, stars at night
 *   paper  PESAWAT KERTAS FESTIVAL: the child's own paper plane (25-paper-plane pack) over a festival sky: bunting lines,
 *          drifting confetti, far balloons and kites; obstacles are kites and balloons
 * A skin = { cat (its fleet), assets(lvl), obs (obstacle types), keys (type -> art), big (the 2-star pickup), laneCol,
 * zoneLine, layers, bg(c, run, Z, G) }. The engine draws the vehicle, rivals, pickups, gates and lanes; the skin only the
 * world behind them. Everything moves by world z (Z * G.pyu px), so it scrolls exactly with the obstacles. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  T.skins = T.skins || {}

  // deterministic scatter (no Math.random in a frame: the scene must not shimmer)
  function hash (i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x) }
  function wrap (v, m) { return ((v % m) + m) % m }

  function gradient (c, run, top, bottom) {
    var g = c.createLinearGradient(0, 0, 0, run.H)
    g.addColorStop(0, top); g.addColorStop(1, bottom)
    c.fillStyle = g
    c.fillRect(0, 0, run.W, run.H)
  }
  // a cloud layer scrolling down with the flight: n clouds over a band of span px, at depth f (0 far .. 1 near)
  function clouds (c, run, Z, G, n, f, size, alpha, seed) {
    var span = run.H + size * 2
    var i
    for (i = 0; i < n; i++) {
      var x = hash(seed + i) * (run.W + size) - size / 2
      var y = wrap(hash(seed + i + 50) * span + Z * G.pyu * f + run.t * 6 * f, span) - size
      var s = size * (0.7 + hash(seed + i + 90) * 0.6)
      run.spr(c, 'lib:nature/cloud', x, y, s * 1.3, s, { alpha: alpha })
    }
  }
  function nightStars (c, run) {
    c.fillStyle = '#FFFFFF'
    var i
    for (i = 0; i < 60; i++) {
      c.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(run.t * 1.3 + i))
      c.fillRect(hash(i + 7) * run.W, hash(i + 77) * run.H, 2, 2)
    }
    c.globalAlpha = 1
  }

  // the opening (first 7.5 %) slides away under the vehicle; the arrival (last 10 %) rises in from the top. Same timing as
  // the space journey's launch pad and destination planet (blippi-trip-top.js drawIntroOutro).
  function opening (run) { return run.progress < 0.075 ? run.progress / 0.075 : -1 }
  function arrival (run) { if (run.progress <= 0.9) return -1; var o = Math.min(1, (run.progress - 0.9) / 0.1); return o * o * (3 - 2 * o) }
  // a top-down runway strip: asphalt, dashed centre line, threshold bars at the far end, edge lights blinking in turn
  function runway (c, run, cx, top, bot, w) {
    c.fillStyle = '#5E6878'
    c.fillRect(cx - w / 2, top, w, bot - top)
    c.fillStyle = '#FFFFFF'
    var y
    for (y = top + 70; y < bot; y += 56) c.fillRect(cx - 3, y, 6, 30)
    var b
    for (b = 0; b < 6; b++) c.fillRect(cx - w / 2 + 8 + b * (w - 16) / 6, top + 10, (w - 16) / 6 - 8, 44)
    var i = 0
    for (y = top + 20; y < bot; y += 48) {
      var on = run.reduced() || Math.floor(run.t * 6 - i * 0.5) % 4 === 0
      c.fillStyle = on ? '#FFE680' : '#C9B45A'
      c.beginPath(); c.arc(cx - w / 2 - 6, y, on ? 5 : 3.5, 0, 6.3); c.arc(cx + w / 2 + 6, y, on ? 5 : 3.5, 0, 6.3); c.fill()
      i++
    }
  }

  T.skins.sky = {
    cat: 'udara',
    assets: function () { return ['lib:nature/cloud', 'lib:game/hot-air-balloon', 'lib:tk-world/storm-cloud', 'lib:game/gem-blue'] },
    obs: ['balloon', 'storm'],
    keys: { balloon: 'lib:game/hot-air-balloon', storm: 'lib:tk-world/storm-cloud' },
    big: 'lib:game/gem-blue',
    laneCol: '255,255,255',
    zoneLine: 'Angin kencang! Tekan TURBO saat lingkarannya merah!',
    layers: ['gradient', 'stars', 'clouds-far', 'clouds-mid', 'clouds-near', 'runway', 'plane'],
    // take-off from the home runway, landing on the destination airport's runway
    ends: function (c, run, G) {
      var W = run.W
      var H = run.H
      var w = G.ps * 1.6
      var k = opening(run)
      if (k >= 0) {
        var gy = G.py - G.ps * 2.4 + k * H * 0.9
        c.fillStyle = '#8CCB72'
        c.fillRect(0, gy - 30, W, H)
        c.fillStyle = '#7AB862'
        var i
        for (i = 0; i < 8; i++) c.fillRect(0, gy + 40 + i * 70, W, 26)
        runway(c, run, W * 0.5, gy, H + 40, w)
      }
      var o = arrival(run)
      if (o >= 0) {
        var bot = -H * 0.2 + o * H * 0.75
        c.fillStyle = '#8CCB72'
        c.fillRect(0, -40, W, bot + 70)
        runway(c, run, W * 0.5, -40, bot, w)
        // approach lights: a row that blinks toward the runway end
        var j
        for (j = 0; j < 5; j++) {
          c.fillStyle = Math.floor(run.t * 8) % 5 === j || run.reduced() ? '#FFFFFF' : 'rgba(255,255,255,.35)'
          c.beginPath(); c.arc(W * 0.5, bot + 18 + j * 22, 5, 0, 6.3); c.fill()
        }
      }
    },
    // UDARA's rich worlds (blippi-trip-rich-sky.js): built once per run; without the module the plain sky below draws
    rich: function (run) {
      if (run._rs === undefined) { try { run._rs = T.rich && T.rich.sky ? T.rich.sky(run, run.lvl.theme) : null } catch (e) { run._rs = null } }
      return run._rs
    },
    layersFor: function (run) { var r = T.skins.sky.rich(run); return r ? r.layers : T.skins.sky.layers },
    fg: function (c, run, Z, G) { var r = T.skins.sky.rich(run); if (r) r.fg(c, run, Z, G) },
    bg: function (c, run, Z, G) {
      var rs = T.skins.sky.rich(run)
      if (rs) { rs.bg(c, run, Z, G); return }
      var th = run.lvl.theme
      var sk = th.sky || ['#BFE6FF', '#EAF7FF']
      gradient(c, run, sk[0], sk[1])
      if (th.night) nightStars(c, run)
      clouds(c, run, Z, G, 5, 0.25, 120, 0.35, 1)
      clouds(c, run, Z, G, 4, 0.55, 190, 0.5, 20)
      clouds(c, run, Z, G, 2, 1.1, 300, 0.3, 40)
    }
  }

  // festival bunting: a sagging string across the screen with paper triangles, scrolling with the flight
  var FLAGS = ['#FF8FB1', '#FFD86B', '#7CE3B0', '#7FB8FF', '#C9A8FF', '#FFB347']
  function bunting (c, run, y, k) {
    var W = run.W
    c.strokeStyle = 'rgba(120,80,40,.55)'
    c.lineWidth = 2
    c.beginPath(); c.moveTo(-10, y); c.quadraticCurveTo(W / 2, y + 40 * k, W + 10, y); c.stroke()
    var n = Math.ceil(W / 46)
    var i
    for (i = 0; i <= n; i++) {
      var t = i / n
      var fx = -10 + (W + 20) * t
      var fy = y + 4 * t * (1 - t) * 40 * k
      var sway = run.reduced() ? 0 : Math.sin(run.t * 3 + i) * 3
      c.fillStyle = FLAGS[i % FLAGS.length]
      c.beginPath(); c.moveTo(fx - 12, fy); c.lineTo(fx + 12, fy); c.lineTo(fx + sway, fy + 26 * k); c.closePath(); c.fill()
    }
  }
  function confetti (c, run, Z, G) {
    if (run.reduced()) return
    var i
    for (i = 0; i < 26; i++) {
      var x = wrap(hash(i + 300) * run.W + Math.sin(run.t * 0.8 + i) * 30, run.W)
      var y = wrap(hash(i + 400) * run.H + Z * G.pyu * 0.7 + run.t * 30, run.H + 20) - 10
      c.save(); c.translate(x, y); c.rotate(run.t * 2 + i)
      c.fillStyle = FLAGS[i % FLAGS.length]
      c.fillRect(-5, -3, 10, 6)
      c.restore()
    }
  }
  T.skins.paper = {
    cat: 'kertas',
    assets: function () { return ['lib:nature/cloud', 'lib:toys/kite', 'lib:gt-el/balloon-red', 'lib:gt-el/balloon-blue', 'lib:game/gem-green'] },
    obs: ['kite', 'balloon-red', 'balloon-blue'],
    keys: { kite: 'lib:toys/kite', 'balloon-red': 'lib:gt-el/balloon-red', 'balloon-blue': 'lib:gt-el/balloon-blue' },
    big: 'lib:game/gem-green',
    laneCol: '255,214,120',
    zoneLine: 'Angin festival! Tekan TURBO saat lingkarannya merah!',
    layers: ['gradient', 'clouds', 'far-balloons', 'bunting', 'confetti', 'stage', 'plane'],
    // launched from the festival stage (planks, a red launch carpet, two flag poles); lands on a big bullseye target
    ends: function (c, run, G) {
      var W = run.W
      var H = run.H
      var k = opening(run)
      if (k >= 0) {
        var gy = G.py - G.ps * 1.2 + k * H * 0.9
        c.fillStyle = '#C98B4E'
        c.fillRect(0, gy, W, H)
        c.fillStyle = '#B07740'
        var y
        for (y = gy + 22; y < H; y += 26) c.fillRect(0, y, W, 3)
        c.fillStyle = '#E2463F'
        c.fillRect(W * 0.5 - G.ps * 0.55, gy - 4, G.ps * 1.1, H)
        c.fillStyle = '#FFD86B'
        c.fillRect(W * 0.5 - G.ps * 0.55, gy - 4, G.ps * 1.1, 6)
        var s
        for (s = -1; s <= 1; s += 2) {
          var fx = W * 0.5 + s * G.ps * 1.25
          c.fillStyle = '#8A5A2B'
          c.fillRect(fx - 3, gy - 60, 6, 64)
          c.fillStyle = s < 0 ? '#FF8FB1' : '#7FB8FF'
          var wv = run.reduced() ? 0 : Math.sin(run.t * 5 + s) * 4
          c.beginPath(); c.moveTo(fx + 3, gy - 60); c.lineTo(fx + 3 + 30 * -s * -1, gy - 52 + wv); c.lineTo(fx + 3, gy - 42); c.closePath(); c.fill()
        }
        bunting(c, run, gy - 70, 0.6)
      }
      var o = arrival(run)
      if (o >= 0) {
        var r = Math.min(W, H) * 0.32
        var cy = -r + o * r * 1.9
        var cols = ['#E2463F', '#FFFFFF', '#FFB347', '#FFFFFF', '#FFD86B']
        var i2
        c.fillStyle = 'rgba(0,0,0,.12)'
        c.beginPath(); c.ellipse(W * 0.5 + 8, cy + 10, r, r * 0.92, 0, 0, 6.3); c.fill()
        for (i2 = 0; i2 < cols.length; i2++) { c.fillStyle = cols[i2]; c.beginPath(); c.ellipse(W * 0.5, cy, r * (1 - i2 * 0.19), r * 0.92 * (1 - i2 * 0.19), 0, 0, 6.3); c.fill() }
        bunting(c, run, cy - r - 10, 0.8)
      }
    },
    bg: function (c, run, Z, G) {
      var sk = run.lvl.theme.sky || ['#FFE3EF', '#E3F3FF']
      gradient(c, run, sk[0], sk[1])
      clouds(c, run, Z, G, 4, 0.25, 130, 0.45, 5)
      // far balloons and kites drift up slowly behind everything (small, faint: scenery, not obstacles)
      var i
      for (i = 0; i < 6; i++) {
        var x = hash(i + 500) * run.W
        var y = wrap(hash(i + 600) * (run.H + 80) + Z * G.pyu * 0.3 - run.t * 12, run.H + 80) - 40
        run.spr(c, i % 3 === 0 ? 'lib:toys/kite' : i % 2 ? 'lib:gt-el/balloon-red' : 'lib:gt-el/balloon-blue', x, y, 34, 34, { alpha: 0.45 })
      }
      // a bunting line every 3 world units, so the festival keeps passing under the plane
      var gap = 3 * G.pyu
      var first = wrap(Z * G.pyu, gap)
      var y0
      for (y0 = first - gap; y0 < run.H + gap; y0 += gap) bunting(c, run, y0, 1)
      confetti(c, run, Z, G)
    }
  }
  // the paper-boat river (owner 2026-10-17, OrigamiShips_25 pack): the child's own paper boat sails a paper river after the
  // rain -- folded-paper water, green paper banks with umbrellas and flower bushes; rubber ducks, leaves, frogs and boots
  // float in the way; a message in a bottle is the big prize. wet: the top engine gives it the wake, foam and lifebuoys.
  var PB_BANK = 0.075   // each bank's width, as a share of the screen: the lanes stay clear of it
  T.skins.paperboat = {
    cat: 'kapalkertas',
    wet: true,
    assets: function () { return ['lib:toys/rubber-duck', 'lib:nature/maple-leaf', 'lib:animals/frog', 'lib:things/rain-boot', 'lib:tk-prop/message-bottle', 'lib:things/umbrella-red', 'lib:real/things/umbrella-yellow', 'lib:mojo-prop/bush-flowers', 'lib:game/lifebuoy'] },
    obs: ['duck', 'leaf', 'frog', 'boot'],
    keys: { duck: 'lib:toys/rubber-duck', leaf: 'lib:nature/maple-leaf', frog: 'lib:animals/frog', boot: 'lib:things/rain-boot' },
    big: 'lib:tk-prop/message-bottle',
    laneCol: '255,255,255',
    zoneLine: 'Arus sungai deras! Tekan TURBO saat lingkarannya merah!',
    layers: ['paper-water', 'folds', 'banks', 'umbrellas', 'boat'],
    // launched from a paper pier (planks, a striped flag); the finish is a bunting arch between two paper flag poles
    ends: function (c, run, G) {
      var W = run.W
      var H = run.H
      var k = opening(run)
      if (k >= 0) {
        var gy = G.py + G.ps * 0.9 + k * H * 0.9
        c.fillStyle = '#E9D2A6'
        c.fillRect(W * 0.3, gy, W * 0.4, H)
        c.fillStyle = '#D2B47E'
        var y
        for (y = gy + 18; y < H; y += 22) c.fillRect(W * 0.3, y, W * 0.4, 3)
        c.fillStyle = '#C49A5C'
        c.fillRect(W * 0.3 - 6, gy, 6, H); c.fillRect(W * 0.7, gy, 6, H)
        var s
        for (s = -1; s <= 1; s += 2) {
          var fx = W * 0.5 + s * W * 0.2
          c.fillStyle = '#8A5A2B'; c.fillRect(fx - 3, gy - 56, 6, 60)
          c.fillStyle = s < 0 ? '#FF9A3C' : '#7FC4EE'
          var wv = run.reduced() ? 0 : Math.sin(run.t * 5 + s) * 4
          c.beginPath(); c.moveTo(fx + 3, gy - 56); c.lineTo(fx + 3 + 30 * s, gy - 48 + wv); c.lineTo(fx + 3, gy - 38); c.closePath(); c.fill()
        }
      }
      var o = arrival(run)
      if (o >= 0) {
        var ay = -60 + o * (G.py - G.ps * 1.6 + 60)
        var pl = W * (PB_BANK + 0.02), pr = W * (1 - PB_BANK - 0.02)
        c.fillStyle = '#8A5A2B'; c.fillRect(pl - 4, ay - 70, 8, 90); c.fillRect(pr - 4, ay - 70, 8, 90)
        bunting(c, run, ay - 66, 1)
        bunting(c, run, ay - 50, 0.8)
      }
    },
    bg: function (c, run, Z, G) {
      var W = run.W
      var H = run.H
      var wt = run.lvl.theme.water || ['#CDEBF7', '#8CC7E6']
      gradient(c, run, wt[0], wt[1])
      // folded-paper water: rows of shallow angular folds (light face + shade face) drifting down with the river
      var gap = 0.9 * G.pyu, first = wrap(Z * G.pyu, gap), y0, i
      for (y0 = first - gap; y0 < H + gap; y0 += gap) {
        var row = Math.round((y0 - first) / gap), seg = W / 7, off = (row % 2) * seg * 0.5
        for (i = -1; i < 8; i++) {
          var x0 = i * seg + off
          c.fillStyle = 'rgba(255,255,255,.22)'
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + seg * 0.5, y0 - gap * 0.18); c.lineTo(x0 + seg, y0); c.closePath(); c.fill()
          c.fillStyle = 'rgba(40,110,160,.10)'
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + seg * 0.5, y0 + gap * 0.16); c.lineTo(x0 + seg, y0); c.closePath(); c.fill()
        }
      }
      // the green paper banks: a zigzag folded edge, a darker fold line, umbrellas and flower bushes passing by
      var bw = W * PB_BANK, zz = 18, side, yy
      for (side = 0; side < 2; side++) {
        var x0b = side ? W - bw : 0, edge = side ? W - bw : bw, dir = side ? -1 : 1
        c.fillStyle = '#8FD07A'
        c.fillRect(x0b, 0, bw, H)
        c.fillStyle = '#7ABF66'
        c.beginPath(); c.moveTo(edge, -zz)
        for (yy = wrap(Z * G.pyu, zz * 2) - zz * 2; yy < H + zz * 2; yy += zz * 2) { c.lineTo(edge + dir * 9, yy); c.lineTo(edge, yy + zz) }
        c.lineTo(edge - dir * bw, H + zz); c.lineTo(edge - dir * bw, -zz); c.closePath(); c.fill()
        c.fillStyle = 'rgba(255,255,255,.35)'
        c.fillRect(side ? edge - 3 : edge - 1, 0, 2, H)
      }
      var step = 2.6 * G.pyu, p0 = wrap(Z * G.pyu, step), k2
      for (k2 = -1; p0 + k2 * step < H + step; k2++) {
        var y = p0 + k2 * step, n = Math.floor((Z * G.pyu - p0) / step) - k2
        var left = hash(n) < 0.5, key = hash(n + 9) < 0.4 ? 'lib:mojo-prop/bush-flowers' : hash(n + 3) < 0.5 ? 'lib:things/umbrella-red' : 'lib:real/things/umbrella-yellow'
        var sz = Math.min(bw * 1.15, 54)
        run.spr(c, key, left ? bw * 0.5 : W - bw * 0.5, y, sz, sz, {})
      }
    }
  }
})(window)
