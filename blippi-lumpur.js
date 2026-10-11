/* G32 Blippi -- W02-M03 "Gerobak di Lumpur" (PRD 11.3: Help & Deliver; P01/P03/P09; "Pasang hook mainan, pilih ban/jalur, tarik gerobak kosong"; V06 = TOW TRUCK), played INSIDE bg-w02-m03-lumpur.
 * The tow truck (Blippi at the wheel) stands bottom-centre; its boom carries a real HOOK on a rope; the empty cart waits behind it. The goal is the gravel path on the left.
 * 1 KAIT  : drag the hook (it hangs from the boom) onto the cart's hitch (ghost hook). Then "Ban mana yang bergerigi?"
 * 2 BAN   : drag a tyre (smooth / patterned) onto the truck; swap any time.
 * 3 TARIK : DRAW the route with a finger from the truck to the goal. Through the MUD, or the dry way round. The tow runs along YOUR line, the cart trailing:
 *           smooth tyres spin in the mud (mud spray, slide back, kind line); patterned tyres cross; the dry way works with any tyre. Then a maths question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var NS = 'http://www.w3.org/2000/svg'
  var TW = 300
  var TH = 285
  var HOME = { x: 880, y: 705 }
  var CART = { x: 1190, y: 695, w: 170, h: 138 }
  var GOAL = { x: 170, y: 520 }
  var MUD = { cx: 690, cy: 610, rx: 340, ry: 95 }
  var TIRES = [{ id: 'jalan', key: 'modul-ban-jalan', x: 1290, y: 560 }, { id: 'berpola', key: 'modul-ban-berpola', x: 1470, y: 560 }]
  var TIRE_W = 160
  var TIRE_H = 110

  function inMud (p) { var dx = (p.x - MUD.cx) / MUD.rx; var dy = (p.y - MUD.cy) / MUD.ry; return dx * dx + dy * dy < 1 }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var hooked = !!saved.hooked || !!(rs && rs.step >= 1)
    var tire = saved.tire || (rs && rs.step >= 2 ? 'berpola' : null)
    var asked = !!saved.asked
    var busy = false
    var done = false
    var hd = null
    var cur = { x: HOME.x, y: HOME.y }
    function save () { api.persist({ hooked: hooked, tire: tire, asked: asked }) }

    // goal: a ghost cart on the gravel path + a flag
    var goalG = K.ghost(api, sc, 'pc-cart', GOAL.x - CART.w / 2, GOAL.y - CART.h, CART.w, CART.h)
    goalG.setAttribute('data-goal', '1')
    var flag = api.art(sc, 'prop-bendera', GOAL.x + 70, GOAL.y - 120, 56, 90, '')
    flag.style.zIndex = '3'

    // the empty cart behind the truck + its hitch ghost
    var cart = api.art(sc, 'pc-cart', 0, 0, CART.w, CART.h, 'cartpiece')
    cart.setAttribute('data-cart', '1')
    cart.style.cssText += ';z-index:5;pointer-events:none'
    var cartPos = { x: CART.x, y: CART.y }
    function placeCart (x, y, tilt) { cartPos = { x: x, y: y }; cart.style.transform = 'translate(' + (x - CART.w / 2) + 'px,' + (y - CART.h) + 'px)' + (tilt ? ' rotate(' + tilt + 'deg)' : '') }
    placeCart(CART.x, CART.y)
    function hitchPt () { return { x: cartPos.x - CART.w / 2 + 14, y: cartPos.y - CART.h * 0.45 } }
    var hitchGhost = null

    // the tow truck
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk derek')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:6;pointer-events:none;cursor:default'
    var tart = api.art(truck, 'veh-tow-truck', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'tow-truck')
    K.driver(truck, { x: 0.11, y: 0.4, w: 0.22, h: 0.2 })
    var shade = api.at(sc, 'shd', 0, 0, 260, 38)
    shade.style.zIndex = '5'
    var badge = api.at(truck, '', TW * 0.12, TH * 0.74, 90, 62)
    badge.style.cssText += ';pointer-events:none;z-index:2;display:none'
    function placeTruck (x, y, tilt) {
      cur = { x: x, y: y }
      truck.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH) + 'px)' + (tilt ? ' rotate(' + tilt + 'deg)' : '')
      shade.style.transform = 'translate(' + (x - 130) + 'px,' + (y - 24) + 'px)'
      drawRope()
    }
    function tip () { return { x: cur.x - TW / 2 + 0.93 * TW, y: cur.y - TH + 0.1 * TH } }
    function setBadge () {
      badge.innerHTML = ''
      if (!tire) { badge.style.display = 'none'; return }
      var t = TIRES.filter(function (q) { return q.id === tire })[0]
      api.art(badge, t.key, 0, 0, 90, 62, '')
      badge.style.display = 'block'
    }
    setBadge()

    // rope (svg) + the hook piece
    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:7'
    svg.innerHTML = '<path id="rope" fill="none" stroke="#3b3b3b" stroke-width="7" stroke-linecap="round"/><path id="route" fill="none" stroke="#FFFFFF" stroke-opacity=".85" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path id="route2" fill="none" stroke="#1F6FD1" stroke-opacity=".9" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1 22"/>'
    sc.appendChild(svg)
    var rope = svg.querySelector('#rope')
    var routeEl = svg.querySelector('#route')
    var routeEl2 = svg.querySelector('#route2')
    var HW = 120
    var HH = 122
    var hook = api.at(sc, 'hookpiece', 0, 0, HW, HH)
    hook.setAttribute('data-hook', '1')
    hook.style.cssText += ';z-index:8;touch-action:none;cursor:grab'
    api.art(hook, 'prop-kait', 0, 0, HW, HH, '')
    var hp = { x: 0, y: 0 }                       // hook top-left
    function hookRest () { var t = tip(); return { x: t.x - HW / 2, y: t.y + 70 } }
    function setHook (x, y) {
      hp = { x: x, y: y }
      hook.style.transform = 'translate(' + x + 'px,' + y + 'px)'
      drawRope()
    }
    function drawRope () {
      var t = tip()
      rope.setAttribute('d', 'M' + t.x + ',' + t.y + ' Q' + (t.x + 8) + ',' + ((t.y + hp.y + 20) / 2) + ' ' + (hp.x + HW / 2) + ',' + (hp.y + 14))
    }
    placeTruck(HOME.x, HOME.y)
    function snapHook () {
      var h = hitchPt()
      setHook(h.x - HW * 0.38, h.y - HH * 0.3)
    }
    if (hooked) snapHook(); else setHook(hookRest().x, hookRest().y)
    if (!hooked) {
      var hg = hitchPt()
      hitchGhost = K.ghost(api, sc, 'prop-kait', hg.x - HW * 0.38, hg.y - HH * 0.3, HW, HH)
      hitchGhost.setAttribute('data-hitch', '1')
    }

    function dragger (el, o) {
      var d = null
      el.addEventListener('pointerdown', function (ev) {
        if (d || busy || !o.enabled()) return
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
        o.move(d, r)
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var c = d
        d = null
        el.style.zIndex = o.z || '7'
        if (!cancel && c.moved > 10 && o.drop(c.p)) return
        if (!cancel) o.miss(c.moved > 10)
        o.back(c)
      }
      el.addEventListener('pointerup', function (ev) { end(ev, false) })
      el.addEventListener('pointercancel', function (ev) { end(ev, true) })
      el.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    }

    // ---- step 1: hook onto the cart
    var hookStart = null
    dragger(hook, {
      enabled: function () { return api.step() === 0 && !hooked },
      move: function (d, r) { if (!hookStart) hookStart = { x: hp.x, y: hp.y }; setHook(hookStart.x + (r.x - d.x0), hookStart.y + (r.y - d.y0)) },
      drop: function (p) {
        hookStart = null
        var h = hitchPt()
        if (!K.within(p, h.x, h.y, 120)) return false
        hooked = true
        if (hitchGhost && hitchGhost.parentNode) hitchGhost.parentNode.removeChild(hitchGhost)
        snapHook()
        api.sfx('bump')
        api.fx('spark', h.x, h.y, 200)
        api.warn(L.hooked)
        save()
        api.later(function () {
          K.ask(api, { custom: { id: 'm-ban', prompt: 'Ban mana yang bergerigi?', choices: ['Halus', 'Bergerigi'], choicePics: ['assets/blippi/modul-ban-jalan.webp', 'assets/blippi/modul-ban-berpola.webp'], answer: 'Bergerigi', hint1: 'Cari ban yang punya alur timbul.' }, done: function () { asked = true; save(); api.advance() } })
        }, 700)
        return true
      },
      miss: function (m) { api.warn(m ? L.hookMiss : L.dragHook); if (hitchGhost) K.glow(hitchGhost, 2600) },
      back: function () { var r0 = hookRest(); api.tween({ x: hp.x, y: hp.y }, r0, 300, function (q) { setHook(q.x, q.y) }) }
    })

    // ---- step 2: tyres lie in front; drag one onto the truck
    var tireEls = {}
    TIRES.forEach(function (t) {
      var el = api.at(sc, 'tire', t.x, t.y, TIRE_W, TIRE_H, 'button')
      el.type = 'button'
      el.setAttribute('data-tire', t.id)
      el.setAttribute('aria-label', t.id === 'jalan' ? 'Ban halus' : 'Ban bergerigi')
      el.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;display:none'
      api.art(el, t.key, 0, 0, TIRE_W, TIRE_H, '')
      if (el.animate && !api.reduced()) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1900, iterations: Infinity, easing: 'ease-in-out' })
      tireEls[t.id] = el
      dragger(el, {
        enabled: function () { return (api.step() === 1 || api.step() === 2) && !done },
        move: function (d, r) { el.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.05)' },
        drop: function (p) {
          if (!(p.x > cur.x - TW / 2 - 20 && p.x < cur.x + TW / 2 + 20 && p.y > cur.y - TH && p.y < cur.y + 30)) return false
          tire = t.id
          setBadge()
          api.sfx('bump')
          api.fx('spark', cur.x - 60, cur.y - 40, 160)
          el.style.transform = ''
          save()
          api.warn(t.id === 'jalan' ? L.tireSmooth : L.tireTread)
          if (api.step() === 1) api.later(function () { api.advance() }, 900)
          return true
        },
        miss: function () { api.warn(L.dragTire); K.glow(truck, 2600) },
        back: function (c) { api.tween({ x: c.p.x - c.x0, y: c.p.y - c.y0 }, { x: 0, y: 0 }, 280, function (q) { el.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () { el.style.transform = '' }) }
      })
    })

    // ---- step 3: draw the route
    var cap = api.at(sc, 'drawcap', 0, 0, 1672, 941)
    cap.setAttribute('data-draw', '1')
    cap.style.cssText += ';z-index:4;touch-action:none;pointer-events:none'
    var pts = []
    var drawing = null
    function pathD (a) { var d = ''; a.forEach(function (p, i) { d += (i ? 'L' : 'M') + p.x.toFixed(0) + ',' + p.y.toFixed(0) }); return d }
    function showRoute (a) { routeEl.setAttribute('d', a.length ? pathD(a) : ''); routeEl2.setAttribute('d', a.length ? pathD(a) : '') }
    cap.addEventListener('pointerdown', function (ev) {
      if (api.step() !== 2 || busy || done || drawing) return
      api.touch()
      var r = B.toRef(ev.clientX, ev.clientY)
      if (!K.within(r, cur.x - 60, cur.y - 110, 190)) { api.warn(L.startAtTruck); K.glow(truck, 2600); return }
      drawing = ev.pointerId
      pts = [{ x: cur.x - 60, y: cur.y - 30 }, r]
      showRoute(pts)
      try { cap.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
    })
    cap.addEventListener('pointermove', function (ev) {
      if (drawing !== ev.pointerId) return
      var r = B.toRef(ev.clientX, ev.clientY)
      var l = pts[pts.length - 1]
      if (Math.hypot(r.x - l.x, r.y - l.y) > 14) { pts.push(r); showRoute(pts) }
    })
    function drawEnd (ev, cancel) {
      if (drawing !== ev.pointerId) return
      drawing = null
      var end = pts[pts.length - 1]
      if (cancel || pts.length < 6 || !K.within(end, GOAL.x, GOAL.y - 50, 170)) {
        if (!cancel) { api.warn(pts.length < 6 ? L.drawIt : L.routeShort); K.glow(goalG, 2600) }
        api.later(function () { showRoute([]) }, 900)
        return
      }
      tow(pts.slice())
    }
    cap.addEventListener('pointerup', function (ev) { drawEnd(ev, false) })
    cap.addEventListener('pointercancel', function (ev) { drawEnd(ev, true) })

    // resample the drawn polyline evenly so the tow moves at a steady pace
    function resample (a, step) {
      var out = [a[0]]
      var acc = 0
      var i
      for (i = 1; i < a.length; i++) {
        var seg = Math.hypot(a[i].x - a[i - 1].x, a[i].y - a[i - 1].y)
        var k = 0
        while (acc + seg - k >= step) { k += step - acc; acc = 0; var f = k / seg; out.push({ x: a[i - 1].x + (a[i].x - a[i - 1].x) * f, y: a[i - 1].y + (a[i].y - a[i - 1].y) * f }) }
        acc += seg - k
      }
      out.push(a[a.length - 1])
      return out
    }
    function tow (raw) {
      busy = true
      var P = resample([{ x: cur.x - 60, y: cur.y - 30 }].concat(raw), 10)
      var mudHits = 0
      P.forEach(function (p) { if (inMud(p)) mudHits++ })
      var viaMud = mudHits > 4
      var slips = viaMud && tire !== 'berpola'
      var firstMud = P.findIndex(function (p) { return inMud(p) })
      var stopAt = slips ? Math.max(2, firstMud + 6) : P.length - 1
      var start = { x: cur.x, y: cur.y }
      api.sfx('honk')
      var i = 0
      var gapPx = 190
      var cartTrail = []
      function step () {
        if (!busy) return
        if (api.paused()) { api.later(step, 120); return }
        var p = P[i]
        // the truck's own origin follows the drawn point (the wheels sit on the line); it faces the way it goes: the art faces left, so flip when heading right
        placeTruck(p.x + 60, p.y + 30, Math.sin(i * 0.9) * 0.8)
        cartTrail.push({ x: p.x, y: p.y })
        var back = cartTrail[Math.max(0, cartTrail.length - Math.round(gapPx / 10))]
        placeCart(back.x + 150 + 60, back.y + 30, 0)
        // rope follows the hook which rides the cart's hitch
        var h = hitchPt()
        setHook(h.x - HW * 0.38, h.y - HH * 0.3)
        if (Math.random() < 0.35) api.fx('dust', p.x + 150, p.y + 24, 70)
        if (i >= stopAt) { arrive(); return }
        i++
        api.later(step, 26)
      }
      function arrive () {
        if (slips) {
          api.sfx('bad')
          api.fx('dust', P[stopAt].x + 40, P[stopAt].y, 240)
          api.fx('droplets', P[stopAt].x + 40, P[stopAt].y - 30, 170)
          api.warn(L.slip)
          var m1 = api.at(sc, 'mudsplat', P[stopAt].x - 20, P[stopAt].y + 10, 140, 44)
          m1.style.cssText += ';z-index:4;pointer-events:none;border-radius:50%;background:radial-gradient(ellipse,#7A4A22,rgba(122,74,34,0) 70%)'
          api.later(function () { if (m1.parentNode) m1.parentNode.removeChild(m1) }, 3200)
          // slide back to the start
          api.tween({ x: P[stopAt].x + 60, y: P[stopAt].y + 30 }, start, 1100, function (q) { placeTruck(q.x, q.y, 0); placeCart(q.x + 300, q.y - 10, 0); var h2 = hitchPt(); setHook(h2.x - HW * 0.38, h2.y - HH * 0.3) }, function () {
            placeCart(CART.x, CART.y)
            var h3 = hitchPt(); setHook(h3.x - HW * 0.38, h3.y - HH * 0.3)
            showRoute([]); busy = false
            K.glow(tireEls.berpola, 3200)
          })
          return
        }
        // arrived: park the cart on the goal ghost
        done = true
        api.sfx('ok')
        showRoute([])
        goalG.style.display = 'none'
        api.fx('confetti', GOAL.x, GOAL.y - 60, 320)
        api.fx('gold-star', GOAL.x, GOAL.y - 90, 220)
        if (flag.animate && !api.reduced()) flag.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-10deg)' }, { transform: 'rotate(8deg)' }, { transform: 'rotate(0)' }], { duration: 900 })
        save()
        api.later(function () {
          K.ask(api, { context: 'gate', grade: 1, done: function () { busy = false; api.advance() } })
        }, 1000)
      }
      step()
    }
    function exampleRoute (dry) {
      return dry ? [{ x: 700, y: 722 }, { x: 520, y: 726 }, { x: 330, y: 700 }, { x: 230, y: 610 }, { x: GOAL.x, y: GOAL.y - 30 }] : [{ x: 800, y: 660 }, { x: 640, y: 620 }, { x: 460, y: 600 }, { x: 300, y: 560 }, { x: GOAL.x, y: GOAL.y - 30 }]
    }

    var ctl = {
      onStep: function (n) {
        hitchGhost && (hitchGhost.style.display = n === 0 && !hooked ? 'block' : 'none')
        hook.style.pointerEvents = n === 0 && !hooked ? 'auto' : 'none'
        TIRES.forEach(function (t) { tireEls[t.id].style.display = n >= 1 && n <= 2 ? 'block' : 'none' })
        cap.style.pointerEvents = n === 2 ? 'auto' : 'none'
        goalG.style.display = n === 2 && !done ? 'block' : 'none'
        flag.style.display = n === 2 ? 'block' : 'none'
        if (n === 0) { K.glow(hook, 3000) }
        if (n === 1) { K.glow(tireEls.berpola, 3000); K.glow(tireEls.jalan, 3000) }
        if (n === 2) { K.glow(truck, 3000); K.glow(goalG, 3000) }
      },
      onTool: function () {},
      demo: function () { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (!hd) hd = K.hand(api)
        if (s === 0) {
          K.glow(hook, 3000); if (hitchGhost) K.glow(hitchGhost, 3000)
          var h = hitchPt()
          if (lvl === 3) hd.move([{ x: hp.x + 30, y: hp.y + 30 }, { x: h.x - 20, y: h.y - 30 }], 1000)
          else if (lvl >= 4 && !hooked) { hookStart = null; hooked = true; if (hitchGhost && hitchGhost.parentNode) hitchGhost.parentNode.removeChild(hitchGhost); snapHook(); save(); asked = true; api.advance() }
        } else if (s === 1) {
          K.glow(tireEls.berpola, 3000); K.glow(truck, 3000)
          if (lvl === 3) hd.move([{ x: TIRES[1].x + 40, y: TIRES[1].y + 30 }, { x: cur.x - 40, y: cur.y - 60 }], 1100)
          else if (lvl >= 4) { tire = 'berpola'; setBadge(); save(); api.advance() }
        } else {
          K.glow(goalG, 3000)
          if (lvl === 3) hd.move(exampleRoute(false).map(function (p) { return { x: p.x - 30, y: p.y - 30 } }).slice(0, 2).concat([{ x: GOAL.x - 30, y: GOAL.y - 60 }]), 700)
          else if (lvl >= 4 && !busy) { showRoute(exampleRoute(true)); tow(exampleRoute(true)) }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W02-M03', mod)
})(window)
