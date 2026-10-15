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

  T.skins.sky = {
    cat: 'udara',
    assets: function () { return ['lib:nature/cloud', 'lib:game/hot-air-balloon', 'lib:tk-world/storm-cloud', 'lib:game/gem-blue'] },
    obs: ['balloon', 'storm'],
    keys: { balloon: 'lib:game/hot-air-balloon', storm: 'lib:tk-world/storm-cloud' },
    big: 'lib:game/gem-blue',
    laneCol: '255,255,255',
    zoneLine: 'Angin kencang! Tekan TURBO saat lingkarannya merah!',
    layers: ['gradient', 'stars', 'clouds-far', 'clouds-mid', 'clouds-near', 'plane'],
    bg: function (c, run, Z, G) {
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
    layers: ['gradient', 'clouds', 'far-balloons', 'bunting', 'confetti', 'plane'],
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
})(window)
