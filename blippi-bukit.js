/* G32 Blippi -- W01-M03 "Bukit dan Muatan" (PRD: Predict & Test, controlled rig, ONE variable = ramp height), played INSIDE bg-w01-m03-bukit.
 * 1 KIRA-KIRA: guess which ramp sends the truck farther (no wrong answer). 2 UJI: test both ramps; a flag marks each stop on the painted lane stripes.
 * 3 ANTAR: carry the crate to the BLUE stripe: the low ramp stops short (kind reason + the high ramp glows), the high ramp arrives. */
(function (w) {
  'use strict'
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

    ;['low', 'high'].forEach(function (k) {
      var c = api.at(sc, 'panel', CARD[k].x, CARD[k].y, CARD[k].w, CARD[k].h, 'button')
      c.type = 'button'
      c.setAttribute('data-ramp', k)
      c.setAttribute('aria-label', k === 'low' ? 'Ramp rendah' : 'Ramp tinggi')
      c.style.cssText += ';cursor:pointer;z-index:4;padding:0;overflow:visible'
      var a = api.art(c, 'yard-tanjakan', 14, k === 'low' ? 56 : 8, 187, k === 'low' ? 84 : 130, '')
      void a
      var sc2 = k === 'low' ? 1 : 1
      void sc2
      var lb = api.at(c, '', 0, 150, 215, 44)
      lb.style.cssText += ';font:900 26px/44px Fredoka,Nunito,sans-serif;color:#13318A;text-align:center'
      lb.textContent = k === 'low' ? 'RENDAH' : 'TINGGI'
      c.addEventListener('click', function () { tap(k) })
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

    function roll (k, cargo, done) {
      busy = true
      crate.style.opacity = cargo ? '1' : '0'
      var from = { x: START_Y, y: 0 }
      var to = { x: STOP[k], y: 0 }
      api.sfx('honk')
      api.fx('dust', TX, START_Y, 150)
      api.tween(from, to, k === 'high' ? 1500 : 1100, function (p) { setTruck(p.x) }, function () {
        api.fx('dust', TX, STOP[k], 200)
        api.sfx('bump')
        busy = false
        if (done) done()
      })
    }
    function reset () { setTruck(START_Y); crate.style.opacity = '0' }

    function tap (k) {
      if (busy) return
      api.touch()
      var s = api.step()
      if (s === 0) {
        if (api.tool() !== 'kira') { api.warn(L.wrongTool); api.shakeTool('kira'); return }
        api.sfx('ok')
        api.persist({ pred: k, tested: tested })
        cards[k].classList.add('bounce')
        api.warn(L.guess)
        api.later(function () { api.advance() }, 800)
      } else if (s === 1) {
        if (api.tool() !== 'uji') { api.warn(L.wrongTool); api.shakeTool('uji'); return }
        reset()
        roll(k, false, function () {
          tested[k] = true
          flag(k, STOP[k])
          api.persist({ tested: tested })
          if (tested.low && tested.high) { api.warn(L.both); api.fx('gold-star', TX, 620, 220); api.later(function () { reset(); api.advance() }, 1800) }
        })
      } else {
        if (api.tool() !== 'antar') { api.warn(L.wrongTool); api.shakeTool('antar'); return }
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
    var ctl = {
      onStep: function (n) {
        ;['low', 'high'].forEach(function (k) { cards[k].classList.remove('bounce') })
        if (n === 0) { cards.low.classList.add('glow'); cards.high.classList.add('glow'); setTimeout(function () { cards.low.classList.remove('glow'); cards.high.classList.remove('glow') }, 2600) }
        reset()
      },
      demo: function (n) {
        this.hint(1)
        var K = w.BlippiKit
        if (!K) return
        if (!hd) hd = K.hand(api)
        var c = n === 1 && tested.low ? CARD.high : CARD.low
        var pt = { x: c.x + 90, y: c.y + 50 }
        hd.move([pt, { x: pt.x, y: pt.y - 16 }, pt], 420)
      },
      onTool: function () {},
      hint: function (lvl) {
        var s = api.step()
        var want = s === 1 ? (tested.low ? 'high' : 'low') : 'high'
        var tool = ['kira', 'uji', 'antar'][s]
        if (api.tool() !== tool) api.glowTool(tool, 3000)
        cards[want].classList.add('glow'); setTimeout(function () { cards[want].classList.remove('glow') }, 2600)
        if (lvl >= 4 && api.tool() === tool) tap(want)
      },
      win: function () { api.sfx('ok') },
      destroy: function () {}
    }
    if (rs) reset()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M03', mod)
})(window)
