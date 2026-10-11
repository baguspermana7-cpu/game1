/* G32 Blippi -- W02-M01 "Kincir yang Menunggu" (PRD 11.3), played INSIDE bg-misi-kincir. Moved out of blippi-mission.js (this later registration wins) and retrofitted to the 9 rules:
 * Blippi in the water truck's cab, the hose end's target is a pulsing GHOST hose end (no orange ring / dashed arrow), no tool-tray gating (drag the hose, turn the valve, hold the pump),
 * and three questions: the hose colour (non-maths), then two SoalEngine maths questions (after the valve and after the pump). */
(function (w) {
  'use strict'
  var B = w.Blippi
  var A = w.BlippiArt
  var K = w.BlippiKit
  var register = w.BlippiMissionRegister
  void B

  var E0 = { x: 800, y: 600 }
  var T = { x: 975, y: 540 }
  var AN = { x: 535, y: 470 }
  var VAL = { x: 1040, y: 430 }

  function hosePath (e) {
    var c1 = { x: AN.x - 60, y: AN.y + 230 }
    var c2 = { x: e.x - 200, y: e.y + 120 }
    return 'M' + AN.x + ',' + AN.y + ' C' + c1.x + ',' + c1.y + ' ' + c2.x + ',' + c2.y + ' ' + e.x + ',' + e.y
  }

  register('W02-M01', { mount: function (api) {
    var sc = api.scene
    var NS = 'http://www.w3.org/2000/svg'
    var L = api.lines
    var connected = !!(api.restore && api.restore.step >= 1)
    var opened = !!(api.restore && api.restore.step >= 2)
    var E = connected ? { x: T.x - 38, y: T.y + 6 } : { x: E0.x, y: E0.y }
    var drag = null
    var attempts = 0
    var level = 0
    var holding = false
    var pumpRaf = 0
    var rot = 0

    api.art(sc, 'prop-kincir-rumah', 995, 175, 620, 500, 'house')
    // the wheel is centred on the house's axle tip (house art 615x495: axle at ~(455,255)) and rotates about its own centre
    var wheel = api.art(sc, 'prop-kincir-roda', 1285, 295, 320, 320, 'wheel')
    wheel.setAttribute('data-wheel', 'off')
    api.art(sc, 'prop-pipa', 962, 330, 150, 300)
    var truck = api.at(sc, '', 10, 190, 760, 495)
    truck.setAttribute('data-truck', '1')
    api.art(truck, 'veh-truk-air-sisi', 0, 0, 760, 495, '').setAttribute('data-veh', 'truk-air')
    K.driver(truck, { x: 0.395, y: 0.25, w: 0.11, h: 0.2 })
    var valve = api.art(sc, 'prop-katup', VAL.x - 50, VAL.y - 50, 100, 100, 'valve')
    valve.style.opacity = '0'
    valve.style.transformOrigin = '50% 50%'
    var pump = api.art(sc, 'prop-pompa-truk', 560, 480, 180, 120, 'pumpunit')
    pump.style.opacity = '0'
    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none'
    svg.innerHTML = '<path id="hose-o" fill="none" stroke="#B8860B" stroke-width="24" stroke-linecap="round"/>' +
      '<path id="hose-i" fill="none" stroke="#F5C518" stroke-width="16" stroke-linecap="round"/>' +
      '<path id="hose-w" class="flow" fill="none" stroke="#8fd0ff" stroke-width="8" stroke-linecap="round" opacity="0"/>' +
      '<g id="fall" opacity="0"><path d="M1190,300 L1190,330 M1230,296 L1230,330 M1270,292 L1270,330 M1310,296 L1310,330" stroke="#8fd0ff" stroke-width="8" stroke-linecap="round" class="fall" stroke-dasharray="14 10"/></g>'
    sc.appendChild(svg)
    var hoseO = svg.querySelector('#hose-o')
    var hoseI = svg.querySelector('#hose-i')
    var hoseW = svg.querySelector('#hose-w')
    var arrow = { style: {} }
    var fall = svg.querySelector('#fall')
    var ring = api.at(sc, 'tring', T.x - 98, T.y - 34, 120, 80)
    ring.style.cssText += ';pointer-events:none;z-index:3'
    ring.setAttribute('data-target', 'inlet')
    K.ghost(api, ring, 'prop-selang-ujung', 0, 0, 120, 80, false, true)
    var hend = api.at(sc, 'hend', 0, 0, 120, 80)
    hend.setAttribute('data-hose-end', '1')
    hend.style.touchAction = 'none'
    hend.style.cursor = 'grab'
    hend.style.zIndex = '5'
    hend.appendChild(A.frame('prop-selang-ujung'))
    var hand = api.at(sc, 'ghost hand-idle', 0, 0, 90, 90)
    hand.innerHTML = B.ICON.hand
    hand.style.opacity = '1'
    hand.style.left = '800px'
    hand.style.top = '640px'
    var ghost = api.at(sc, 'ghost', 0, 0, 90, 90)
    ghost.innerHTML = B.ICON.hand
    var meter = api.at(sc, 'meter', 540, 440, 240, 26)
    meter.style.display = 'none'
    meter.innerHTML = '<i></i>'
    meter.setAttribute('data-meter', '1')

    function setHose (e) {
      E = e
      var d = hosePath(e)
      hoseO.setAttribute('d', d)
      hoseI.setAttribute('d', d)
      hoseW.setAttribute('d', d)
      hend.style.transform = 'translate(' + (e.x - 60) + 'px,' + (e.y - 40) + 'px)'
    }
    setHose(E)
    if (connected) { hand.style.display = 'none'; ring.style.display = 'none' }

    function connect () {
      connected = true
      arrow.style.display = 'none'
      hand.style.display = 'none'
      ring.style.display = 'none'
      api.sfx('ok')
      api.fx('check-burst', T.x, T.y, 200)
      api.fx('droplets', T.x - 30, T.y + 40, 150)
      var to = { x: T.x - 38, y: T.y + 6 }
      api.tween(E, to, 220, setHose, function () { api.later(function () { api.persist({ connected: true }); K.ask(api, { custom: { id: 'm21-hose', prompt: 'Selang ini warna apa?', choices: ['Kuning', 'Biru', 'Merah'], answer: 'Kuning', hint1: 'Lihat selang di layar.' }, done: function () { api.advance() } }) }, 350) })
    }
    function dist (a, b) { var dx = a.x - b.x; var dy = a.y - b.y; return Math.sqrt(dx * dx + dy * dy) }
    function backHome (msg) {
      attempts++
      api.tween(E, { x: E0.x, y: E0.y }, 380, setHose)
      hend.firstChild.classList.remove('bounce'); void hend.offsetWidth; hend.firstChild.classList.add('bounce')
      if (msg) { api.warn(L.retry) }
      if (attempts >= 2 && api.step() === 0) api_hint(2)
    }
    function api_hint (lvl) { if (ctl.hint) ctl.hint(lvl) }

    hend.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 0 || connected || drag) return
      api.touch()
      var r = api.toRef(ev.clientX, ev.clientY)
      drag = { id: ev.pointerId, ox: E.x - r.x, oy: E.y - r.y }
      try { hend.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ }
      hand.style.display = 'none'
      hend.style.cursor = 'grabbing'
    })
    hend.addEventListener('pointermove', function (ev) {
      if (!drag || ev.pointerId !== drag.id) return
      var r = api.toRef(ev.clientX, ev.clientY)
      setHose({ x: r.x + drag.ox, y: r.y + drag.oy })
    })
    function end (ev, cancelled) {
      if (!drag || ev.pointerId !== drag.id) return
      drag = null
      hend.style.cursor = 'grab'
      if (cancelled) { backHome(false); return }
      if (dist(E, { x: T.x - 38, y: T.y + 6 }) <= 95) connect()
      else backHome(true)
    }
    hend.addEventListener('pointerup', function (ev) { end(ev, false) })
    hend.addEventListener('pointercancel', function (ev) { end(ev, true) })
    hend.addEventListener('lostpointercapture', function (ev) { end(ev, true) })

    /* step 2: valve */
    var acc = 0
    var vdrag = null
    var moved = 0
    function setRot (v) { rot = v; valve.style.transform = 'rotate(' + v + 'deg)' }
    function openValve () {
      if (opened) return
      opened = true
      api.sfx('ok')
      setRot(270)
      valve.setAttribute('data-valve', 'open')
      api.persist({ connected: true, opened: true })
      api.later(function () { K.ask(api, { context: 'gate', grade: 1, done: function () { api.advance() } }) }, 450)
    }
    function valveTurn () {
      if (api.step() !== 1) return
      setRot(Math.min(270, rot + 90))
      api.sfx('tap')
      if (rot >= 270) openValve()
    }
    valve.style.cursor = 'pointer'
    valve.style.touchAction = 'none'
    valve.setAttribute('data-valve', opened ? 'open' : 'closed')
    valve.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 1) return
      api.touch()
      var r = api.toRef(ev.clientX, ev.clientY)
      vdrag = { id: ev.pointerId, a: Math.atan2(r.y - VAL.y, r.x - VAL.x), x: r.x, y: r.y }
      moved = 0
      acc = 0
      try { valve.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ }
    })
    valve.addEventListener('pointermove', function (ev) {
      if (!vdrag || ev.pointerId !== vdrag.id) return
      var r = api.toRef(ev.clientX, ev.clientY)
      moved += Math.abs(r.x - vdrag.x) + Math.abs(r.y - vdrag.y)
      vdrag.x = r.x; vdrag.y = r.y
      var a = Math.atan2(r.y - VAL.y, r.x - VAL.x)
      var da = a - vdrag.a
      if (da > Math.PI) da -= 2 * Math.PI
      if (da < -Math.PI) da += 2 * Math.PI
      vdrag.a = a
      acc += da * 180 / Math.PI
      if (moved > 14) { setRot(Math.max(0, Math.min(270, acc))); if (rot >= 268) openValve() }
    })
    function vend (ev) {
      if (!vdrag || ev.pointerId !== vdrag.id) return
      var tap = moved < 14
      vdrag = null
      if (tap) valveTurn()
      else if (!opened) setRot(Math.round(rot / 90) * 90)
    }
    valve.addEventListener('pointerup', vend)
    valve.addEventListener('pointercancel', function () { vdrag = null })
    valve.addEventListener('lostpointercapture', function () { vdrag = null })

    /* step 3: hold the pump */
    function flow (on) { hoseW.setAttribute('opacity', on ? '1' : '0') }
    function setLevel (v) {
      level = Math.max(0, Math.min(1, v))
      meter.firstChild.style.width = (level * 100) + '%'
      meter.setAttribute('data-level', level.toFixed(2))
      flow(level > 0)
      if (level >= 1 && api.step() === 2) finishPump()
    }
    function finishPump () {
      holding = false
      cancelAnimationFrame(pumpRaf)
      api.persist({ connected: true, opened: true })
      K.ask(api, { context: 'gate', grade: 1, done: function () { api.advance() } })
    }
    function pumpLoop (t0) {
      var last = t0
      function f (t) {
        if (!holding || api.step() !== 2) return
        var dt = Math.min(60, t - last)
        last = t
        if (!api.paused()) setLevel(level + dt / 2200)
        pumpRaf = requestAnimationFrame(f)
      }
      pumpRaf = requestAnimationFrame(f)
    }
    pump.style.touchAction = 'none'
    pump.style.cursor = 'pointer'
    pump.style.zIndex = '4'
    pump.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 2) return
      api.touch()
      holding = true
      api.sfx('water')
      try { pump.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ }
      pumpLoop(performance.now())
    })
    function release () { holding = false }
    pump.addEventListener('pointerup', release)
    pump.addEventListener('pointercancel', release)
    pump.addEventListener('lostpointercapture', release)

    function ghostMove (pts, ms, cb) {
      ghost.style.opacity = '1'
      var i = 0
      function nextLeg () {
        if (i >= pts.length - 1) { ghost.style.opacity = '0'; if (cb) cb(); return }
        api.tween(pts[i], pts[i + 1], ms, function (p) { ghost.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)' }, function () { i++; nextLeg() })
      }
      ghost.style.transform = 'translate(' + pts[0].x + 'px,' + pts[0].y + 'px)'
      nextLeg()
    }

    var ctl = {
      onStep: function (n, initial) {
        if (n >= 1) valve.style.opacity = '1'
        if (n >= 2) { pump.style.opacity = '1'; meter.style.display = 'block' }
        if (n === 1) hand.style.display = 'none'
        if (n === 1 && !initial) api.sfx('ok')
        if (n >= 2) flow(false)
      },
      demo: function () { ctl.hint(1); ctl.hint(3) },
      onTool: function (id) {
        if (id === 'katup') { valve.classList.add('glow'); api.later(function () { valve.classList.remove('glow') }, 2200) }
        if (id === 'pompa') { pump.classList.add('glow'); api.later(function () { pump.classList.remove('glow') }, 2200) }
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          if (lvl === 1) { hend.classList.add('glow'); ring.classList.add('glow') }
          else if (lvl === 2) { hand.style.display = ''; hand.style.left = '800px' }
          else if (lvl === 3) { hand.style.display = 'none'; ghostMove([{ x: E0.x - 30, y: E0.y + 10 }, { x: T.x - 60, y: T.y - 10 }], 900) }
          else if (lvl >= 4 && !connected) { api.tween(E, { x: T.x - 38, y: T.y + 6 }, 400, setHose, connect) }
        } else if (s === 1) {
          if (lvl === 1) valve.classList.add('glow')
          else if (lvl === 2) { valve.classList.add('glow') }
          else if (lvl === 3) ghostMove([{ x: VAL.x - 30, y: VAL.y - 10 }, { x: VAL.x - 30, y: VAL.y - 20 }, { x: VAL.x - 30, y: VAL.y - 10 }], 400)
          else if (lvl >= 4) { openValve() }
        } else if (s === 2) {
          if (lvl === 1) pump.classList.add('glow')
          else if (lvl === 2) { pump.classList.add('glow') }
          else if (lvl === 3) ghostMove([{ x: 620, y: 520 }, { x: 625, y: 530 }, { x: 620, y: 520 }], 500)
          else if (lvl >= 4) { setLevel(1) }
        }
      },
      win: function () {
        flow(true)
        fall.setAttribute('opacity', '1')
        wheel.classList.add('on')
        wheel.setAttribute('data-wheel', 'on')
        api.sfx('water')
      },
      destroy: function () { holding = false; cancelAnimationFrame(pumpRaf) }
    }
    if (api.restore) setRot(opened ? 270 : 0)
    return ctl
  } })
})(window)
