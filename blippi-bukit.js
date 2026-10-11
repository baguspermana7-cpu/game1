/* G32 Blippi -- W01-M03 "Bukit dan Muatan" (PRD: Predict & Test, controlled rig, ONE variable = ramp height), played INSIDE bg-w01-m03-bukit.
 * 1 KIRA-KIRA: guess which ramp sends the truck farther (no wrong answer). 2 UJI: test both ramps; a flag marks each stop on the painted lane stripes.
 * 3 ANTAR: carry the crate to the BLUE stripe: the low ramp stops short (kind reason + the high ramp glows), the high ramp arrives. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var STOP = { low: 598, high: 690 }   // truck bottom y after the roll (yellow stripe y566, blue y656)
  var START_Y = 506
  var TX = 840
  var CARD = { low: { x: 30, y: 400, w: 215, h: 200 }, high: { x: 262, y: 400, w: 215, h: 200 } }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var tested = saved.tested || { low: false, high: false }
    var rs = api.restore
    var busy = false
    var hd = null
    var cards = {}
    var flags = {}

    // the two ramps are real pieces standing on the grass slope (taller one = taller drawing); tap one to guess, later drop the truck on one to test
    var RAMP = { low: { x: 40, y: 500, w: 230, h: 108, key: 'pc-ramp-low' }, high: { x: 250, y: 400, w: 240, h: 168, key: 'pc-ramp-high' } }
    ;['low', 'high'].forEach(function (k) {
      var r = RAMP[k]
      var c = api.at(sc, 'ramp', r.x, r.y, r.w, r.h, 'button')
      c.type = 'button'
      c.setAttribute('data-ramp', k)
      c.setAttribute('aria-label', k === 'low' ? 'Ramp rendah' : 'Ramp tinggi')
      c.style.cssText += ';background:none;border:0;cursor:pointer;z-index:4;padding:0;overflow:visible;touch-action:manipulation'
      api.art(c, r.key, 0, 0, r.w, r.h, '')
      c.addEventListener('click', function () { if (api.step() === 0) tap(k); else if (api.step() > 0) { api.touch(); api.warn('Seret trukmu ke ramp.') } })
      cards[k] = c
    })
    // test lane flags (one per ramp, saved)
    function flag (k, y) {
      if (flags[k]) return
      var f = api.art(sc, 'prop-bendera', k === 'low' ? 650 : 1030, y - 90, 56, 90, '')
      f.style.zIndex = '3'
      f.style.filter = k === 'low' ? 'hue-rotate(0deg)' : 'hue-rotate(160deg) saturate(1.2)'
      if (f.animate && !api.reduced()) f.animate([{ transform: 'translateY(-60px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' })
      flags[k] = f
    }
    if (tested.low) flag('low', STOP.low)
    if (tested.high) flag('high', STOP.high)

    // the truck (3/4 front, grows toward the viewer) + its crate
    var truck = api.at(sc, '', 0, 0, 520, 315)
    truck.style.zIndex = '5'
    truck.style.pointerEvents = 'none'
    truck.setAttribute('data-truck', '1')
    truck.style.touchAction = 'none'
    truck.style.transformOrigin = '50% 100%'
    api.art(truck, 'veh-truk-air', 0, 0, 520, 315, '')
    var crate = document.createElement('img')
    crate.src = '../Dunia-Emosi/assets/db/lib/game/crate-wood.webp'
    crate.alt = ''
    crate.style.cssText = 'position:absolute;left:160px;top:10px;width:170px;height:155px;object-fit:contain;opacity:0'
    truck.appendChild(crate)
    var shadow = api.at(sc, 'shd', 0, 0, 440, 60)
    shadow.style.zIndex = '4'
    function setTruck (yb, scale) {
      scale = scale == null ? 0.62 + (yb - START_Y) / 500 : scale
      var s = Math.max(0.62, Math.min(1.05, scale))
      truck.style.transform = 'translate(' + (TX - 260) + 'px,' + (yb - 315) + 'px) scale(' + s + ')'
      shadow.style.transform = 'translate(' + (TX - 220) + 'px,' + (yb - 20) + 'px) scale(' + s + ')'
    }
    setTruck(START_Y)

    function setTruckXY (x, yb, sc2) {
      truck.style.transform = 'translate(' + (x - 260) + 'px,' + (yb - 315) + 'px) scale(' + sc2 + ')'
      shadow.style.transform = 'translate(' + (x - 220) + 'px,' + (yb - 20) + 'px) scale(' + sc2 + ')'
    }
    function roll (k, cargo, done) {
      busy = true
      crate.style.opacity = cargo ? '1' : '0'
      var rp = RAMP[k]
      var top = { x: rp.x + rp.w * 0.45, y: rp.y + rp.h * 0.6 }
      api.sfx('honk')
      // climbs onto the chosen ramp, rolls off its foot into the lane, then coasts to where its push runs out
      api.tween(top, { x: TX, y: START_Y }, 650, function (p) { setTruckXY(p.x, p.y, 0.55 + 0.07 * (p.y - top.y) / Math.max(1, START_Y - top.y)) }, function () {
        api.fx('dust', TX, START_Y, 150)
        api.tween({ x: START_Y, y: 0 }, { x: STOP[k], y: 0 }, k === 'high' ? 1500 : 1100, function (p) { setTruck(p.x) }, function () {
          api.fx('dust', TX, STOP[k], 200)
          api.sfx('bump')
          busy = false
          if (done) done()
        })
      })
    }
    function reset () { setTruck(START_Y); crate.style.opacity = '0' }

    function tap (k) {
      if (busy || api.step() !== 0) return
      api.touch()
      api.sfx('ok')
      api.persist({ pred: k, tested: tested })
      cards[k].classList.add('bounce')
      api.warn(L.guess)
      api.later(function () { api.advance() }, 800)
    }
    function useRamp (k) {
      var s = api.step()
      if (s === 1) {
        reset()
        roll(k, false, function () {
          tested[k] = true
          flag(k, STOP[k])
          api.persist({ tested: tested })
          if (tested.low && tested.high) { api.warn(L.both); api.fx('gold-star', TX, 620, 220); api.later(function () { reset(); api.advance() }, 1800) }
        })
      } else if (s === 2) {
        reset()
        roll(k, true, function () {
          if (k === 'high') {
            api.fx('confetti', TX, 690, 320)
            api.later(function () { api.persist({ tested: tested }); api.advance() }, 900)
          } else {
            api.warn(L.short)
            cards.high.classList.add('glow'); setTimeout(function () { cards.high.classList.remove('glow') }, 3000)
            api.later(reset, 900)
          }
        })
      }
    }
    // drag the truck onto a ramp (tests / delivery)
    var td = null
    truck.addEventListener('pointerdown', function (ev) {
      if (busy || api.step() < 1 || td) return
      api.touch()
      var p = api.toRef(ev.clientX, ev.clientY)
      td = { id: ev.pointerId, x0: p.x, y0: p.y, moved: 0, p: p }
      try { truck.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    truck.addEventListener('pointermove', function (ev) {
      if (!td || ev.pointerId !== td.id) return
      var p = api.toRef(ev.clientX, ev.clientY)
      td.p = p
      td.moved = Math.max(td.moved, Math.abs(p.x - td.x0) + Math.abs(p.y - td.y0))
      if (td.moved > 10) setTruckXY(p.x, p.y + 70, 0.7)
    }, false)
    function tEnd (ev, cancel) {
      if (!td || ev.pointerId !== td.id) return
      var cur = td
      td = null
      var hit = null
      ;['low', 'high'].forEach(function (k) { var r = RAMP[k]; if (cur.p.x > r.x - 30 && cur.p.x < r.x + r.w + 30 && cur.p.y > r.y - 30 && cur.p.y < r.y + r.h + 40) hit = k })
      if (!cancel && cur.moved > 10 && hit) { useRamp(hit); return }
      if (!cancel) { api.warn(cur.moved > 10 ? 'Belum di ramp. Seret truk ke salah satu ramp.' : 'Seret truk ke ramp.'); ;['low', 'high'].forEach(function (k) { K.glow(cards[k], 2600) }) }
      var back = { x: cur.p.x, y: cur.p.y + 70 }
      api.tween(back, { x: TX, y: START_Y }, 320, function (q) { setTruckXY(q.x, q.y, 0.62) }, reset)
    }
    truck.addEventListener('pointerup', function (ev) { tEnd(ev, false) })
    truck.addEventListener('pointercancel', function (ev) { tEnd(ev, true) })
    truck.addEventListener('lostpointercapture', function (ev) { tEnd(ev, true) })

    var ctl = {
      onStep: function (n) {
        ;['low', 'high'].forEach(function (k) { cards[k].classList.remove('bounce') })
        if (n === 0) { cards.low.classList.add('glow'); cards.high.classList.add('glow'); setTimeout(function () { cards.low.classList.remove('glow'); cards.high.classList.remove('glow') }, 2600) }
        reset()
        truck.style.pointerEvents = n >= 1 ? 'auto' : 'none'
        truck.style.cursor = n >= 1 ? 'grab' : 'default'
      },
      demo: function (n) {
        this.hint(1)
        if (!K) return
        if (!hd) hd = K.hand(api)
        var want = n === 1 && tested.low ? 'high' : (n === 0 ? 'low' : 'high')
        var r = RAMP[want]
        if (n === 0) hd.move([{ x: r.x + r.w / 2 - 30, y: r.y + r.h / 2 - 30 }, { x: r.x + r.w / 2 - 30, y: r.y + r.h / 2 - 46 }, { x: r.x + r.w / 2 - 30, y: r.y + r.h / 2 - 30 }], 420)
        else hd.move([{ x: TX - 40, y: START_Y - 120 }, { x: r.x + r.w / 2 - 30, y: r.y + r.h / 2 - 30 }], 1100)
      },
      onTool: function () {},
      hint: function (lvl) {
        var s = api.step()
        var want = s === 1 ? (tested.low ? 'high' : 'low') : 'high'
        cards[want].classList.add('glow'); setTimeout(function () { cards[want].classList.remove('glow') }, 2600)
        if (s > 0) { truck.classList.add('glow'); setTimeout(function () { truck.classList.remove('glow') }, 2600) }
        if (lvl >= 4) { if (s === 0) tap(want); else useRamp(want) }
      },
      win: function () { api.sfx('ok') },
      destroy: function () {}
    }
    if (rs) { reset(); if (rs.step >= 1) { truck.style.pointerEvents = 'auto' } }
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M03', mod)
})(window)
