/* G32 Blippi -- W02-M05 "Parade Air Ceria" (PRD 11.3 finale: last connection, fill the tank water, choose the fountain pattern), played INSIDE bg-w02-m05-parade-air.
 * The water truck stands on the wooden tank pad; the round fountain basin waits in the plaza.
 * 1 SAMBUNG: DRAG the hose end from the truck to the glowing inlet ring on the basin rim.
 * 2 ISI: HOLD the truck's pump. Water runs along the hose and the basin rises.
 * 3 POLA: DRAG the two jet pieces onto the two nozzle rings, in the order YOU choose; the fountain then plays them in that order. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var NS = 'http://www.w3.org/2000/svg'
  var TRK = { x: 40, y: 498, w: 400, h: 260 }
  var AN = { x: 316, y: 640 }                 // hose anchor on the truck
  var E0 = { x: 470, y: 700 }                 // hose end resting on the pad
  var INLET = { x: 592, y: 620 }              // inlet ring on the rim
  var POOL = { x: 1000, y: 482, rx: 360, ry: 50 }
  var SLOT = { a: { x: 850, y: 506 }, b: { x: 1150, y: 506 } }
  var SRC = { a: { x: 1235, y: 668, key: 'pc-jets-a', n: 'A' }, b: { x: 1400, y: 668, key: 'pc-jets-b', n: 'B' } }
  var PUMP = { x: 262, y: 628, w: 120, h: 80 }

  function hosePath (e) {
    var c1 = { x: AN.x + 40, y: AN.y + 90 }
    var c2 = { x: e.x - 90, y: e.y + 60 }
    return 'M' + AN.x + ',' + AN.y + ' C' + c1.x + ',' + c1.y + ' ' + c2.x + ',' + c2.y + ' ' + e.x + ',' + e.y
  }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var connected = !!(rs && rs.step >= 1)
    var filled = rs && rs.step >= 2 ? 1 : 0
    var level = filled
    var placed = saved.placed || {}            // { a: 'a'|'b', ... } slot -> piece
    var order = saved.order || []              // slots in the order the child placed pieces
    var holding = false
    var raf = 0
    var busy = false
    var hand = K.hand(api)
    function save () { api.persist({ placed: placed, order: order }) }

    api.art(sc, 'veh-truk-air-sisi', TRK.x, TRK.y, TRK.w, TRK.h, 'house')
    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:4'
    svg.innerHTML = ''+
      '<path id="ho" fill="none" stroke="#B8860B" stroke-width="22" stroke-linecap="round"/><path id="hi" fill="none" stroke="#F5C518" stroke-width="14" stroke-linecap="round"/>' +
      '<path id="hw" fill="none" stroke="#9fe0ff" stroke-width="8" stroke-linecap="round" opacity="0" stroke-dasharray="14 12"/>'
    sc.appendChild(svg)
    var pool = K.waterBody(svg, POOL.x, POOL.y, POOL.rx, POOL.ry)
    var ho = svg.querySelector('#ho')
    var hi = svg.querySelector('#hi')
    var hw = svg.querySelector('#hw')
    var E = connected ? { x: INLET.x - 10, y: INLET.y + 6 } : { x: E0.x, y: E0.y }
    function setHose (e) {
      E = e
      var d = hosePath(e)
      ho.setAttribute('d', d); hi.setAttribute('d', d); hw.setAttribute('d', d)
      hend.style.transform = 'translate(' + (e.x - 60) + 'px,' + (e.y - 40) + 'px)'
    }
    function setLevel (v) {
      level = Math.max(0, Math.min(1, v))
      pool.set(level)
    }
    var ring = K.socket(api, sc, INLET.x - 44, INLET.y - 44, 88, 88, 'inlet')
    ring.style.borderRadius = '50%'
    var hend = api.at(sc, 'hend', 0, 0, 120, 80)
    hend.setAttribute('data-hose-end', '1')
    hend.style.cssText += ';touch-action:none;cursor:grab;z-index:7'
    hend.appendChild(w.Blippi.A.frame('prop-selang-ujung'))
    var pump = api.art(sc, 'prop-pompa-truk', PUMP.x, PUMP.y, PUMP.w, PUMP.h, 'pumpunit')
    pump.setAttribute('data-pump', '1')
    pump.style.cssText += ';z-index:6;touch-action:none;cursor:pointer'
    setHose(E)
    setLevel(level)
    if (connected) ring.style.display = 'none'

    // ---- step 1: drag the hose end to the inlet
    var drag = null
    hend.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 0 || connected || drag) return
      api.touch()
      var r = B.toRef(ev.clientX, ev.clientY)
      drag = { id: ev.pointerId, ox: E.x - r.x, oy: E.y - r.y }
      hend.classList.remove('glow')
      try { hend.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    hend.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return
      var r = B.toRef(ev.clientX, ev.clientY)
      setHose({ x: r.x + drag.ox, y: r.y + drag.oy })
    })
    function endHose (ev, cancel) {
      if (!drag || ev.pointerId !== drag.id) return
      drag = null
      if (!cancel && K.within(E, INLET.x - 10, INLET.y + 6, 100)) { connect(); return }
      if (!cancel) { api.warn(L.hoseMiss); K.glow(ring, 2600) }
      api.tween(E, E0, 340, setHose)
    }
    hend.addEventListener('pointerup', function (ev) { endHose(ev, false) })
    hend.addEventListener('pointercancel', function (ev) { endHose(ev, true) })
    hend.addEventListener('lostpointercapture', function (ev) { endHose(ev, true) })
    function connect () {
      connected = true
      ring.style.display = 'none'
      api.sfx('ok')
      api.fx('check-burst', INLET.x, INLET.y, 200)
      api.tween(E, { x: INLET.x - 10, y: INLET.y + 6 }, 200, setHose, function () { api.persist({}); api.later(function () { api.advance() }, 500) })
    }

    // ---- step 2: hold the pump
    function loop (t0) {
      var last = t0
      function f (t) {
        if (!holding || api.step() !== 1) return
        var dt = Math.min(50, t - last)
        last = t
        if (!api.paused()) { hw.setAttribute('opacity', '1'); setLevel(level + dt / 3000); if (level >= 1) { holding = false; hw.setAttribute('opacity', '0'); api.sfx('ok'); api.fx('gold-star', POOL.x, POOL.y - 40, 240); api.later(function () { api.advance() }, 800); return } }
        raf = requestAnimationFrame(f)
      }
      raf = requestAnimationFrame(f)
    }
    pump.addEventListener('pointerdown', function (ev) {
      if (api.step() === 0) { api.touch(); api.warn(L.hoseFirst); K.glow(hend, 2600); K.glow(ring, 2600); return }
      if (api.step() !== 1) return
      api.touch()
      holding = true
      api.sfx('water')
      pump.classList.remove('glow')
      try { pump.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      loop(performance.now())
    })
    function release () { holding = false; hw.setAttribute('opacity', '0') }
    pump.addEventListener('pointerup', release)
    pump.addEventListener('pointercancel', release)
    pump.addEventListener('lostpointercapture', release)

    // ---- step 3: the two jet pieces
    var slotEls = {}
    ;['a', 'b'].forEach(function (k) {
      var s = K.socket(api, sc, SLOT[k].x - 80, SLOT[k].y - 50, 160, 100, 'nozzle-' + k)
      s.style.borderRadius = '50%'
      s.style.display = 'none'
      slotEls[k] = s
    })
    var srcEls = {}
    var shown = {}
    function showJet (slot, piece, anim) {
      var j = api.art(sc, SRC[piece].key, SLOT[slot].x - 100, SLOT[slot].y - 175, 200, 190, 'jets')
      j.setAttribute('data-jet', slot)
      j.style.cssText += ';z-index:5;pointer-events:none;opacity:' + (anim ? '0' : '1')
      shown[slot] = j
      return j
    }
    Object.keys(placed).forEach(function (s) { showJet(s, placed[s], false) })
    ;['a', 'b'].forEach(function (k) {
      var el = api.at(sc, 'src', SRC[k].x, SRC[k].y, 130, 110, 'button')
      el.type = 'button'
      el.setAttribute('data-src', k)
      el.setAttribute('aria-label', 'Pola pancuran ' + SRC[k].n)
      el.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;display:none;overflow:visible'
      api.art(el, SRC[k].key, 0, 0, 130, 110, '')
      srcEls[k] = el
      var d = null
      el.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 2 || d || busy) return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
        el.classList.remove('glow')
        el.style.zIndex = '30'
        try { el.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      el.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        el.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.08)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var c = d
        d = null
        el.style.zIndex = '7'
        var slot = null
        var bd = 1e9
        ;['a', 'b'].forEach(function (s) { var dd = Math.hypot(c.p.x - SLOT[s].x, c.p.y - SLOT[s].y); if (!placed[s] && dd < 130 && dd < bd) { bd = dd; slot = s } })
        if (!cancel && c.moved > 10 && slot) { put(k, slot); el.style.transform = ''; return }
        if (!cancel) { api.warn(c.moved > 10 ? L.jetMiss : L.dragJet); ;['a', 'b'].forEach(function (s) { if (!placed[s]) K.glow(slotEls[s], 2600) }) }
        api.tween({ x: c.p.x - c.x0, y: c.p.y - c.y0 }, { x: 0, y: 0 }, 300, function (q) { el.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () { el.style.transform = '' })
      }
      el.addEventListener('pointerup', function (ev) { end(ev, false) })
      el.addEventListener('pointercancel', function (ev) { end(ev, true) })
      el.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    function put (piece, slot) {
      placed[slot] = piece
      order = order.concat([slot])
      srcEls[piece].style.display = 'none'
      slotEls[slot].style.display = 'none'
      var j = showJet(slot, piece, true)
      api.sfx('bump')
      api.fx('droplets', SLOT[slot].x, SLOT[slot].y - 30, 170)
      if (j.animate && !api.reduced()) { j.style.opacity = '1'; j.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)' }) } else j.style.opacity = '1'
      save()
      if (order.length >= 2) {
        busy = true
        api.warn(L.show)
        // the show plays in the child's order: first placed jet pulses, then the second, then both
        var s1 = shown[order[0]]
        var s2 = shown[order[1]]
        api.later(function () { if (s1.animate && !api.reduced()) s1.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 600 }); api.fx('gold-star', SLOT[order[0]].x, SLOT[order[0]].y - 100, 200) }, 500)
        api.later(function () { if (s2.animate && !api.reduced()) s2.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 600 }); api.fx('gold-star', SLOT[order[1]].x, SLOT[order[1]].y - 100, 200) }, 1200)
        api.later(function () { api.fx('confetti', 1000, 420, 380); busy = false; api.advance() }, 2000)
      } else api.warn(L.moreJet)
    }

    var ctl = {
      onStep: function (n) {
        holding = false
        ring.style.display = n === 0 && !connected ? 'block' : 'none'
        ;['a', 'b'].forEach(function (k) {
          srcEls[k].style.display = n === 2 && !Object.keys(placed).some(function (s) { return placed[s] === k }) ? 'block' : 'none'
          slotEls[k].style.display = n === 2 && !placed[k] ? 'block' : 'none'
        })
        if (n === 0) { K.glow(hend, 3000); K.glow(ring, 3000) }
        if (n === 1) K.glow(pump, 3000)
        if (n === 2) { K.glow(srcEls.a, 3000); K.glow(srcEls.b, 3000); K.glow(slotEls.a, 3000); K.glow(slotEls.b, 3000) }
      },
      onTool: function () {},
      demo: function () { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          K.glow(hend, 3000); K.glow(ring, 3000)
          if (lvl === 3) hand.move([{ x: E0.x - 30, y: E0.y + 10 }, { x: INLET.x - 50, y: INLET.y - 10 }], 1000)
          else if (lvl >= 4 && !connected) { api.tween(E, { x: INLET.x - 10, y: INLET.y + 6 }, 400, setHose, connect) }
        } else if (s === 1) {
          K.glow(pump, 3000)
          if (lvl === 3) hand.move([{ x: PUMP.x + 40, y: PUMP.y + 20 }, { x: PUMP.x + 40, y: PUMP.y + 20 }], 1800)
          else if (lvl >= 4) setLevel(1)
        } else {
          var piece = !placed.a && !placed.b ? 'a' : (Object.keys(placed).some(function (q) { return placed[q] === 'a' }) ? 'b' : 'a')
          var slot = !placed.a ? 'a' : 'b'
          K.glow(srcEls[piece], 3000); K.glow(slotEls[slot], 3000)
          if (lvl === 3) hand.move([{ x: SRC[piece].x + 20, y: SRC[piece].y + 10 }, { x: SLOT[slot].x - 40, y: SLOT[slot].y - 40 }], 1000)
          else if (lvl >= 4 && !busy) put(piece, slot)
        }
      },
      win: function () { api.sfx('water') },
      destroy: function () { holding = false; cancelAnimationFrame(raf); busy = false }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W02-M05', mod)
})(window)
