/* G32 Blippi -- W01-M05 "Hari Pembukaan Taman" (PRD 11.2 finale: the CHILD chooses the order of three jobs), played INSIDE bg-w01-m05-pembukaan.
 * 1 SIAPKAN: three real pieces wait on the plaza. DRAG the sand tiles onto the sand pit, the gate onto the wall spot, the toy cart into the playground.
 *    Any order; toys need sand first (the cart floats back, the pit pulses, a kind line says why). The scene gains each piece where it was dropped.
 * 2 BUKA: tap the new gate and it swings open. A different order = a different build sequence on screen. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var PADS = [{ x: 350, y: 308, w: 160, h: 90 }, { x: 560, y: 318, w: 160, h: 90 }]
  var PIT = { x: 280, y: 262, w: 480, h: 150 }              // where sand tiles are taken
  var PLAY = { x: 300, y: 130, w: 460, h: 150 }             // where the toy cart is taken
  var SLIDE = { x: 322, y: 232, w: 210, h: 132 }
  var SWING = { x: 548, y: 256, w: 190, h: 112 }
  var GATE = { x: 760, y: 236, w: 226, h: 156 }
  var SRC = {
    sand: { x: 780, y: 500, w: 170, h: 96, key: 'pc-sand-flat', n: 'PASIR' },
    gate: { x: 1020, y: 470, w: 200, h: 138, key: 'pc-gate-closed', n: 'GERBANG' },
    cart: { x: 1270, y: 500, w: 160, h: 130, key: 'pc-cart', n: 'MAINAN' }
  }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var sand = saved.sand || 0                 // tiles laid (0..2)
    var done = saved.done || []                // 'gerbang' | 'mainan' (+ 'pasir' when sand===2)
    var opened = !!saved.opened
    var seq = saved.seq || []                  // the order the child actually worked in
    var busy = false
    var srcEls = {}
    var zones = {}
    var built = {}
    var hand = K.hand(api)
    function save () { api.persist({ sand: sand, done: done, opened: opened, seq: seq }) }
    function has (j) { return j === 'pasir' ? sand >= 2 : done.indexOf(j) >= 0 }
    function allDone () { return has('pasir') && has('gerbang') && has('mainan') }

    // ---- results drawn in the plate
    function showSand (i, anim) {
      var p = PADS[i]
      var e = api.art(sc, 'pc-sand-flat', p.x, p.y, p.w, p.h, 'built')
      e.setAttribute('data-built', 'pasir' + i)
      e.style.zIndex = '2'
      e.style.pointerEvents = 'none'
      if (anim) K.land(api, e)
    }
    function showGate () {
      if (built.gate && built.gate.parentNode) built.gate.parentNode.removeChild(built.gate)
      var g = api.art(sc, opened ? 'pc-gate-open' : 'pc-gate-closed', GATE.x, GATE.y, GATE.w, GATE.h, 'built')
      g.setAttribute('data-built', 'gerbang')
      g.style.zIndex = '4'
      g.style.pointerEvents = 'none'
      built.gate = g
      return g
    }
    function showToys () {
      var a = api.art(sc, 'pc-slide', SLIDE.x, SLIDE.y, SLIDE.w, SLIDE.h, 'built')
      var b = api.art(sc, 'pc-swing', SWING.x, SWING.y, SWING.w, SWING.h, 'built')
      a.setAttribute('data-built', 'slide'); b.setAttribute('data-built', 'swing')
      a.style.zIndex = b.style.zIndex = '3'
      a.style.pointerEvents = b.style.pointerEvents = 'none'
      return [a, b]
    }
    var i0
    for (i0 = 0; i0 < sand; i0++) showSand(i0, false)
    if (has('gerbang')) showGate()
    if (has('mainan')) showToys()

    // ---- drop zones (dashed, visible while that job is open)
    function zone (id, r) {
      var z = api.at(sc, 'jzone', r.x, r.y, r.w, r.h)
      z.setAttribute('data-zone', id)
      z.style.cssText += ';border:5px dashed #FF8A1F;border-radius:24px;background:rgba(255,196,64,.18);pointer-events:none;z-index:3'
      zones[id] = z
    }
    zone('pasir', PIT)
    zone('gerbang', GATE)
    zone('mainan', PLAY)
    function refreshZones () {
      var s = api.step()
      zones.pasir.style.display = s === 0 && !has('pasir') ? 'block' : 'none'
      zones.gerbang.style.display = (s === 0 && !has('gerbang')) || s === 1 ? 'block' : 'none'
      zones.mainan.style.display = s === 0 && !has('mainan') ? 'block' : 'none'
      if (s === 1) zones.gerbang.style.pointerEvents = 'auto'; else zones.gerbang.style.pointerEvents = 'none'
    }

    // ---- sources on the plaza: you drag the thing itself
    function inZone (pt, r, m) { return pt.x > r.x - m && pt.x < r.x + r.w + m && pt.y > r.y - m && pt.y < r.y + r.h + m }
    function source (id) {
      var d = SRC[id]
      var el = api.at(sc, 'src', d.x, d.y, d.w, d.h, 'button')
      el.type = 'button'
      el.setAttribute('data-src', id)
      el.setAttribute('aria-label', d.n.toLowerCase())
      el.style.cssText += ';background:none;border:0;padding:0;cursor:grab;z-index:7;touch-action:none;overflow:visible'
      api.art(el, d.key, 0, 0, d.w, d.h, '')
      var sh = api.at(el, 'shd', 10, d.h - 14, d.w - 20, 24)
      sh.style.zIndex = '-1'
      var dr = null
      el.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 0 || busy || dr || el.getAttribute('data-spent')) return
        api.touch()
        var p = B.toRef(ev.clientX, ev.clientY)
        dr = { id: ev.pointerId, x0: p.x, y0: p.y, moved: 0, p: p }
        el.classList.remove('glow')
        el.style.zIndex = '30'
        try { el.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      el.addEventListener('pointermove', function (ev) {
        if (!dr || ev.pointerId !== dr.id) return
        var p = B.toRef(ev.clientX, ev.clientY)
        dr.p = p
        dr.moved = Math.max(dr.moved, Math.abs(p.x - dr.x0) + Math.abs(p.y - dr.y0))
        el.style.transform = 'translate(' + (p.x - dr.x0) + 'px,' + (p.y - dr.y0) + 'px) scale(1.06)'
      })
      function end (ev, cancel) {
        if (!dr || ev.pointerId !== dr.id) return
        var cur = dr
        dr = null
        el.style.zIndex = '7'
        var took = !cancel && cur.moved > 10 ? drop(id, cur.p) : 0
        if (took === 1) { el.style.transform = ''; return }
        if (!cancel && took !== 2) api.warn(cur.moved > 10 ? L.miss : L.dragIt)
        if (!cancel && cur.moved <= 10) K.glow(zones[id === 'sand' ? 'pasir' : (id === 'gate' ? 'gerbang' : 'mainan')], 2600)
        var dx = cur.p.x - cur.x0
        var dy = cur.p.y - cur.y0
        api.tween({ x: dx, y: dy }, { x: 0, y: 0 }, 280, function (q) { el.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () { el.style.transform = '' })
      }
      el.addEventListener('pointerup', function (ev) { end(ev, false) })
      el.addEventListener('pointercancel', function (ev) { end(ev, true) })
      el.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
      srcEls[id] = el
    }
    ;['sand', 'gate', 'cart'].forEach(source)

    function finishJob (j) {
      if (seq.indexOf(j) < 0) seq = seq.concat([j])
      save()
      refreshZones()
      if (allDone()) {
        api.warn(L.ready)
        api.later(function () { api.advance() }, 800)
      } else api.warn(L.done1)
    }
    function drop (id, pt) {
      if (id === 'sand') {
        if (!inZone(pt, PIT, 40) || sand >= 2) return 0
        busy = true
        var i = sand
        sand++
        showSand(i, true)
        api.sfx('bump')
        api.fx('dust', PADS[i].x + PADS[i].w / 2, PADS[i].y + PADS[i].h / 2, 180)
        if (sand >= 2) { srcEls.sand.setAttribute('data-spent', '1'); srcEls.sand.style.display = 'none' }
        api.later(function () { busy = false; if (sand >= 2) finishJob('pasir'); else { save(); api.warn(L.moreSand) } }, 420)
        return 1
      }
      if (id === 'gate') {
        if (!inZone(pt, GATE, 50)) return 0
        busy = true
        done = done.concat(['gerbang'])
        srcEls.gate.setAttribute('data-spent', '1'); srcEls.gate.style.display = 'none'
        var g = showGate()
        K.land(api, g)
        api.sfx('bump')
        api.fx('spark', GATE.x + GATE.w / 2, GATE.y + GATE.h, 200)
        api.later(function () { busy = false; finishJob('gerbang') }, 560)
        return 1
      }
      // cart -> playground (needs the sand pads under the toys)
      if (!inZone(pt, PLAY, 50) && !inZone(pt, PIT, 20)) return 0
      if (sand < 2) {
        api.warn(L.toysFirst)
        zones.pasir.classList.remove('shake'); void zones.pasir.offsetWidth; zones.pasir.classList.add('shake')
        K.glow(srcEls.sand, 3000); K.glow(zones.pasir, 3000)
        return 2
      }
      busy = true
      done = done.concat(['mainan'])
      srcEls.cart.setAttribute('data-spent', '1'); srcEls.cart.style.display = 'none'
      api.sfx('collect')
      var t = showToys()
      t.forEach(function (e) { K.land(api, e) })
      api.fx('confetti', 540, 300, 300)
      api.later(function () { busy = false; finishJob('mainan') }, 600)
      return 1
    }

    // ---- step 2: tap the gate to open the park
    zones.gerbang.setAttribute('data-gatezone', '1')
    zones.gerbang.style.cursor = 'pointer'
    zones.gerbang.addEventListener('click', function () {
      if (api.step() !== 1 || opened || busy) return
      api.touch()
      busy = true
      opened = true
      api.sfx('ok')
      var g = showGate()
      K.land(api, g)
      zones.gerbang.style.display = 'none'
      api.fx('confetti', 870, 300, 380)
      api.fx('gold-star', 870, 330, 260)
      save()
      api.later(function () { busy = false; api.advance() }, 1300)
    })

    ;['sand', 'gate', 'cart'].forEach(function (id) {
      var d = SRC[id]
      if ((id === 'sand' && sand >= 2) || (id === 'gate' && has('gerbang')) || (id === 'cart' && has('mainan'))) srcEls[id].style.display = 'none'
      void d
    })
    refreshZones()

    var ctl = {
      onStep: function (n) {
        refreshZones()
        ;['sand', 'gate', 'cart'].forEach(function (id) { srcEls[id].style.pointerEvents = n === 0 ? 'auto' : 'none' })
        if (n === 0) { ;['sand', 'gate', 'cart'].forEach(function (id) { if (!srcEls[id].getAttribute('data-spent') && srcEls[id].style.display !== 'none') srcEls[id].classList.add('glow') }) }
        if (n === 1) K.glow(zones.gerbang, 3000)
      },
      onTool: function () {},
      demo: function () { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var id = sand < 2 ? 'sand' : (!has('gerbang') ? 'gate' : 'cart')
          var zid = id === 'sand' ? 'pasir' : (id === 'gate' ? 'gerbang' : 'mainan')
          var zr = id === 'sand' ? PADS[sand] : (id === 'gate' ? GATE : PLAY)
          var d = SRC[id]
          if (lvl <= 2) { K.glow(srcEls[id], 3000); K.glow(zones[zid], 3000) }
          else if (lvl === 3) hand.move([{ x: d.x + d.w / 2 - 30, y: d.y + d.h / 2 - 30 }, { x: zr.x + zr.w / 2 - 30, y: zr.y + zr.h / 2 - 30 }], 1000)
          else drop(id, { x: zr.x + zr.w / 2, y: zr.y + zr.h / 2 })
        } else {
          K.glow(zones.gerbang, 3000)
          if (lvl === 3) hand.move([{ x: GATE.x + 90, y: GATE.y + 80 }, { x: GATE.x + 90, y: GATE.y + 64 }, { x: GATE.x + 90, y: GATE.y + 80 }], 400)
          if (lvl >= 4) zones.gerbang.click()
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M05', mod)
})(window)
