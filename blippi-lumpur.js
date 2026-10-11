/* G32 Blippi -- W02-M03 "Gerobak di Lumpur" (PRD 11.3: Help & Deliver; hook, tyre/route choice, tow the empty cart), played INSIDE bg-w02-m03-lumpur.
 * The buggy and the empty garden cart wait on the right pad; the water-garden gate is on the left gravel. A mud patch lies between.
 * 1 PASANG: DRAG the toy tow hook onto the ring between buggy and cart.
 * 2 BAN: DRAG a tyre (smooth or patterned, from the deck) onto the buggy. Either is allowed; you can swap any time before the tow.
 * 3 TARIK: DRAG the buggy onto one of two dashed starting rings (through the MUD, or along the dry soil). The tow then runs:
 *    smooth tyres in mud spin, throw mud and slide back (kind line, nothing lost); patterned tyres cross the mud; the dry soil works with any tyre but is the long way. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var HOME = { x: 1110, y: 660 }           // buggy parked (bottom-centre)
  var CART_OFF = 150                       // the cart trails this far behind the buggy (to the right)
  var HITCH = { x: 1215, y: 640 }
  var HOOK = { x: 1290, y: 690, w: 110, h: 92 }
  var TIRES = [{ id: 'jalan', key: 'modul-ban-jalan', x: 1410, y: 392 }, { id: 'berpola', key: 'modul-ban-berpola', x: 1530, y: 392 }]
  var RING = { lumpur: { x: 990, y: 628 }, tanah: { x: 990, y: 730 } }
  var ROUTE = {
    lumpur: [{ x: 1110, y: 660 }, { x: 980, y: 628 }, { x: 640, y: 618 }, { x: 330, y: 620 }, { x: 205, y: 590 }],
    tanah: [{ x: 1110, y: 660 }, { x: 990, y: 726 }, { x: 640, y: 728 }, { x: 330, y: 706 }, { x: 205, y: 600 }]
  }
  var GOAL = { x: 150, y: 470, w: 160, h: 120 }

  function poly (pts) {
    var segs = []
    var tot = 0
    var i
    for (i = 0; i < pts.length - 1; i++) { var d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y); segs.push(d); tot += d }
    return { pts: pts, segs: segs, tot: tot, at: function (f) {
      var d = Math.max(0, Math.min(1, f)) * tot
      var j
      for (j = 0; j < segs.length; j++) { if (d <= segs[j]) { var k = d / segs[j]; return { x: pts[j].x + (pts[j + 1].x - pts[j].x) * k, y: pts[j].y + (pts[j + 1].y - pts[j].y) * k } } d -= segs[j] }
      return pts[pts.length - 1]
    } }
  }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var hooked = !!saved.hooked || !!(rs && rs.step >= 1)
    var tire = saved.tire || (rs && rs.step >= 2 ? 'berpola' : null)
    var busy = false
    var done = false
    var hand = K.hand(api)
    var paths = { lumpur: poly(ROUTE.lumpur), tanah: poly(ROUTE.tanah) }
    function save () { api.persist({ hooked: hooked, tire: tire }) }

    // goal ring on the left gravel
    var goal = api.at(sc, 'jgoal', GOAL.x, GOAL.y, GOAL.w, GOAL.h)
    goal.style.cssText += ';border:5px dashed #FF8A1F;border-radius:50%;background:rgba(255,196,64,.18);pointer-events:none;z-index:2'
    goal.setAttribute('data-goal', '1')
    // the cart (empty) + hitch ring
    var cart = api.art(sc, 'pc-cart', 0, 0, 150, 122, 'cartpiece')
    cart.style.zIndex = '5'
    cart.style.pointerEvents = 'none'
    var hitch = K.socket(api, sc, HITCH.x - 40, HITCH.y - 40, 80, 80, 'hitch')
    hitch.style.borderRadius = '50%'
    var hook = api.art(sc, 'pc-hook', 0, 0, HOOK.w, HOOK.h, 'hookpiece')
    hook.setAttribute('data-hook', '1')
    hook.style.cssText += ';z-index:7;touch-action:none;cursor:grab'
    var shade = api.at(sc, 'shd', 0, 0, 230, 34)
    shade.style.zIndex = '4'
    var buggy = api.art(sc, 'veh-buggy-misi', 0, 0, 290, 189, 'jbuggy')
    buggy.setAttribute('data-buggy', '1')
    buggy.style.cssText += ';z-index:6;touch-action:none;transform-origin:50% 100%'
    var badge = api.at(sc, '', 0, 0, 96, 66)
    badge.style.cssText += ';z-index:7;pointer-events:none;display:none'
    var rings = {}
    ;['lumpur', 'tanah'].forEach(function (k) {
      var r = K.socket(api, sc, RING[k].x - 52, RING[k].y - 52, 104, 104, 'ring-' + k)
      r.style.borderRadius = '50%'
      r.style.display = 'none'
      rings[k] = r
    })
    var tireEls = {}
    function setBadge () {
      badge.innerHTML = ''
      if (!tire) { badge.style.display = 'none'; return }
      var t = TIRES.filter(function (q) { return q.id === tire })[0]
      api.art(badge, t.key, 0, 0, 96, 66, '')
      badge.style.display = 'block'
    }

    // ---- placement: buggy bottom-centre at (x,y); the cart trails behind it
    var cur = { x: HOME.x, y: HOME.y }
    function put (x, y, tilt, dust) {
      cur = { x: x, y: y }
      var bob = dust ? Math.sin(performance.now() * 0.03) * 2.5 : 0
      buggy.style.transform = 'translate(' + (x - 145) + 'px,' + (y - 175 + bob) + 'px) rotate(' + (tilt || 0) + 'deg)'
      badge.style.transform = 'translate(' + (x - 60) + 'px,' + (y - 70 + bob) + 'px)'
      shade.style.transform = 'translate(' + (x - 115) + 'px,' + (y - 26) + 'px)'
      var cx = x + CART_OFF
      cart.style.transform = 'translate(' + (cx - 75) + 'px,' + (y - 118 + bob) + 'px)'
    }
    put(HOME.x, HOME.y)
    if (hooked) { hitch.style.display = 'none'; hook.style.display = 'none'; placeHook(false) }
    setBadge()
    function placeHook (anim) {
      var h = api.art(sc, 'pc-hook', HITCH.x - 40, HITCH.y - 12, 70, 58, 'hooked')
      h.setAttribute('data-hooked', '1')
      h.style.cssText += ';z-index:7;pointer-events:none'
      if (anim) K.land(api, h)
    }

    // ---- generic drag with snap
    function drag (el, o) {
      var d = null
      el.addEventListener('pointerdown', function (ev) {
        if (d || busy || !o.enabled()) return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r, base: o.base ? o.base() : null }
        el.classList.remove('glow')
        el.style.zIndex = '30'
        try { el.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      el.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        if (o.move) o.move(d, r); else el.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.06)'
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
    function slideBack (el, c) { api.tween({ x: c.p.x - c.x0, y: c.p.y - c.y0 }, { x: 0, y: 0 }, 300, function (q) { el.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () { el.style.transform = '' }) }

    // step 1: hook
    drag(hook, {
      enabled: function () { return api.step() === 0 },
      drop: function (p) {
        if (!K.within(p, HITCH.x, HITCH.y, 90)) return false
        hooked = true
        hook.style.display = 'none'
        hitch.style.display = 'none'
        placeHook(true)
        api.sfx('bump')
        api.fx('spark', HITCH.x, HITCH.y, 200)
        api.warn(L.hooked)
        save()
        api.later(function () { api.advance() }, 800)
        return true
      },
      miss: function (m) { api.warn(m ? L.hookMiss : L.dragHook); K.glow(hitch, 2600) },
      back: function (c) { slideBack(hook, c) }
    })

    // step 2/3: tyres (swappable until the tow succeeds)
    TIRES.forEach(function (t) {
      var el = api.at(sc, 'tire', t.x, t.y, 110, 76, 'button')
      el.type = 'button'
      el.setAttribute('data-tire', t.id)
      el.setAttribute('aria-label', t.id === 'jalan' ? 'Ban halus' : 'Ban berpola')
      el.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;display:none'
      api.art(el, t.key, 0, 0, 110, 76, '')
      tireEls[t.id] = el
      drag(el, {
        enabled: function () { return (api.step() === 1 || api.step() === 2) && !done },
        drop: function (p) {
          if (!K.within(p, cur.x, cur.y - 80, 150)) return false
          tire = t.id
          setBadge()
          api.sfx('bump')
          api.fx('spark', cur.x - 40, cur.y - 40, 160)
          el.style.transform = ''
          save()
          if (api.step() === 1) { api.warn(t.id === 'jalan' ? L.tireSmooth : L.tireTread); api.later(function () { api.advance() }, 900) } else api.warn(t.id === 'jalan' ? L.tireSmooth : L.tireTread)
          return true
        },
        miss: function (m) { api.warn(L.dragTire); K.glow(buggy, 2600) },
        back: function (c) { slideBack(el, c) }
      })
    })

    // step 3: drag the buggy onto a route ring, then the tow runs
    drag(buggy, {
      enabled: function () { return api.step() === 2 && !done },
      z: '6',
      move: function (d, r) { put(r.x, r.y + 70, 0, false) },
      drop: function (p) {
        var hit = null
        var best = 1e9
        ;['lumpur', 'tanah'].forEach(function (k) { var dd = Math.hypot(p.x - RING[k].x, p.y - RING[k].y); if (dd <= 100 && dd < best) { best = dd; hit = k } })
        if (!hit) return false
        tow(hit)
        return true
      },
      miss: function (m) { api.warn(L.dragBuggy); K.glow(rings.lumpur, 2600); K.glow(rings.tanah, 2600) },
      back: function () { var from = cur; api.tween(from, HOME, 320, function (q) { put(q.x, q.y) }) }
    })

    function tow (k) {
      busy = true
      var P = paths[k]
      var slips = k === 'lumpur' && tire !== 'berpola'
      var start = { x: RING[k].x, y: RING[k].y }
      api.sfx('honk')
      Object.keys(rings).forEach(function (q) { rings[q].style.display = 'none' })
      // buggy lines up on the route start, then pulls
      api.tween(cur, ROUTE[k][0], 260, function (q) { put(q.x, q.y) }, function () {
        void start
        var stop = slips ? 0.42 : 1
        api.tween({ x: 0, y: 0 }, { x: stop, y: 0 }, slips ? 1700 : (k === 'lumpur' ? 2800 : 3600), function (p) {
          var pt = P.at(p.x)
          put(pt.x, pt.y, Math.sin(p.x * 60) * 1.2, true)
          if (Math.random() < 0.2) api.fx('dust', pt.x + 80, pt.y - 6, 70)
        }, function () {
          if (slips) {
            // wheels spin, mud flies, buggy slides back to its ring
            api.sfx('bad')
            api.fx('dust', P.at(stop).x + 40, P.at(stop).y - 10, 220)
            api.fx('droplets', P.at(stop).x + 40, P.at(stop).y - 30, 160)
            api.warn(L.slip)
            var m1 = api.at(sc, 'mudsplat', P.at(stop).x - 40, P.at(stop).y - 20, 100, 36)
            m1.style.cssText += ';z-index:4;pointer-events:none;border-radius:50%;background:radial-gradient(ellipse,#7A4A22,rgba(122,74,34,0) 70%)'
            api.later(function () { if (m1.parentNode) m1.parentNode.removeChild(m1) }, 3000)
            api.tween({ x: stop, y: 0 }, { x: 0, y: 0 }, 1100, function (p) { var pt = P.at(p.x); put(pt.x, pt.y, 0, false) }, function () {
              api.tween(cur, HOME, 300, function (q) { put(q.x, q.y) }, function () { busy = false; K.glow(tireEls.berpola, 3200); K.glow(rings.tanah, 3200); showRings(true) })
            })
            return
          }
          // arrived at the gate: parcel-free delivery, the cart is parked
          done = true
          api.sfx('ok')
          api.fx('confetti', GOAL.x + 80, GOAL.y + 40, 320)
          api.fx('gold-star', GOAL.x + 80, GOAL.y, 220)
          goal.style.display = 'none'
          api.later(function () { busy = false; save(); api.advance() }, 1100)
        })
      })
    }
    function showRings (on) { ;['lumpur', 'tanah'].forEach(function (k) { rings[k].style.display = on ? 'block' : 'none' }) }

    var ctl = {
      onStep: function (n) {
        hitch.style.display = n === 0 && !hooked ? 'block' : 'none'
        hook.style.display = n === 0 && !hooked ? 'block' : 'none'
        TIRES.forEach(function (t) { tireEls[t.id].style.display = n >= 1 ? 'block' : 'none' })
        showRings(n === 2)
        if (n === 0) { K.glow(hook, 3000); K.glow(hitch, 3000) }
        if (n === 1) { K.glow(tireEls.berpola, 3000); K.glow(tireEls.jalan, 3000); K.glow(buggy, 3000) }
        if (n === 2) { K.glow(buggy, 3000); K.glow(rings.lumpur, 3000); K.glow(rings.tanah, 3000) }
      },
      onTool: function () {},
      demo: function () { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          K.glow(hook, 3000); K.glow(hitch, 3000)
          if (lvl === 3) hand.move([{ x: HOOK.x + 10, y: HOOK.y + 10 }, { x: HITCH.x - 30, y: HITCH.y - 20 }], 1000)
          else if (lvl >= 4) { hooked = true; hook.style.display = 'none'; hitch.style.display = 'none'; placeHook(true); save(); api.advance() }
        } else if (s === 1) {
          K.glow(tireEls.berpola, 3000); K.glow(buggy, 3000)
          if (lvl === 3) hand.move([{ x: TIRES[1].x + 20, y: TIRES[1].y + 10 }, { x: cur.x - 40, y: cur.y - 120 }], 1100)
          else if (lvl >= 4) { tire = 'berpola'; setBadge(); save(); api.advance() }
        } else {
          K.glow(buggy, 3000); K.glow(rings.tanah, 3000); K.glow(rings.lumpur, 3000)
          if (lvl === 3) hand.move([{ x: cur.x - 40, y: cur.y - 120 }, { x: RING.tanah.x - 30, y: RING.tanah.y - 30 }], 1100)
          else if (lvl >= 4 && !busy) tow('tanah')
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W02-M03', mod)
})(window)
