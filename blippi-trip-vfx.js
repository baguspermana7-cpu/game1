/* G32 Blippi -- trip moments drawn with COMBINATIONS from the shared Dunia VFX database (owner 2026-11-01: "ada banyak database
 * vfx kan, itu optimalkan juga penggunaan dengan kombinasi2"). ../Dunia-Emosi/games/data/vfx-db.js (window.VFXDB) holds 88
 * CC0 effects (flipbook sheets and textures, each with its frame grid, rate, blend and kid-safe flag) and per-element SETS
 * of roles: windup / head / trail / impact / crit / flare, each an effect plus a colour filter. A moment here is a recipe
 * of layered parts taken from those roles: the journey picks its element (AIR and KAPAL KERTAS = water, UDARA and BALAP = flying, ANGKASA = psychic,
 * DARAT = ground, KERTAS = normal) and the gold of a star always comes from the normal set. The parts are drawn on the
 * trip canvas, above the owner's own effect sprites (which stay), frame by frame from the sheet, tinted ONCE into a cached
 * canvas (a canvas filter per frame would cost every frame). Pooled and capped; reduced motion = the flare alone, no
 * motion. No database (offline before it was cached, an old browser) = nothing extra is drawn. */
;(function (w) {
  'use strict'
  var T = w.BlippiTrip
  if (!T) return
  var BASE = '../Dunia-Emosi/assets/vfx/'
  var ELEM = { air: 'water', kapalkertas: 'water', udara: 'flying', balap: 'flying', angkasa: 'psychic', darat: 'ground', kertas: 'normal' }
  var MAX = 28
  var MOMENTS = ['collect', 'combo', 'gift', 'bump', 'shield', 'turbo', 'land', 'finish', 'right']
  var idx = null, img = {}, tint = {}, live = [], canFilter = null, log = [], drawn = 0, peak = 0

  function db () {
    if (idx) return idx
    var d = w.VFXDB
    if (!d || !d.effects || !d.sets) return null
    idx = {}
    for (var i = 0; i < d.effects.length; i++) if (d.effects[i].kid_safe !== false) idx[d.effects[i].id] = d.effects[i]
    return idx
  }
  // a role of an element's set -> { e: effect, f: filter } (or null). The pixel-art packs (px-*) are skipped: blown up to a
  // trip moment they read as blocks; frames whose art fills the whole cell (fill >= 0.97) are skipped too: their edge cuts
  function okE (e) { return e && e.id.indexOf('px-') !== 0 && !(e.frames > 1 && (e.fill || 0) >= 0.97) }
  function role (elem, r) {
    var I = db(), s = I && w.VFXDB.sets[elem], x = s && s[r]
    return x && okE(I[x.id]) ? { e: I[x.id], f: x.filter || '' } : null
  }
  function eff (id, f) { var I = db(); return I && okE(I[id]) ? { e: I[id], f: f || '' } : null }

  // the recipes: [source, size (x the moment's size), seconds, extra] -- source = [set, role] or [effect id, filter], or a
  // list of those (the first the database has, in a drawable style, is used)
  //   dx, dy offset (x size); ring: n copies flying out from r0 to r1 (x size); spin rad/s; delay s; a alpha
  var GOLD = 'sepia(1) saturate(3.4) hue-rotate(5deg)', GREEN = 'sepia(1) saturate(3.2) hue-rotate(60deg)', PINK = 'sepia(1) saturate(3.6) hue-rotate(290deg)'
  var TINT = { water: 'sepia(1) saturate(4.0) hue-rotate(165deg)', flying: 'sepia(1) saturate(2.6) hue-rotate(155deg) brightness(1.10)', psychic: 'sepia(1) saturate(4.0) hue-rotate(280deg)', ground: 'sepia(1) saturate(2.4) hue-rotate(355deg) brightness(0.9)', normal: GOLD }
  function recipe (m, el) {
    var tn = TINT[el] || GOLD
    var puff = el === 'water' ? ['ow-water-ripple', ''] : el === 'ground' ? ['bk-cloud-01', 'sepia(.8) saturate(1.6) brightness(.95)'] : ['bk-cloud-02', '']
    switch (m) {
      case 'collect': return [
        [['normal', 'flare'], 1.3, 0.42, {}],
        [['normal', 'crit'], 0.7, 0.5, { spin: 4 }],
        [['normal', 'crit'], 0.32, 0.55, { ring: [4, 0.15, 0.75] }],
        [garnish(el), 0.9, 0.6, { a: 0.85 }]]
      case 'combo': return [
        [['bk-light-02', GOLD], 1.8, 0.8, {}],
        [['bk-magic-02', PINK], 1.1, 0.8, { spin: 2.5 }],
        [['normal', 'flare'], 1.8, 0.6, {}],
        [['normal', 'crit'], 0.42, 0.75, { ring: [6, 0.2, 1.05], spin: 3 }]]
      case 'gift': return [
        [['bk-light-01', GREEN], 1.6, 0.8, {}],
        [['normal', 'crit'], 0.36, 0.7, { ring: [5, 0.2, 0.95] }],
        [['normal', 'flare'], 1.4, 0.5, {}]]
      case 'bump': return [
        [[[el, 'impact'], puff], 1.35, 0.7, {}],
        el === 'water' ? [['ow-splash-crown', ''], 1.2, 0.55, { dy: -0.15 }] : [['bk-circle-01', tn], 1.0, 0.45, { a: 0.7 }],
        [['_shield', 'impact'], 1.2, 0.4, { a: 0.6 }]]
      case 'shield': return [
        [['bk-circle-03', TINT.water], 1.6, 0.6, {}],
        [['_shield', 'impact'], 1.5, 0.5, {}],
        [['water', 'crit'], 0.34, 0.6, { ring: [6, 0.2, 0.9] }]]
      case 'turbo': return [
        [[el, 'flare'], 1.4, 0.45, {}],
        [[[el, 'trail'], ['flying', 'trail']], 0.9, 0.55, { dx: -0.35, dy: 0.3, spin: -5 }],
        [[[el, 'trail'], ['flying', 'trail']], 0.9, 0.55, { dx: 0.35, dy: 0.3, spin: 5 }],
        [[[el, 'windup'], ['bk-twirl-02', tn]], 1.2, 0.7, { a: 0.75, dy: 0.25 }]]
      case 'land': return [
        [[[el, 'impact'], ['bk-cloud-01', 'sepia(.8) saturate(1.6) brightness(.95)']], 1.3, 0.7, { a: 0.85 }],
        [['bk-cloud-02', 'sepia(.6) saturate(1.3)'], 0.8, 0.6, { dx: -0.4, a: 0.7 }],
        [['bk-cloud-02', 'sepia(.6) saturate(1.3)'], 0.8, 0.6, { dx: 0.4, a: 0.7, delay: 0.05 }]]
      case 'finish': return [
        [['bk-light-03', GOLD], 2.2, 1.1, {}],
        [['normal', 'flare'], 2.4, 0.8, {}],
        [['normal', 'crit'], 0.4, 1.0, { ring: [8, 0.2, 1.3], spin: 2 }],
        [['bk-star-03', GOLD], 0.3, 1.1, { ring: [8, 0.1, 0.9], delay: 0.15 }]]
      case 'right': return [
        [['bk-light-01', GREEN], 1.7, 0.9, {}],
        [['normal', 'crit'], 0.38, 0.8, { ring: [6, 0.2, 1.0] }],
        [['normal', 'flare'], 1.6, 0.55, {}]]
    }
    return null
  }
  function garnish (el) { return el === 'water' ? [['water', 'head'], ['ow-droplets', '']] : el === 'flying' ? ['flying', 'trail'] : el === 'psychic' ? ['psychic', 'head'] : ['normal', 'trail'] }

  function resolve (src) {
    if (!src) return null
    if (typeof src[0] !== 'string') { for (var i = 0; i < src.length; i++) { var r = resolve(src[i]); if (r) return r } return null }
    return w.VFXDB.sets[src[0]] ? role(src[0], src[1]) : eff(src[0], src[1])
  }
  // a sheet, loaded once; a tinted copy, baked once per (sheet, filter)
  function sheet (e) {
    var k = e.id
    if (img[k] !== undefined) return img[k]
    img[k] = null
    var im = new Image()
    im.onload = function () { img[k] = im }
    im.onerror = function () { img[k] = false }
    im.src = BASE + e.id + '.webp'
    return null
  }
  function tinted (e, f) {
    var im = sheet(e)
    if (!im) return null
    if (!f) return im
    var k = e.id + '|' + f
    if (tint[k] !== undefined) return tint[k]
    if (canFilter === null) { try { var t = w.document.createElement('canvas').getContext('2d'); t.filter = 'blur(1px)'; canFilter = t.filter === 'blur(1px)' } catch (x) { canFilter = false } }
    if (!canFilter) return (tint[k] = im)   // no canvas filters (old Safari): the untinted sheet
    var c = w.document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight
    var x = c.getContext('2d'); x.filter = f; x.drawImage(im, 0, 0)
    return (tint[k] = c)
  }

  var V = {
    elem: function (cat) { return ELEM[cat] || 'normal' },
    ready: function () { return !!db() },
    // load every sheet a journey's moments use, before the run (a sheet first decoded on screen stalls that frame)
    preload: function (cat) {
      if (!db()) return 0
      var el = V.elem(cat), n = 0
      MOMENTS.forEach(function (m) {
        (recipe(m, el) || []).forEach(function (p) { var r = resolve(p[0]); if (r) { tinted(r.e, r.f); n++ } })
      })
      return n
    },
    // play a moment at (x, y) css px; size = the moment's visible size in px. Returns the number of parts started.
    play: function (m, x, y, size, cat, reduced) {
      if (!db() || x == null || y == null) return 0
      var el = V.elem(cat), parts = recipe(m, el), n = 0
      if (!parts) return 0
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i], r = resolve(p[0]), o = p[3]
        if (!r) continue
        if (reduced && i > 0) break   // reduced motion: the first part (a glow) alone, faded in place
        var copies = o.ring && !reduced ? o.ring[0] : 1
        for (var j = 0; j < copies; j++) {
          if (live.length >= MAX) live.shift()   // the oldest gives way
          live.push({ e: r.e, f: r.f, x: x + (o.dx || 0) * size, y: y + (o.dy || 0) * size, s: size * p[1], d: p[2], t: -(o.delay || 0), a: o.a == null ? 1 : o.a,
            spin: reduced ? 0 : (o.spin || 0), ring: copies > 1 ? o.ring : null, ang: copies > 1 ? (j / copies) * Math.PI * 2 + (m.length % 3) * 0.4 : 0, still: !!reduced, rot: (j * 1.7) % 6.28 })
          n++
        }
      }
      if (log.length > 40) log.shift()
      log.push({ m: m, el: el, n: n })
      return n
    },
    // QA: the moments played (name, element, parts), how many parts were drawn, and every recipe part the database lacks
    log: function () { return { played: log.slice(), drawn: drawn, live: live.length, peak: peak } },
    missing: function () {
      if (!db()) return ['no database']
      var out = []
      Object.keys(ELEM).forEach(function (cat) {
        var el = V.elem(cat)
        MOMENTS.forEach(function (m) { (recipe(m, el) || []).forEach(function (p) { if (!resolve(p[0])) out.push(cat + '/' + m + '/' + JSON.stringify(p[0])) }) })
      })
      return out
    },
    live: function () { return live.length },
    clear: function () { live.length = 0; log.length = 0; drawn = 0; peak = 0 },
    draw: function (c, dt) {
      if (live.length > peak) peak = live.length
      for (var i = live.length - 1; i >= 0; i--) {
        var q = live[i]
        q.t += dt
        if (q.t < 0) continue
        var p = q.t / q.d
        if (p >= 1) { live.splice(i, 1); continue }
        var im = tinted(q.e, q.f)
        if (!im) continue
        var e = q.e, sheetN = e.frames > 1, ease = 1 - Math.pow(1 - p, 3)
        // visible size: the art fills e.fill of its frame, so the frame is drawn larger
        var fill = Math.max(0.3, e.fill || 1), sz = q.s / fill
        var a = p < 0.15 ? p / 0.15 : 1 - Math.pow((p - 0.15) / 0.85, 2)
        var sc = q.still ? 1 : sheetN ? 1 : 0.55 + 0.7 * ease
        var x = q.x, y = q.y
        if (q.ring) { var rr = (q.ring[1] + (q.ring[2] - q.ring[1]) * ease) * q.s / 0.4; x += Math.cos(q.ang) * rr; y += Math.sin(q.ang) * rr; sc *= 1 - 0.5 * p }
        var dw = sz * sc, dh = dw * e.fh / e.fw
        c.save()
        c.globalAlpha = Math.max(0, Math.min(1, a * q.a))
        if (e.blend === 'screen' || e.blend === 'add') c.globalCompositeOperation = 'screen'
        c.translate(x, y)
        if (q.spin || q.rot) c.rotate(q.rot + q.spin * q.t)
        if (sheetN) {
          var fi = Math.min(e.frames - 1, Math.floor(p * e.frames))
          var col = fi % e.cols, row = (fi / e.cols) | 0, kx = im.width / (e.cols * e.fw), ky = im.height / (e.rows * e.fh)
          c.drawImage(im, col * e.fw * kx, row * e.fh * ky, e.fw * kx, e.fh * ky, -dw / 2, -dh / 2, dw, dh)
        } else c.drawImage(im, -dw / 2, -dh / 2, dw, dh)
        c.restore()
        drawn++
      }
    }
  }
  T.vfx = V
})(window)
