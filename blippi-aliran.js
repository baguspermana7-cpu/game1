/* G32 Blippi -- W02-M02 "Ke Mana Airnya Pergi?" (PRD 12.2: Fix & Transform; symptom, cause, connector, verify), played INSIDE bg-w02-m02-aliran.
 * A yellow hose runs from the pump to the empty test pond; one coupler is missing in the middle.
 * 1 CARI: HOLD the pump. Water runs along the hose, stops at the gap and drips on the ground: that is where it is broken.
 * 2 SAMBUNG: DRAG a connector into the gap. The hose end wears a round tag: only the ROUND plug fits, square and triangle pop back (the socket pulses).
 * 3 UJI: HOLD the pump again; water crosses the new coupler and fills the pond (its level rises on screen); the fountain starts at the top. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var NS = 'http://www.w3.org/2000/svg'
  var PUMP = { x: 120, y: 556, w: 200, h: 137 }
  var GAP = { x: 480, y: 702, r: 46 }
  var HOSE_A = 'M300,650 C360,700 410,705 440,700'
  var HOSE_C = 'M440,700 L520,702'
  var HOSE_B = 'M520,702 C560,700 600,690 662,702'
  var POND = { x: 880, y: 706, rx: 215, ry: 56 }
  var PLUGS = [{ id: 'bulat', x: 1250, y: 560 }, { id: 'kotak', x: 1350, y: 560 }, { id: 'segitiga', x: 1450, y: 560 }]
  var SHAPE = {
    bulat: '<circle cx="45" cy="45" r="36" fill="#1F6FD1"/><circle cx="45" cy="45" r="19" fill="#FFB347"/>',
    kotak: '<rect x="10" y="10" width="70" height="70" rx="10" fill="#1F6FD1"/><rect x="28" y="28" width="34" height="34" rx="5" fill="#FFB347"/>',
    segitiga: '<path d="M45 8 L84 78 L6 78 Z" fill="#1F6FD1" stroke-linejoin="round"/><path d="M45 34 L62 66 L28 66 Z" fill="#FFB347"/>'
  }

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var rs = api.restore
    var connected = !!(rs && rs.step >= 2)
    var level = connected && rs.step >= 3 ? 1 : 0
    var holding = false
    var flowRaf = 0
    var progress = 0                    // 0..1 along the water path
    var busy = false
    var hand = K.hand(api)

    // ---- the pond water (a plate overlay), hose and water, drawn in one svg that never takes pointer events
    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:3'
    svg.innerHTML = '<ellipse id="pw" cx="' + POND.x + '" cy="' + POND.y + '" rx="' + POND.rx + '" ry="' + POND.ry + '" fill="#4FB6EC" opacity="0"/>' +
      '<g id="hA"><path d="' + HOSE_A + '" fill="none" stroke="#B8860B" stroke-width="24" stroke-linecap="round"/><path d="' + HOSE_A + '" fill="none" stroke="#F5C518" stroke-width="16" stroke-linecap="round"/></g>' +
      '<g id="hC" style="display:none"><path d="' + HOSE_C + '" fill="none" stroke="#B8860B" stroke-width="24" stroke-linecap="round"/><path d="' + HOSE_C + '" fill="none" stroke="#F5C518" stroke-width="16" stroke-linecap="round"/></g>' +
      '<g id="hB"><path d="' + HOSE_B + '" fill="none" stroke="#B8860B" stroke-width="24" stroke-linecap="round"/><path d="' + HOSE_B + '" fill="none" stroke="#F5C518" stroke-width="16" stroke-linecap="round"/></g>' +
      '<path id="wat" d="M300,650 C360,700 410,705 440,700 L520,702 C560,700 600,690 662,702" fill="none" stroke="#9fe0ff" stroke-width="12" stroke-linecap="round" opacity="0"/>' +
      '<ellipse id="puddle" cx="448" cy="724" rx="2" ry="1" fill="#6FC4F2" opacity="0"/>'
    sc.appendChild(svg)
    var pw = svg.querySelector('#pw')
    var hC = svg.querySelector('#hC')
    var wat = svg.querySelector('#wat')
    var puddle = svg.querySelector('#puddle')
    // the water path is measured once; "progress" is a fraction of the whole run
    var total = wat.getTotalLength()
    var gapAt = (function () { var a = svg.querySelector('#hA path'); return a.getTotalLength() / total })()   // hose A ends here (the break)
    function setWater (p, showAll) {
      progress = p
      wat.setAttribute('stroke-dasharray', (total * p) + ' ' + total)
      wat.setAttribute('opacity', p > 0.001 ? '1' : '0')
      void showAll
    }
    setWater(0)
    function setLevel (v) {
      level = Math.max(0, Math.min(1, v))
      pw.setAttribute('opacity', String(level * 0.9))
      pw.setAttribute('rx', String(POND.rx * (0.25 + 0.75 * level)))
      pw.setAttribute('ry', String(POND.ry * (0.25 + 0.75 * level)))
      pw.setAttribute('data-level', level.toFixed(2))
    }
    setLevel(level)

    // ---- scene pieces: the pump (the thing you hold), the round clue tag, the socket ring
    var pump = api.art(sc, 'modul-pompa', PUMP.x, PUMP.y, PUMP.w, PUMP.h, 'pumpunit')
    pump.setAttribute('data-pump', '1')
    pump.style.cssText += ';z-index:6;touch-action:none;cursor:pointer'
    var tag = api.art(sc, 'pc-card-circle', GAP.x - 52, GAP.y - 112, 104, 66, 'tagcard')
    tag.style.zIndex = '5'
    tag.style.pointerEvents = 'none'
    var ring = K.socket(api, sc, GAP.x - GAP.r, GAP.y - GAP.r, GAP.r * 2, GAP.r * 2, 'coupler')
    ring.style.borderRadius = '50%'
    ring.style.display = 'none'
    var jets = api.art(sc, 'pc-jets-a', POND.x - 110, POND.y - 205, 220, 180, 'jets')
    jets.style.cssText += ';z-index:4;pointer-events:none;opacity:0'
    var plugEls = {}
    PLUGS.forEach(function (p) {
      var el = api.at(sc, 'plug', p.x, p.y, 90, 90, 'button')
      el.type = 'button'
      el.setAttribute('data-plug', p.id)
      el.setAttribute('aria-label', 'Konektor ' + p.id)
      el.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;display:none'
      el.innerHTML = '<svg viewBox="0 0 90 90" width="90" height="90">' + SHAPE[p.id] + '</svg>'
      var sh = api.at(el, 'shd', 8, 78, 74, 16)
      sh.style.zIndex = '-1'
      plugEls[p.id] = el
      dragPlug(el, p)
    })
    var plugPlaced = null
    function placeCoupler (anim) {
      connected = true
      hC.style.display = 'block'
      ring.style.display = 'none'
      tag.style.opacity = '0'
      var c = api.at(sc, 'coupler-done', GAP.x - 30, GAP.y - 30, 60, 60)
      c.setAttribute('data-coupler', 'ok')
      c.style.cssText += ';z-index:5;pointer-events:none'
      c.innerHTML = '<svg viewBox="0 0 90 90" width="60" height="60">' + SHAPE.bulat + '</svg>'
      if (anim) K.land(api, c)
      plugPlaced = c
    }
    if (connected) placeCoupler(false)

    // ---- the pump hold
    function loop (t0) {
      var last = t0
      function f (t) {
        if (!holding) return
        var dt = Math.min(50, t - last)
        last = t
        if (!api.paused()) tick(dt)
        flowRaf = requestAnimationFrame(f)
      }
      flowRaf = requestAnimationFrame(f)
    }
    function tick (dt) {
      var s = api.step()
      if (s === 0) {
        // flows only as far as the break, then drips
        setWater(Math.min(gapAt, progress + dt / 1800))
        if (progress >= gapAt - 0.002) { holding = false; spill(); }
      } else if (s === 2) {
        if (progress < 1) setWater(Math.min(1, progress + dt / 1100))
        else setLevel(level + dt / 2600)
        if (level >= 1) { holding = false; finish() }
      }
    }
    function spill () {
      api.sfx('bad')
      api.fx('droplets', GAP.x - 40, GAP.y + 14, 120)
      puddle.setAttribute('opacity', '.8')
      puddle.animate && !api.reduced() && puddle.animate([{ rx: 2, ry: 1 }, { rx: 40, ry: 12 }], { duration: 700, fill: 'forwards', easing: 'ease-out' })
      puddle.setAttribute('rx', '40'); puddle.setAttribute('ry', '12')
      api.warn(L.found)
      ring.style.display = 'block'
      K.glow(ring, 3000)
      api.persist({})
      api.later(function () { setWater(0); api.advance() }, 1400)
    }
    function finish () {
      api.sfx('ok')
      setLevel(1)
      jets.style.opacity = '1'
      if (jets.animate && !api.reduced()) jets.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1.06)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 600, easing: 'cubic-bezier(.23,1,.32,1)' })
      api.fx('gold-star', POND.x, POND.y - 100, 240)
      api.persist({})
      api.later(function () { api.advance() }, 900)
    }
    pump.addEventListener('pointerdown', function (ev) {
      var s = api.step()
      if (s === 1) { api.touch(); api.warn(L.needPlug); return }
      if (s !== 0 && s !== 2) return
      api.touch()
      holding = true
      api.sfx('water')
      pump.classList.remove('glow')
      try { pump.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      loop(performance.now())
    })
    function release () { holding = false }
    pump.addEventListener('pointerup', release)
    pump.addEventListener('pointercancel', release)
    pump.addEventListener('lostpointercapture', release)

    // ---- the connector pieces
    function dragPlug (el, p) {
      var d = null
      el.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 1 || d || busy) return
        api.touch()
        var r = api.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
        el.classList.remove('glow')
        el.style.zIndex = '30'
        try { el.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      el.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = api.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        el.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.08)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cur = d
        d = null
        el.style.zIndex = '7'
        var near = cur.p && K.within(cur.p, GAP.x, GAP.y, 80)
        if (!cancel && cur.moved > 10 && near && p.id === 'bulat') { dropRound(el); return }
        if (!cancel) {
          if (cur.moved <= 10) api.warn(L.dragPlug)
          else if (near) { api.warn(L.wrongShape); bump(); K.glow(tag, 3000) }
          else api.warn(L.dragPlug)
          K.glow(ring, 2600)
        }
        var dx = cur.p.x - cur.x0
        var dy = cur.p.y - cur.y0
        api.tween({ x: dx, y: dy }, { x: 0, y: 0 }, 300, function (q) { el.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () { el.style.transform = '' })
      }
      el.addEventListener('pointerup', function (ev) { end(ev, false) })
      el.addEventListener('pointercancel', function (ev) { end(ev, true) })
      el.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    }
    function bump () {
      api.sfx('bad')
      if (ring.animate && !api.reduced()) ring.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 320 })
    }
    function dropRound (el) {
      el.style.display = 'none'
      el.style.transform = ''
      api.sfx('bump')
      placeCoupler(true)
      api.fx('spark', GAP.x, GAP.y, 200)
      api.warn(L.fits)
      api.persist({ connected: true })
      api.later(function () { api.advance() }, 900)
    }

    var ctl = {
      onStep: function (n) {
        holding = false
        PLUGS.forEach(function (p) { plugEls[p.id].style.display = n === 1 ? 'block' : 'none' })
        ring.style.display = n === 1 ? 'block' : 'none'
        tag.style.opacity = n === 1 ? '1' : (connected ? '0' : '.0')
        if (n === 0) { tag.style.opacity = '0'; K.glow(pump, 3000) }
        if (n === 1) { tag.style.opacity = '1'; K.glow(ring, 3000); K.glow(tag, 3000) }
        if (n === 2) { setWater(0); K.glow(pump, 3000) }
      },
      onTool: function () {},
      demo: function () { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (s === 1) {
          K.glow(plugEls.bulat, 3000); K.glow(ring, 3000); K.glow(tag, 3000)
          if (lvl === 3) hand.move([{ x: PLUGS[0].x + 10, y: PLUGS[0].y + 10 }, { x: GAP.x - 30, y: GAP.y - 20 }], 1100)
          else if (lvl >= 4) dropRound(plugEls.bulat)
        } else {
          K.glow(pump, 3000)
          if (lvl === 3) hand.move([{ x: PUMP.x + 90, y: PUMP.y + 40 }, { x: PUMP.x + 90, y: PUMP.y + 40 }], 1800)
          else if (lvl >= 4) { holding = false; if (s === 0) { setWater(gapAt); spill() } else { setWater(1); setLevel(1); finish() } }
        }
      },
      win: function () { api.sfx('water') },
      destroy: function () { holding = false; cancelAnimationFrame(flowRaf) }
    }
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W02-M02', mod)
})(window)
