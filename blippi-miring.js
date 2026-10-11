/* G32 Blippi -- W05-M03 "Muatan Miring" (PRD 11.6: Predict & Test; P05/P09; "Bandingkan beban di satu sisi dan terbagi"; V11 = HARBOR FERRY), played INSIDE bg-w05-m03-muatan-miring.
 * The ferry (Blippi in the cab) floats by the test pontoon and LEANS toward the heavier side, live, as crates go on or off the deck (a bubble level shows it too).
 * 1 TEBAK  (predict): three crates sit on the LEFT; "Kapal miring ke mana?" (Kiri / Kanan / Lurus), then the ferry shows it.
 * 2 SAMA   (balance by adding): "Kiri 3 peti, kanan perlu berapa?" then drag spare crates onto the right side (ghost crates) until it is level. Too many: it leans right and the line says so; drag one off.
 * 3 GESER  (change the position, not the total): four crates all on the left; drag two across to the right. Then "2 dan 2" and a SoalEngine maths question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 400
  var TH = 384
  var FX = 930
  var FY = 730
  var DW = 64
  var DH = 48
  var PW = 120
  var PH = 90
  var LS = [{ x: 0.37, y: 0.61 }, { x: 0.49, y: 0.61 }, { x: 0.37, y: 0.52 }, { x: 0.49, y: 0.52 }]
  var RS = [{ x: 0.68, y: 0.61 }, { x: 0.80, y: 0.61 }, { x: 0.68, y: 0.52 }, { x: 0.80, y: 0.52 }]
  var PILE = [{ x: 90, y: 560 }, { x: 230, y: 575 }, { x: 370, y: 560 }, { x: 510, y: 575 }]
  var SPLIT = 0.6

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var step0 = api.restore ? api.restore.step : 0
    var busy = false
    var hd = null
    var done2 = false
    var cs = []
    function save () { api.persist({}) }

    // ---- the ferry: positioned > tilt (rotates) > art + driver + deck crates
    var ferry = api.at(sc, '', FX - TW / 2, FY - TH, TW, TH)
    ferry.setAttribute('data-ferry', '1')
    ferry.style.zIndex = '6'
    ferry.style.pointerEvents = 'none'
    var tilt = api.at(ferry, '', 0, 0, TW, TH)
    tilt.style.cssText += ';transform-origin:50% 82%;transition:transform .7s cubic-bezier(.34,1.5,.64,1)'
    var fart = api.art(tilt, 'veh-harbor-ferry', 0, 0, TW, TH, '')
    fart.setAttribute('data-veh', 'harbor-ferry')
    K.driver(tilt, { x: 0.275, y: 0.285, w: 0.2, h: 0.115 })
    var shade = api.at(sc, 'wake', FX - 190, FY - 24, 380, 46)
    shade.style.cssText += ';z-index:5;pointer-events:none;border-radius:50%;background:radial-gradient(ellipse at center,rgba(255,255,255,.55),rgba(255,255,255,0) 70%)'
    var NS = 'http://www.w3.org/2000/svg'
    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:4'
    sc.appendChild(svg)

    // ---- bubble level (a picture of "level")
    var lvl = api.at(sc, 'level', 1290, 300, 280, 84)
    lvl.setAttribute('data-level', '1')
    lvl.style.cssText += ';z-index:7;pointer-events:none;background:#FFF8E6;border:6px solid #13318A;border-radius:42px'
    var tube = api.at(lvl, '', 24, 24, 232, 28)
    tube.style.cssText += ';border-radius:14px;background:linear-gradient(#cfeaff,#8fc6f0);border:3px solid #13318A'
    var mark = api.at(tube, '', 106, 0, 20, 22)
    mark.style.cssText += ';border-left:3px solid #13318A;border-right:3px solid #13318A'
    var bub = api.at(tube, '', 100, 1, 32, 22)
    bub.style.cssText += ';border-radius:50%;background:#fff;border:3px solid #13318A;transition:left .6s cubic-bezier(.34,1.5,.64,1),background .3s'

    function count (t) { return cs.filter(function (c) { return c.loc.t === t }).length }
    function lean () {
      var d = Math.max(-12, Math.min(12, (count('R') - count('L')) * 3.6))
      tilt.style.transform = 'rotate(' + d + 'deg)'
      bub.style.left = (100 - d * 7) + 'px'
      var ok = count('R') === count('L') && count('L') > 0
      bub.style.background = ok ? '#41C27D' : '#fff'
      return ok
    }
    function slotPos (c) {
      var s = c.loc.t === 'L' ? LS[c.loc.i] : RS[c.loc.i]
      return { x: s.x * TW - DW / 2, y: s.y * TH - DH }
    }
    function render (c) {
      var e = c.el
      if (c.loc.t === 'pile') {
        if (e.parentNode !== sc) sc.appendChild(e)
        e.style.left = PILE[c.loc.i].x + 'px'
        e.style.top = PILE[c.loc.i].y + 'px'
        e.style.width = PW + 'px'
        e.style.height = PH + 'px'
        e.style.zIndex = '7'
      } else {
        if (e.parentNode !== tilt) tilt.appendChild(e)
        var p = slotPos(c)
        e.style.left = p.x + 'px'
        e.style.top = p.y + 'px'
        e.style.width = DW + 'px'
        e.style.height = DH + 'px'
        e.style.zIndex = '3'
        e.style.pointerEvents = 'auto'
      }
      e.style.display = c.loc.t === 'gone' ? 'none' : 'block'
      e.setAttribute('data-side', c.loc.t)
    }
    function free (t) { var n = t === 'L' ? LS.length : (t === 'R' ? RS.length : PILE.length); for (var i = 0; i < n; i++) { var u = false; cs.forEach(function (c) { if (c.loc.t === t && c.loc.i === i) u = true }); if (!u) return i } return -1 }
    function mk (id) {
      var el = api.at(sc, 'mcrate', 0, 0, PW, PH)
      el.setAttribute('data-crate', String(id))
      el.style.cssText += ';touch-action:none;cursor:grab;pointer-events:auto'
      api.art(el, 'pc2-peti', 0, 0, 100, 100, '')
      el.firstChild.style.cssText += ';position:absolute;left:0;top:0;width:100%;height:100%'
      var c = { id: id, el: el, loc: { t: 'gone', i: 0 } }
      cs.push(c)
      return c
    }
    for (var n = 0; n < 7; n++) mk(n)
    function setup (stepNo) {
      cs.forEach(function (c) { c.loc = { t: 'gone', i: 0 } })
      if (stepNo === 2) { for (var a = 0; a < 4; a++) cs[a].loc = { t: 'L', i: a } } else {
        for (var b = 0; b < 3; b++) cs[b].loc = { t: 'L', i: b }
        if (stepNo === 1) for (var d = 0; d < 4; d++) cs[3 + d].loc = { t: 'pile', i: d }
      }
      cs.forEach(render)
      lean()
    }
    // right-side ghost crates (where the balancing crates go)
    var ghosts = []
    RS.forEach(function (s, i) {
      var g = K.ghost(api, tilt, 'pc2-peti', s.x * TW - DW / 2, s.y * TH - DH, DW, DH, false, true)
      g.setAttribute('data-ghost', String(i))
      g.style.zIndex = '2'
      g.style.display = 'none'
      ghosts.push(g)
    })
    function showGhosts (nn) { ghosts.forEach(function (g, i) { g.style.display = i < nn && !cs.some(function (c) { return c.loc.t === 'R' && c.loc.i === i }) ? 'block' : 'none' }) }

    // ---- drag any crate
    var drag = null
    cs.forEach(function (c) {
      var e = c.el
      e.addEventListener('pointerdown', function (ev) {
        var s = api.step()
        if (s === 0 || busy || drag || c.loc.t === 'gone') return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        drag = { id: ev.pointerId, c: c, moved: 0, x0: r.x, y0: r.y, p: r }
        K.juice(api, 'pop', r.x, r.y, e)
        e.classList.remove('glow')
        if (e.parentNode !== sc) sc.appendChild(e)
        e.style.width = PW + 'px'
        e.style.height = PH + 'px'
        e.style.zIndex = '30'
        e.style.left = (r.x - PW / 2) + 'px'
        e.style.top = (r.y - PH / 2) + 'px'
        try { e.setPointerCapture(ev.pointerId) } catch (er) { /* synthetic */ }
      })
      e.addEventListener('pointermove', function (ev) {
        if (!drag || ev.pointerId !== drag.id || drag.c !== c) return
        var r = B.toRef(ev.clientX, ev.clientY)
        drag.p = r
        drag.moved = Math.max(drag.moved, Math.abs(r.x - drag.x0) + Math.abs(r.y - drag.y0))
        e.style.left = (r.x - PW / 2) + 'px'
        e.style.top = (r.y - PH / 2) + 'px'
      })
      function end (ev, cancel) {
        if (!drag || ev.pointerId !== drag.id || drag.c !== c) return
        var d = drag
        drag = null
        var prev = c.loc
        c.loc = { t: 'gone', i: 0 }
        var onShip = Math.abs(d.p.x - FX) < TW / 2 + 20 && d.p.y > FY - TH - 20 && d.p.y < FY + 20
        var to = null
        if (!cancel && d.moved > 10 && onShip) {
          var side = d.p.x < FX - TW / 2 + SPLIT * TW ? 'L' : 'R'
          var si = free(side)
          if (si >= 0) to = { t: side, i: si }
        } else if (!cancel && d.moved > 10) {
          var pi = free('pile')
          if (pi >= 0) to = { t: 'pile', i: pi }
        }
        if (!to) {
          c.loc = prev
          if (!cancel) api.warn(d.moved > 10 ? L.toShip : L.dragCrate)
        } else c.loc = to
        // a pile crate cannot be put into the pile slot of another crate while dragging
        render(c)
        e.style.zIndex = c.loc.t === 'pile' ? '7' : '3'
        if (to && to.t !== 'pile') { K.juice(api, 'splash', FX, FY - 20); K.land(api, e); K.ripple(svg, FX, FY - 12, 140) } else if (to) { api.sfx('bump'); K.land(api, e) }
        var ok = lean()
        if (to && to.t !== 'pile') verdict(ok)
        else showGhosts(api.step() === 1 ? 3 : 0)
      }
      e.addEventListener('pointerup', function (ev) { end(ev, false) })
      e.addEventListener('pointercancel', function (ev) { end(ev, true) })
      e.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })

    function verdict (ok) {
      var s = api.step()
      var l = count('L')
      var r = count('R')
      showGhosts(s === 1 ? Math.max(0, 3) : 0)
      if (ok) { win(s); return }
      K.juice(api, 'wobble', FX, FY - 150, ferry)
      if (r > l) api.warn(L.leanRight)
      else if (l > r) api.warn(s === 1 ? L.leanLeft : L.moveOne)
    }
    function win (s) {
      if (busy) return
      busy = true
      K.juice(api, 'cheer', FX, FY - TH + 40)
      K.juice(api, 'horn', FX + 120, FY - 200)
      api.warn(L.level)
      if (s === 1) { api.later(function () { busy = false; api.advance() }, 1100); return }
      api.later(function () {
        K.ask(api, { custom: { id: 'm03-two', prompt: 'Kiri dan kanan sama. Masing-masing berapa peti?', choices: ['1', '2', '3'], answer: '2', count: { key: 'pc2-peti', n: 2 }, hint1: 'Empat peti dibagi dua sisi. Dua dan dua.' }, done: function () {
          api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { api.later(function () { busy = false; api.advance() }, 300) } }) }, 400)
        } })
      }, 900)
    }

    function glowSome () {
      var s = api.step()
      cs.forEach(function (c) { c.el.classList.remove('glow') })
      if (s === 1) cs.forEach(function (c) { if (c.loc.t === 'pile') K.glow(c.el, 3000) })
      if (s === 2) cs.forEach(function (c) { if (c.loc.t === 'L') K.glow(c.el, 3000) })
    }
    var ctl = {
      onStep: function (n) {
        setup(n === 0 ? 0 : (n === 1 ? 1 : 2))
        showGhosts(n === 1 ? 3 : 0)
        if (n === 0) {
          api.later(function () {
            K.ask(api, { custom: { id: 'm03-tebak', prompt: 'Peti ada di kiri. Kapal miring ke mana?', choices: ['Kiri', 'Kanan', 'Lurus'], answer: 'Kiri', count: { key: 'pc2-peti', n: 3 }, hint1: 'Sisi yang berat turun. Peti ada di kiri.' }, done: function () {
              tilt.style.transform = 'rotate(-10.8deg)'
              K.juice(api, 'splash', FX - 120, FY - 20)
              api.warn(L.lean)
              api.later(function () { api.advance() }, 1700)
            } })
          }, 900)
        }
        if (n === 1) {
          lean()
          api.later(function () {
            K.ask(api, { custom: { id: 'm03-sama', prompt: 'Kiri ada 3 peti. Kanan perlu berapa supaya sama?', choices: ['2', '3', '4'], answer: '3', count: { key: 'pc2-peti', n: 3 }, hint1: 'Supaya sama, kanan harus sama banyak dengan kiri.' }, done: function () { glowSome(); api.warn(L.dragCrate) } })
          }, 500)
        }
        if (n === 2) { api.warn(L.moveOne); api.later(glowSome, 400) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 1) { var p = cs.filter(function (c) { return c.loc.t === 'pile' })[0]; if (p) { var g = RS[0]; hd.move([{ x: PILE[p.loc.i].x + 60, y: PILE[p.loc.i].y + 45 }, { x: FX - TW / 2 + g.x * TW, y: FY - TH + g.y * TH - 20 }], 1500) } }
        else if (n === 2) { var l = cs.filter(function (c) { return c.loc.t === 'L' })[0]; if (l) { var s2 = LS[l.loc.i]; hd.move([{ x: FX - TW / 2 + s2.x * TW, y: FY - TH + s2.y * TH - 20 }, { x: FX - TW / 2 + RS[0].x * TW, y: FY - TH + RS[0].y * TH - 20 }], 1500) } }
      },
      hint: function (lvl2) {
        var s = api.step()
        if (s === 0) return
        glowSome()
        if (lvl2 >= 2) showGhosts(s === 1 ? 3 : 1)
        if (lvl2 >= 4 && !busy) {
          var from = s === 1 ? cs.filter(function (c) { return c.loc.t === 'pile' })[0] : cs.filter(function (c) { return c.loc.t === 'L' })[0]
          var ri = free('R')
          if (from && ri >= 0) { from.loc = { t: 'R', i: ri }; render(from); K.land(api, from.el); verdict(lean()) }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () {}
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W05-M03', mod)
})(window)
