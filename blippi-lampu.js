/* G32 Blippi -- W06-M04 "Lampu Wahana Menyala" (PRD 11.7: Fix & Transform; P02/P03/P11; "Pasang konektor bentuk saat daya mainan mati; pilih urutan lampu"; replay "urutan 3-6 simbol berbeda"; V12 monster test truck drives onto the lit stage), played INSIDE bg-w06-m04-lampu.
 * The toy ride has no power: the control box (top) has three empty shaped sockets (ghost plugs), four paper lanterns stand dark, three shaped connectors lie on the plaza, the truck (Blippi at the wheel) waits at the left.
 * 1 SAMBUNG (fix, drag by shape): drag each connector to the socket of its own shape (circle / square / triangle). A wrong shape floats back with a reason. The lanterns blink awake. Then "4 lampion, 1 menyala. Berapa yang padam?".
 * 2 URUTAN  (sequence): the lanterns flash a pattern of 3 (5 on a replay); tap them back in the same order. A slip dims them softly and replays; after two slips the next lantern is pointed out. Then "3 + 2 kedipan: berapa semuanya?".
 * 3 PANGGUNG (hold to drive): HOLD the truck, it rolls onto the blue stage pad; the lanterns pulse, the show begins. Then a maths-only SoalEngine question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 300
  var TH = 240
  var TS = 0.85
  var HOME = { x: 200, y: 735 }
  var STAGE = { x: 830, y: 735 }
  var PANEL = { x: 590, y: 235, w: 540, h: 172 }
  var KONS = [
    { id: 'bulat', key: 'w6-kon-bulat', name: 'bulat', x: 520, y: 590 },
    { id: 'kotak', key: 'w6-kon-kotak', name: 'kotak', x: 705, y: 590 },
    { id: 'segitiga', key: 'w6-kon-segitiga', name: 'segitiga', x: 890, y: 590 }
  ]
  var SOCK = { bulat: { x: 30, y: 18 }, kotak: { x: 200, y: 18 }, segitiga: { x: 370, y: 18 } }
  var KW = 140
  var KH = 140
  var LAMPS = [
    { x: 600, y: 410, f: 'none', glow: '#FFB02E', sfx: 'tap' },
    { x: 790, y: 410, f: 'hue-rotate(160deg)', glow: '#4FA9FF', sfx: 'collect' },
    { x: 980, y: 410, f: 'hue-rotate(95deg)', glow: '#5CE05C', sfx: 'ok' },
    { x: 1170, y: 410, f: 'hue-rotate(-55deg)', glow: '#FF5FA8', sfx: 'boost' }
  ]
  var LW = 150
  var LH = 190

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var fitted = saved.fitted || {}
    var busy = false
    var hd = null
    var cur = { x: HOME.x, y: HOME.y }
    var arrived = false
    if (step0 >= 1) { fitted.bulat = true; fitted.kotak = true; fitted.segitiga = true }
    function save () { api.persist({ fitted: fitted }) }
    function nFit () { return Object.keys(fitted).length }
    var seqLen = B.state().done && B.state().done['W06-M04'] ? 5 : 3

    // ---- the control box with three shaped sockets and a power light
    var panel = api.at(sc, 'ctlbox', PANEL.x, PANEL.y, PANEL.w, PANEL.h)
    panel.setAttribute('data-ctlbox', '1')
    panel.style.cssText += ';z-index:3;pointer-events:none;background:linear-gradient(#27407f,#1b2d63);border:7px solid #F4761A;border-radius:28px;box-shadow:0 8px 18px rgba(0,0,0,.35)'
    var led = api.at(panel, 'led', PANEL.w - 54, 12, 30, 30)
    led.style.cssText += ';border-radius:50%;background:#E23B3B;border:4px solid #fff;box-shadow:0 0 10px #E23B3B;transition:background .3s'
    var sockEl = {}
    var konEl = {}
    Object.keys(SOCK).forEach(function (k) {
      var kd = KONS.filter(function (q) { return q.id === k })[0]
      var g = K.ghost(api, panel, kd.key, SOCK[k].x, SOCK[k].y, KW, KH, false, true)
      g.setAttribute('data-sock', k)
      g.style.zIndex = '2'
      sockEl[k] = g
      if (fitted[k]) g.style.display = 'none'
    })
    function setLed () { var on = nFit() >= KONS.length; led.style.background = on ? '#3DB544' : '#E23B3B'; led.style.boxShadow = '0 0 12px ' + (on ? '#3DB544' : '#E23B3B') }
    setLed()

    // ---- the lanterns (dark at first)
    var lamps = []
    var lampOn = false
    LAMPS.forEach(function (lp, i) {
      var e = api.at(sc, 'lamp', lp.x, lp.y, LW, LH, 'button')
      e.type = 'button'
      e.setAttribute('data-lamp', String(i))
      e.setAttribute('aria-label', 'Lampion ' + (i + 1))
      e.style.cssText += ';background:none;border:0;padding:0;z-index:4;cursor:pointer;touch-action:manipulation;pointer-events:none;transition:filter .25s'
      var a = api.art(e, 'w6-lampion', 0, 0, LW, LH, '')
      a.style.filter = lp.f === 'none' ? '' : lp.f
      lamps.push({ el: e, art: a, lp: lp })
      setDim(i)
      e.addEventListener('click', function () { tapLamp(i) })
    })
    function setDim (i) { lamps[i].el.style.filter = 'brightness(.42) saturate(.55)' }
    function setLit (i, on) {
      var l = lamps[i]
      l.el.style.filter = on ? 'brightness(1.3) saturate(1.2) drop-shadow(0 0 24px ' + l.lp.glow + ') drop-shadow(0 0 48px ' + l.lp.glow + ')' : (lampOn ? 'brightness(1)' : 'brightness(.42) saturate(.55)')
    }
    function flash (i, ms) {
      setLit(i, true)
      api.sfx(LAMPS[i].sfx)
      api.fx('spark', LAMPS[i].x + LW / 2, LAMPS[i].y + LH * 0.45, 130)
      var e = lamps[i].el
      if (e.animate && !api.reduced()) e.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: Math.min(ms, 420) })
      api.later(function () { setLit(i, false) }, ms)
    }
    function wake () {
      // the lanterns blink awake once, then stay softly lit
      lampOn = true
      lamps.forEach(function (l, i) { api.later(function () { flash(i, 350) }, i * 160) })
      api.later(function () { lamps.forEach(function (l, i) { setLit(i, false) }) }, 1100)
    }
    if (step0 >= 1) { lampOn = true; lamps.forEach(function (l, i) { setLit(i, false) }) }
    if (step0 >= 2) lamps.forEach(function (l, i) { setLit(i, true) })

    // ---- step 1: the three connectors, drag each to its shape
    KONS.forEach(function (kd, i) {
      var c = api.at(sc, 'plug', kd.x, kd.y, KW, KH, 'button')
      c.type = 'button'
      c.setAttribute('data-kon', kd.id)
      c.setAttribute('aria-label', 'Konektor ' + kd.name)
      c.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;pointer-events:none'
      api.art(c, kd.key, 0, 0, KW, KH, '')
      if (c.animate && !api.reduced()) c._bob = c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1700 + i * 200, iterations: Infinity, easing: 'ease-in-out' })
      konEl[kd.id] = c
      if (fitted[kd.id]) snap(kd.id, c, false)
      var d = null
      c.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 0 || busy || d || fitted[kd.id]) return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
        c.classList.remove('glow'); c.style.zIndex = '30'
        if (c._bob) c._bob.cancel()
        api.sfx('collect'); api.fx('spark', r.x, r.y, 70)
        try { c.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      c.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        c.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.06)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        c.style.zIndex = '7'
        var near = null
        var bd = 1e9
        Object.keys(SOCK).forEach(function (k) {
          if (fitted[k]) return
          var q = Math.hypot(cu.p.x - (PANEL.x + SOCK[k].x + KW / 2), cu.p.y - (PANEL.y + SOCK[k].y + KH / 2))
          if (q < 150 && q < bd) { near = k; bd = q }
        })
        if (!cancel && cu.moved > 10 && near) {
          if (near === kd.id) { fit(kd, c); return }
          api.sfx('bad'); api.warn(L.wrongShape.replace('%a', kd.name).replace('%b', near))
          wobble(sockEl[near]); K.glow(sockEl[kd.id], 2800)
        } else if (!cancel) { api.sfx('bad'); api.warn(cu.moved > 10 ? L.toSocket : L.dragKon) }
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 300, function (t) { c.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { c.style.transform = '' })
      }
      c.addEventListener('pointerup', function (ev) { end(ev, false) })
      c.addEventListener('pointercancel', function (ev) { end(ev, true) })
      c.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    function wobble (el) { if (el && el.animate && !api.reduced()) el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-5deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], { duration: 320 }) }
    function snap (id, c) {
      if (c._bob) c._bob.cancel()
      c.setAttribute('data-gone', '1')
      c.style.pointerEvents = 'none'
      c.style.transform = 'translate(' + (PANEL.x + SOCK[id].x - KONS.filter(function (q) { return q.id === id })[0].x) + 'px,' + (PANEL.y + SOCK[id].y - KONS.filter(function (q) { return q.id === id })[0].y) + 'px)'
      c.style.zIndex = '5'
      if (sockEl[id]) sockEl[id].style.display = 'none'
    }
    function fit (kd, c) {
      fitted[kd.id] = true
      snap(kd.id, c)
      api.sfx('bump'); api.sfx('collect')
      api.fx('spark', PANEL.x + SOCK[kd.id].x + KW / 2, PANEL.y + SOCK[kd.id].y + KH / 2, 200)
      api.fx('dust', PANEL.x + SOCK[kd.id].x + KW / 2, PANEL.y + PANEL.h, 100)
      save()
      setLed()
      if (nFit() >= KONS.length) {
        api.sfx('ok')
        api.fx('gold-star', PANEL.x + PANEL.w / 2, PANEL.y + 80, 260)
        api.warn(L.powered)
        wake()
        api.later(function () {
          K.ask(api, { custom: { id: 'm06d-off', prompt: '4 lampion. 1 sudah menyala. Berapa yang masih padam?', choices: ['2', '3', '4'], answer: '3', scene: { groups: [{ key: 'w6-lampion', n: 3 }, { key: 'w6-lampion', n: 1, role: 'leave' }] }, hint1: 'Hitung lampion yang gelap.' }, done: function () { api.later(function () { api.advance() }, 400) } })
        }, 1500)
      } else api.warn(L.more)
    }

    // ---- step 2: remember the order of the lanterns
    var seq = []
    var pos = 0
    var fails = 0
    var phase = 'idle'
    function makeSeq () {
      seq = []
      var i
      for (i = 0; i < seqLen; i++) { var v = Math.floor(Math.random() * 4); if (i > 0 && v === seq[i - 1] && Math.random() < 0.6) v = (v + 1 + Math.floor(Math.random() * 3)) % 4; seq.push(v) }
    }
    function showSeq () {
      sc.setAttribute('data-seq', seq.join(','))     // test seam: the sheet / qa read the pattern here
      phase = 'show'
      pos = 0
      lamps.forEach(function (l) { l.el.style.pointerEvents = 'none' })
      api.warn(L.watch)
      seq.forEach(function (v, i) { api.later(function () { flash(v, 560) }, 700 + i * 820) })
      api.later(function () {
        phase = 'play'
        lamps.forEach(function (l) { l.el.style.pointerEvents = 'auto' })
        api.warn(L.yourTurn)
        if (fails >= 2) K.glow(lamps[seq[0]].el, 3000)
      }, 700 + seq.length * 820 + 200)
    }
    function tapLamp (i) {
      if (api.step() !== 1 || phase !== 'play') return
      api.touch()
      if (i === seq[pos]) {
        flash(i, 360)
        pos++
        if (pos >= seq.length) { done2(); return }
        if (fails >= 2) api.later(function () { K.glow(lamps[seq[pos]].el, 2500) }, 300)
      } else {
        phase = 'wait'
        fails++
        api.sfx('bad')
        lamps.forEach(function (l, j) { wobble(l.el); setDim(j) })
        api.warn(L.slip)
        api.later(function () { lamps.forEach(function (l, j) { setLit(j, false) }); showSeq() }, 1500)
      }
    }
    function done2 () {
      phase = 'done'
      lamps.forEach(function (l) { l.el.style.pointerEvents = 'none' })
      api.sfx('ok'); api.sfx('win')
      lampOn = true
      lamps.forEach(function (l, i) { api.later(function () { setLit(i, true) }, i * 140) })
      api.fx('confetti', 900, 450, 380); api.fx('gold-star', 900, 480, 280)
      api.warn(L.remembered)
      api.later(function () {
        K.ask(api, { custom: { id: 'm06d-sum', prompt: 'Lampion berkedip ' + seqLen + ' kali, lalu 2 kali lagi. Berapa semuanya?', choices: [String(seqLen + 1), String(seqLen + 2), String(seqLen + 3)], answer: String(seqLen + 2), scene: { groups: [{ key: 'w6-lampion', n: seqLen }, { key: 'w6-lampion', n: 2 }] }, hint1: 'Hitung semua lampion berkedip.' }, done: function () { api.later(function () { api.advance() }, 400) } })
      }, 1300)
    }

    // ---- the truck (Blippi at the wheel): step 3, hold to drive onto the stage pad
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk uji monster')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:6;touch-action:none;transform-origin:50% 100%;cursor:default'
    var tart = api.art(truck, 'veh-monster-truck', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'monster-truck')
    K.driver(truck, { x: 0.38, y: 0.14, w: 0.27, h: 0.2 })
    var shade = api.at(sc, 'shd', 0, 0, 280, 40)
    shade.style.zIndex = '5'
    function placeTruck (x, y, sq) {
      cur = { x: x, y: y }
      truck.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH) + 'px) scale(' + TS + ',' + (TS * (sq || 1)) + ')'
      shade.style.transform = 'translate(' + (x - 140 * TS) + 'px,' + (y - 22) + 'px) scale(' + TS + ')'
    }
    placeTruck(HOME.x, HOME.y)
    var goalG = null
    var u = 0
    var hold = false
    var raf = 0
    var lastT = 0
    function pathAt (v) { return { x: HOME.x + (STAGE.x - HOME.x) * v, y: HOME.y } }
    function drive (now) {
      if (!hold || arrived) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      u = Math.min(1, u + dt / 2800)
      var p = pathAt(u)
      placeTruck(p.x, p.y + Math.sin(now / 70) * 1.2)
      if (Math.random() < 0.3) api.fx('dust', p.x - 110, p.y - 8, 70)
      if (u >= 1) { hold = false; arrive(); return }
      raf = requestAnimationFrame(drive)
    }
    truck.addEventListener('pointerdown', function (ev) {
      var s = api.step()
      api.touch()
      if (busy || arrived) return
      if (s < 2) { api.sfx('bad'); api.warn(s === 0 ? L.fixFirst : L.lightsFirst); wobble(truck); return }
      try { truck.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      hold = true; lastT = performance.now(); api.sfx('honk'); api.sfx('boost'); raf = requestAnimationFrame(drive)
    })
    function release () { if (hold) { hold = false; cancelAnimationFrame(raf); if (!arrived && u < 1) api.warn(L.holdMore) } }
    truck.addEventListener('pointerup', release)
    truck.addEventListener('pointercancel', release)
    truck.addEventListener('lostpointercapture', release)
    function arrive () {
      if (arrived) return
      arrived = true
      cancelAnimationFrame(raf)
      if (goalG) goalG.style.display = 'none'
      placeTruck(STAGE.x, STAGE.y)
      api.sfx('bump'); api.sfx('honk')
      api.fx('dust', STAGE.x - 100, STAGE.y, 170)
      // the show: lanterns pulse left to right twice, stars and confetti
      var t = 0
      var r
      for (r = 0; r < 2; r++) lamps.forEach(function (l, i) { api.later(function () { flash(i, 360) }, 300 + t++ * 240) })
      api.later(function () { api.sfx('win'); api.fx('confetti', STAGE.x, 430, 400); api.fx('gold-star', STAGE.x, 460, 300); api.warn(L.show); lamps.forEach(function (l, i) { setLit(i, true) }) }, 300 + 8 * 240)
      api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { api.later(function () { api.advance() }, 300) } }) }, 300 + 8 * 240 + 1100)
    }

    function firstKon () { var r = null; KONS.forEach(function (k) { if (!r && !fitted[k.id]) r = k }); return r }
    var ctl = {
      onStep: function (n) {
        KONS.forEach(function (k) { var c = konEl[k.id]; c.style.pointerEvents = n === 0 && !fitted[k.id] ? 'auto' : 'none'; c.classList.remove('glow'); if (n === 0 && !fitted[k.id]) c.classList.add('glow') })
        truck.style.cursor = n === 2 ? 'grab' : 'default'
        if (n === 1) { makeSeq(); fails = 0; api.later(showSeq, 600) }
        if (n === 2) { if (!goalG) { goalG = K.ghost(api, sc, 'veh-monster-truck', STAGE.x - TW * TS / 2, STAGE.y - TH * TS, TW * TS, TH * TS, false, true); goalG.setAttribute('data-goal', '1') } K.glow(truck, 3200); api.warn(L.tapTruck) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var k = firstKon(); if (k) hd.move([{ x: k.x + 60, y: k.y + 60 }, { x: PANEL.x + SOCK[k.id].x + 60, y: PANEL.y + SOCK[k.id].y + 70 }], 1300) }
        else if (n === 1 && phase === 'play' && seq[pos] != null) hd.move([{ x: LAMPS[seq[pos]].x + 70, y: LAMPS[seq[pos]].y + 80 }, { x: LAMPS[seq[pos]].x + 70, y: LAMPS[seq[pos]].y + 80 }], 1200)
        else if (n === 2) hd.move([{ x: cur.x - 30, y: cur.y - 130 }, { x: cur.x - 30, y: cur.y - 130 }], 2200)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var k = firstKon()
          if (!k) return
          K.glow(konEl[k.id], 3000)
          if (lvl >= 2) K.glow(sockEl[k.id], 3000)
          if (lvl >= 4) fit(k, konEl[k.id])
        } else if (s === 1) {
          if (phase === 'play' && seq[pos] != null) { K.glow(lamps[seq[pos]].el, 3000); if (lvl >= 4) tapLamp(seq[pos]) } else if (phase === 'idle' || phase === 'wait') { /* wait for the replay */ }
        } else {
          K.glow(truck, 3000)
          if (lvl >= 4 && !arrived) { placeTruck(STAGE.x, STAGE.y); arrive() }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { hold = false; cancelAnimationFrame(raf); busy = false }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W06-M04', mod)
})(window)
