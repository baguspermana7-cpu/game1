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
  // one vehicle per job, parked on the plaza (drag the VEHICLE onto its ghost): excavator = sand, crane = gate, dump truck = toys
  var SRC = {
    sand: { x: 300, y: 462, w: 250, h: 238, key: 'veh-excavator', n: 'EKSKAVATOR', win: { x: 0.58, y: 0.38, w: 0.17, h: 0.27 } },
    gate: { x: 690, y: 450, w: 260, h: 260, key: 'veh-mobile-crane', n: 'DEREK', win: { x: 0.575, y: 0.52, w: 0.155, h: 0.155 } },
    cart: { x: 1090, y: 500, w: 260, h: 187, key: 'veh-dump-truck', n: 'TRUK', win: { x: 0.13, y: 0.2, w: 0.2, h: 0.22 } }
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

    // ---- drop zones: the finished piece as a pulsing ghost where it will stand
    function zone (id, r, items) {
      var z = api.at(sc, 'jzone', r.x, r.y, r.w, r.h)
      z.setAttribute('data-zone', id)
      z.style.cssText += ';pointer-events:none;z-index:3'
      items.forEach(function (it) { K.ghost(api, z, it.key, it.x - r.x, it.y - r.y, it.w, it.h, false, true) })
      zones[id] = z
    }
    zone('pasir', PIT, PADS.map(function (p) { return { key: 'pc-sand-flat', x: p.x, y: p.y, w: p.w, h: p.h } }))
    zone('gerbang', GATE, [{ key: 'pc-gate-closed', x: GATE.x, y: GATE.y, w: GATE.w, h: GATE.h }])
    zone('mainan', PLAY, [{ key: 'pc-slide', x: SLIDE.x, y: SLIDE.y, w: SLIDE.w, h: SLIDE.h }, { key: 'pc-swing', x: SWING.x, y: SWING.y, w: SWING.w, h: SWING.h }])
    function refreshZones () {
      var s = api.step()
      zones.pasir.style.display = s === 0 && !has('pasir') ? 'block' : 'none'
      zones.gerbang.style.display = (s === 0 && !has('gerbang')) || s === 1 ? 'block' : 'none'
      zones.mainan.style.display = s === 0 && !has('mainan') ? 'block' : 'none'
      if (s === 1) zones.gerbang.style.pointerEvents = 'auto'; else zones.gerbang.style.pointerEvents = 'none'
      Array.prototype.forEach.call(zones.gerbang.children, function (c) { c.style.visibility = s === 1 ? 'hidden' : 'visible' })
    }

    // ---- the three vehicles on the plaza: you drag the vehicle itself (Blippi at the wheel) onto its ghost
    function inZone (pt, r, m) { return pt.x > r.x - m && pt.x < r.x + r.w + m && pt.y > r.y - m && pt.y < r.y + r.h + m }
    var loads = {}
    function source (id) {
      var d = SRC[id]
      var el = api.at(sc, 'src', d.x, d.y, d.w, d.h, 'button')
      el.type = 'button'
      el.setAttribute('data-src', id)
      el.setAttribute('aria-label', d.n.toLowerCase())
      el.style.cssText += ';background:none;border:0;padding:0;cursor:grab;z-index:7;touch-action:none;overflow:visible'
      var va = api.art(el, d.key, 0, 0, d.w, d.h, '')
      va.setAttribute('data-veh', d.key.replace('veh-', ''))
      K.driver(el, d.win)
      var sh = api.at(el, 'shd', 14, d.h - 16, d.w - 28, 26)
      sh.style.zIndex = '-1'
      if (id === 'gate') {
        // the gate hangs from the crane's hook
        var ld = api.at(el, '', 0, 0, d.w, d.h)
        ld.style.cssText += ';pointer-events:none;z-index:2'
        var rp = api.at(ld, '', 224, 44, 5, 82)
        rp.style.background = '#2f2f2f'
        api.art(ld, 'prop-kait', 202, 118, 48, 49, '')
        api.art(ld, 'pc-gate-closed', 150, 156, 112, 78, '')
        loads[id] = ld
      }
      if (id === 'cart') {
        var lt = api.at(el, '', 0, 0, d.w, d.h)
        lt.style.cssText += ';pointer-events:none;z-index:2'
        api.art(lt, 'pc-slide', 112, 4, 96, 60, '')
        api.art(lt, 'pc-swing', 164, 34, 84, 50, '')
        loads[id] = lt
      }
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
        el.style.transform = 'translate(' + (p.x - dr.x0) + 'px,' + (p.y - dr.y0) + 'px) scale(1.04)'
      })
      function end (ev, cancel) {
        if (!dr || ev.pointerId !== dr.id) return
        var cur = dr
        dr = null
        el.style.zIndex = '7'
        var dx = cur.p.x - cur.x0
        var dy = cur.p.y - cur.y0
        var took = !cancel && cur.moved > 10 ? drop(id, cur.p, dx, dy) : 0
        if (took === 1) return
        if (!cancel && took !== 2) api.warn(cur.moved > 10 ? L.miss : L.dragIt)
        if (!cancel && cur.moved <= 10) K.glow(zones[id === 'sand' ? 'pasir' : (id === 'gate' ? 'gerbang' : 'mainan')], 2600)
        backHome(el, dx, dy)
      }
      el.addEventListener('pointerup', function (ev) { end(ev, false) })
      el.addEventListener('pointercancel', function (ev) { end(ev, true) })
      el.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
      srcEls[id] = el
    }
    function backHome (el, dx, dy, cb) {
      api.tween({ x: dx, y: dy }, { x: 0, y: 0 }, 650, function (q) { el.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () { el.style.transform = ''; if (cb) cb() })
    }
    ;['sand', 'gate', 'cart'].forEach(source)

    function afterJob (j) {
      seq = seq.indexOf(j) < 0 ? seq.concat([j]) : seq
      save()
      refreshZones()
      function next () {
        if (allDone()) {
          api.warn(L.ready)
          K.ask(api, { context: 'gate', grade: 1, done: function () { api.later(function () { api.advance() }, 500) } })
        } else api.warn(L.done1)
      }
      if (j === 'pasir') K.ask(api, { custom: { id: 'm05-sand', prompt: 'Ada berapa petak pasir?', count: { key: 'pc-sand-flat', n: 2 }, choices: ['1', '2', '3'], answer: '2', hint1: 'Hitung petak pasirnya.' }, done: next })
      else if (j === 'mainan') K.ask(api, { custom: { id: 'm05-slide', prompt: 'Mainan mana yang untuk meluncur?', choices: ['Perosotan', 'Ayunan'], choicePics: ['assets/blippi/pc-slide.webp', 'assets/blippi/pc-swing.webp'], answer: 'Perosotan', hint1: 'Anak-anak meluncur turun.' }, done: next })
      else next()
    }
    function spend (id) { srcEls[id].setAttribute('data-spent', '1'); srcEls[id].classList.remove('glow') }
    // drop: 1 = the vehicle took the job (it comes home by itself), 2 = refused with a reason, 0 = missed
    function drop (id, pt, dx, dy) {
      var el = srcEls[id]
      if (id === 'sand') {
        if (!inZone(pt, PIT, 40) || sand >= 2) return 0
        busy = true
        spend('sand')
        var dig = function (i) {
          if (el.animate && !api.reduced()) el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(0)' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(-6deg)', offset: 0.55 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(0)' }], { duration: 640, easing: 'cubic-bezier(.23,1,.32,1)' })
          api.sfx('bump')
          api.later(function () {
            sand = i + 1
            showSand(i, true)
            api.fx('dust', PADS[i].x + PADS[i].w / 2, PADS[i].y + PADS[i].h / 2, 190)
            save()
            if (i === 0) api.later(function () { dig(1) }, 420)
            else backHome(el, dx, dy, function () { busy = false; afterJob('pasir') })
          }, 360)
        }
        dig(0)
        return 1
      }
      if (id === 'gate') {
        if (!inZone(pt, GATE, 90)) return 0
        busy = true
        spend('gate')
        api.sfx('bump')
        api.later(function () {
          done = done.concat(['gerbang'])
          if (loads.gate) loads.gate.style.display = 'none'
          var g = showGate()
          K.land(api, g)
          api.fx('spark', GATE.x + GATE.w / 2, GATE.y + GATE.h, 200)
          save()
          backHome(el, dx, dy, function () { busy = false; afterJob('gerbang') })
        }, 520)
        return 1
      }
      // dump truck -> playground (needs the sand pads under the toys)
      if (!inZone(pt, PLAY, 90) && !inZone(pt, PIT, 40)) return 0
      if (sand < 2) {
        api.warn(L.toysFirst)
        zones.pasir.classList.remove('shake'); void zones.pasir.offsetWidth; zones.pasir.classList.add('shake')
        K.glow(srcEls.sand, 3000); K.glow(zones.pasir, 3000)
        return 2
      }
      busy = true
      spend('cart')
      if (el.animate && !api.reduced()) el.animate([{ transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(0)', transformOrigin: '95% 100%' }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(-14deg)', transformOrigin: '95% 100%', offset: 0.5 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(0)', transformOrigin: '95% 100%' }], { duration: 900, easing: 'ease-in-out' })
      api.sfx('collect')
      api.later(function () {
        done = done.concat(['mainan'])
        if (loads.cart) loads.cart.style.display = 'none'
        var t = showToys()
        t.forEach(function (e) { K.land(api, e) })
        api.fx('confetti', 540, 300, 300)
        save()
        backHome(el, dx, dy, function () { busy = false; afterJob('mainan') })
      }, 520)
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
          else if (!busy) {
            var zc = id === 'sand' ? PIT : zr
            var tx = zc.x + zc.w / 2
            var ty = zc.y + zc.h / 2
            var ddx = tx - (d.x + d.w / 2)
            var ddy = ty - (d.y + d.h / 2)
            var el0 = srcEls[id]
            busy = true
            api.tween({ x: 0, y: 0 }, { x: ddx, y: ddy }, 600, function (q) { el0.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () { busy = false; if (drop(id, { x: tx, y: ty }, ddx, ddy) !== 1) backHome(el0, ddx, ddy) })
          }
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
