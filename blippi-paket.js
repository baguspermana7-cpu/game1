/* G32 Blippi -- W05-M05 "Paket untuk Pulau" (PRD 11.6 FINALE: P01/P05/P07/P11; "Pilih rute, distribusi beban, dan urutan antar"; reward W05 badge; V11 = HARBOR FERRY), played INSIDE bg-w05-m05-paket-pulau.
 * Three islands each carry a sign (how many crates it wants); the FLAG island (random per play) wants 4 = what the ferry carries. Four crates wait on the quay.
 * 1 RUTE   (draw the route): drag from the ferry and draw a path over the water to the flag island (ghost ferry there). Over land / over another island / to the wrong island: kind line, the line clears, try again.
 * 2 MUAT   (spread the load): drag the 4 crates onto the deck; the ferry leans live (bubble level); 2 left + 2 right = level. Then "Tiap sisi berapa?".
 * 3 ANTAR  (hold to sail): HOLD the ferry, it follows YOUR route (it shrinks with distance); release = stop. At the island the crates hop off one by one with numbers 1-4, then "4 + 3 = ?" and a SoalEngine maths question. Finale: W05 badge + finished island. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var NS = 'http://www.w3.org/2000/svg'
  var TW = 340
  var TH = 327
  var START = { x: 990, y: 742 }
  var DW = 56
  var DH = 42
  var PW = 130
  var PH = 98
  var LS = [{ x: 0.37, y: 0.61 }, { x: 0.49, y: 0.61 }, { x: 0.37, y: 0.52 }, { x: 0.49, y: 0.52 }]
  var RS = [{ x: 0.68, y: 0.61 }, { x: 0.80, y: 0.61 }, { x: 0.68, y: 0.52 }, { x: 0.80, y: 0.52 }]
  var SPLIT = 0.6
  var PILE = [{ x: 60, y: 560 }, { x: 210, y: 590 }, { x: 360, y: 560 }, { x: 510, y: 590 }]
  var ISL = {
    a: { c: { x: 945, y: 235 }, r: 125, dock: { x: 1140, y: 320 }, sign: { x: 640, y: 240 } },
    b: { c: { x: 1420, y: 300 }, r: 150, dock: { x: 1110, y: 430 }, sign: { x: 1360, y: 105 } },
    c: { c: { x: 1420, y: 585 }, r: 150, dock: { x: 1150, y: 690 }, sign: { x: 1250, y: 395 } }
  }
  var KEYS = ['a', 'b', 'c']

  function scaleAt (y) { return Math.max(0.5, Math.min(1, 0.5 + 0.5 * (y - 260) / 480)) }
  function dist (a, b) { return Math.hypot(a.x - b.x, a.y - b.y) }
  function onLand (p) { return p.x < 800 || (p.y > 800 && p.x < 1000) }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var step0 = api.restore ? api.restore.step : 0
    var target = saved.target || KEYS[Math.floor(Math.random() * 3)]
    var pool = [2, 3, 5, 6].sort(function () { return Math.random() - 0.5 })
    var wants = saved.wants || (function () { var o = {}; var j = 0; KEYS.forEach(function (k) { o[k] = k === target ? 4 : pool[j++] }); return o })()
    var route = null
    var busy = false
    var hd = null
    var cur = { x: START.x, y: START.y }
    var facing = 1
    var u = 0
    var hold = false
    var raf = 0
    var lastT = 0
    var arrived = false
    var cs = []
    function save () { api.persist({ target: target, wants: wants }) }
    function defaultRoute () { var t = ISL[target].dock; return [{ x: START.x, y: START.y }, { x: (START.x + t.x) / 2, y: (START.y + t.y) / 2 + 20 }, { x: t.x, y: t.y }] }

    var svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672')
    svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:4'
    svg.innerHTML = '<path id="rt-o" fill="none" stroke="#13318A" stroke-width="16" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/><path id="rt-i" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 18"/>'
    sc.appendChild(svg)
    var rtO = svg.querySelector('#rt-o')
    var rtI = svg.querySelector('#rt-i')
    function drawRoute (pts) { var d = pts.length ? 'M' + pts.map(function (p) { return p.x + ',' + p.y }).join(' L') : ''; rtO.setAttribute('d', d); rtI.setAttribute('d', d) }

    // ---- island signs (crates wanted); the flag marks the target
    var signs = {}
    KEYS.forEach(function (k) {
      var s = ISL[k].sign
      var n = wants[k]
      var sg = api.at(sc, 'psign', s.x, s.y, 150, 130)
      sg.setAttribute('data-island', k)
      sg.setAttribute('data-want', String(n))
      sg.style.cssText += ';z-index:5;pointer-events:none;background:#FFF8E6;border:6px solid #13318A;border-radius:22px;box-shadow:0 8px 0 rgba(19,49,138,.35)'
      for (var i = 0; i < n; i++) api.art(sg, 'pc2-peti', 8 + (i % 3) * 43, 8 + Math.floor(i / 3) * 34, 42, 32, '')
      var nb = api.at(sg, '', 0, 66, 138, 54)
      nb.style.cssText += ';font:900 42px/54px Fredoka,Nunito,sans-serif;color:#13318A;text-align:center'
      nb.textContent = String(n)
      if (k === target) {
        var fl = api.art(sc, 'prop-bendera', s.x + 92, s.y - 82, 80, 112, 'pflag')
        fl.setAttribute('data-flag', k)
        fl.style.cssText += ';z-index:6;pointer-events:none'
        if (fl.animate && !api.reduced()) fl.animate([{ transform: 'rotate(-4deg)' }, { transform: 'rotate(4deg)' }, { transform: 'rotate(-4deg)' }], { duration: 1800, iterations: Infinity, easing: 'ease-in-out' })
      }
      signs[k] = sg
    })
    // ghost ferry where the route must end
    var gd = ISL[target].dock
    var gs = scaleAt(gd.y)
    var goalG = K.ghost(api, sc, 'veh-harbor-ferry', gd.x - TW * gs / 2, gd.y - TH * gs, TW * gs, TH * gs, true, true)
    goalG.setAttribute('data-goal', target)
    goalG.style.zIndex = '4'

    // ---- ferry: positioned+scaled > flip > tilt > art + driver + deck crates
    var ferry = api.at(sc, '', 0, 0, TW, TH, 'button')
    ferry.type = 'button'
    ferry.setAttribute('data-ferry', '1')
    ferry.setAttribute('aria-label', 'Feri pelabuhan')
    ferry.style.cssText += ';background:none;border:0;padding:0;z-index:6;touch-action:none;cursor:default;transform-origin:50% 100%'
    var flip = api.at(ferry, '', 0, 0, TW, TH)
    flip.style.pointerEvents = 'none'
    var tilt = api.at(flip, '', 0, 0, TW, TH)
    tilt.style.cssText += ';pointer-events:none;transform-origin:50% 82%;transition:transform .7s cubic-bezier(.34,1.5,.64,1)'
    var fart = api.art(tilt, 'veh-harbor-ferry', 0, 0, TW, TH, '')
    fart.setAttribute('data-veh', 'harbor-ferry')
    K.driver(tilt, { x: 0.275, y: 0.285, w: 0.2, h: 0.115 })
    function place (x, y) {
      cur = { x: x, y: y }
      ferry.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH) + 'px) scale(' + scaleAt(y) + ')'
    }
    function face (d) { facing = d; flip.style.transform = d < 0 ? 'scaleX(-1)' : 'none' }
    place(START.x, START.y)

    // ---- level + crates (as W05-M03, on the smaller ferry)
    var lvl = api.at(sc, 'level', 1290, 680, 250, 76)
    lvl.setAttribute('data-level', '1')
    lvl.style.cssText += ';z-index:7;pointer-events:none;background:#FFF8E6;border:6px solid #13318A;border-radius:38px;display:none'
    var tube = api.at(lvl, '', 20, 20, 204, 26)
    tube.style.cssText += ';border-radius:13px;background:linear-gradient(#cfeaff,#8fc6f0);border:3px solid #13318A'
    var mark = api.at(tube, '', 92, 0, 16, 20)
    mark.style.cssText += ';border-left:3px solid #13318A;border-right:3px solid #13318A'
    var bub = api.at(tube, '', 86, 1, 30, 20)
    bub.style.cssText += ';border-radius:50%;background:#fff;border:3px solid #13318A;transition:left .6s cubic-bezier(.34,1.5,.64,1),background .3s'
    function count (t) { return cs.filter(function (c) { return c.loc.t === t }).length }
    function lean () {
      var d = Math.max(-12, Math.min(12, (count('R') - count('L')) * 3.6))
      tilt.style.transform = 'rotate(' + d + 'deg)'
      bub.style.left = (86 - d * 6) + 'px'
      var ok = count('R') === count('L') && count('L') + count('R') === 4
      bub.style.background = count('R') === count('L') && count('L') > 0 ? '#41C27D' : '#fff'
      return ok
    }
    function slotPos (c) { var s = c.loc.t === 'L' ? LS[c.loc.i] : RS[c.loc.i]; return { x: s.x * TW - DW / 2, y: s.y * TH - DH } }
    function render (c) {
      var e = c.el
      if (c.loc.t === 'pile') {
        if (e.parentNode !== sc) sc.appendChild(e)
        e.style.left = PILE[c.loc.i].x + 'px'; e.style.top = PILE[c.loc.i].y + 'px'; e.style.width = PW + 'px'; e.style.height = PH + 'px'; e.style.zIndex = '7'
      } else if (c.loc.t === 'L' || c.loc.t === 'R') {
        if (e.parentNode !== tilt) tilt.appendChild(e)
        var p = slotPos(c)
        e.style.left = p.x + 'px'; e.style.top = p.y + 'px'; e.style.width = DW + 'px'; e.style.height = DH + 'px'; e.style.zIndex = '3'
      }
      e.style.display = c.loc.t === 'gone' ? 'none' : 'block'
      e.setAttribute('data-side', c.loc.t)
    }
    function free (t) { var n = t === 'pile' ? 4 : 4; for (var i = 0; i < n; i++) { var us = false; cs.forEach(function (c) { if (c.loc.t === t && c.loc.i === i) us = true }); if (!us) return i } return -1 }
    for (var n = 0; n < 4; n++) {
      var el = api.at(sc, 'mcrate', 0, 0, PW, PH)
      el.setAttribute('data-crate', String(n))
      el.style.cssText += ';touch-action:none;cursor:grab;pointer-events:auto;display:none'
      api.art(el, 'pc2-peti', 0, 0, 100, 100, '')
      el.firstChild.style.cssText += ';position:absolute;left:0;top:0;width:100%;height:100%'
      cs.push({ id: n, el: el, loc: { t: 'gone', i: 0 } })
    }
    var drag = null
    cs.forEach(function (c) {
      var e = c.el
      e.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 1 || busy || drag || c.loc.t === 'gone') return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        drag = { id: ev.pointerId, c: c, moved: 0, x0: r.x, y0: r.y, p: r }
        K.juice(api, 'pop', r.x, r.y, e)
        e.classList.remove('glow')
        if (e.parentNode !== sc) sc.appendChild(e)
        e.style.width = PW + 'px'; e.style.height = PH + 'px'; e.style.zIndex = '30'
        e.style.left = (r.x - PW / 2) + 'px'; e.style.top = (r.y - PH / 2) + 'px'
        try { e.setPointerCapture(ev.pointerId) } catch (er) { /* synthetic */ }
      })
      e.addEventListener('pointermove', function (ev) {
        if (!drag || ev.pointerId !== drag.id || drag.c !== c) return
        var r = B.toRef(ev.clientX, ev.clientY)
        drag.p = r
        drag.moved = Math.max(drag.moved, Math.abs(r.x - drag.x0) + Math.abs(r.y - drag.y0))
        e.style.left = (r.x - PW / 2) + 'px'; e.style.top = (r.y - PH / 2) + 'px'
      })
      function end (ev, cancel) {
        if (!drag || ev.pointerId !== drag.id || drag.c !== c) return
        var d = drag
        drag = null
        var prev = c.loc
        c.loc = { t: 'gone', i: 0 }
        var onShip = Math.abs(d.p.x - cur.x) < TW / 2 + 20 && d.p.y > cur.y - TH - 20 && d.p.y < cur.y + 20
        var to = null
        if (!cancel && d.moved > 10 && onShip) {
          var side = d.p.x < cur.x - TW / 2 + SPLIT * TW ? 'L' : 'R'
          var si = free(side)
          if (si >= 0) to = { t: side, i: si }
        } else if (!cancel && d.moved > 10) { var pi = free('pile'); if (pi >= 0) to = { t: 'pile', i: pi } }
        if (!to) { c.loc = prev; if (!cancel) api.warn(d.moved > 10 ? L.toShip : L.dragCrate) } else c.loc = to
        render(c)
        if (to && to.t !== 'pile') { K.juice(api, 'splash', cur.x, cur.y - 20); K.land(api, e); K.ripple(svg, cur.x, cur.y - 12, 130) } else if (to) { api.sfx('bump'); K.land(api, e) }
        var ok = lean()
        if (to && to.t !== 'pile') verdict(ok)
      }
      e.addEventListener('pointerup', function (ev) { end(ev, false) })
      e.addEventListener('pointercancel', function (ev) { end(ev, true) })
      e.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    function verdict (ok) {
      var l = count('L')
      var r = count('R')
      if (ok) { loaded(); return }
      if (l + r < 4) return
      K.juice(api, 'wobble', cur.x, cur.y - 150, ferry)
      if (r > l) api.warn(L.leanRight)
      else api.warn(L.leanLeft)
    }
    function loaded () {
      if (busy) return
      busy = true
      K.juice(api, 'cheer', cur.x, cur.y - TH + 40)
      K.juice(api, 'horn', cur.x + 100, cur.y - 200)
      api.warn(L.level)
      api.later(function () {
        K.ask(api, { custom: { id: 'm05-side', prompt: '4 peti, kiri dan kanan sama. Tiap sisi berapa?', choices: ['1', '2', '3'], answer: '2', count: { key: 'pc2-peti', n: 2 }, hint1: 'Empat dibagi dua sisi. Dua dan dua.' }, done: function () { busy = false; api.advance() } })
      }, 900)
    }

    // ---- step 1: draw the route
    var dr = null
    ferry.addEventListener('pointerdown', function (ev) {
      var s = api.step()
      api.touch()
      if (busy) return
      if (s === 0) {
        var r = B.toRef(ev.clientX, ev.clientY)
        dr = { id: ev.pointerId, pts: [{ x: START.x, y: START.y }], last: r, len: 0 }
        route = null
        drawRoute(dr.pts)
        ferry.classList.remove('glow')
        try { ferry.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
        return
      }
      if (s === 2 && !arrived) {
        try { ferry.setPointerCapture(ev.pointerId) } catch (e2) { /* synthetic */ }
        dr = { id: ev.pointerId, sail: true }
        hold = true
        lastT = performance.now()
        K.juice(api, 'horn', cur.x + 80, cur.y - 160)
        ferry.classList.remove('glow')
        raf = requestAnimationFrame(sail)
      }
    })
    ferry.addEventListener('pointermove', function (ev) {
      if (!dr || dr.sail || ev.pointerId !== dr.id) return
      var r = B.toRef(ev.clientX, ev.clientY)
      if (dist(r, dr.last) < 14) return
      dr.len += dist(r, dr.last)
      dr.last = r
      dr.pts.push({ x: Math.round(r.x), y: Math.round(r.y) })
      drawRoute(dr.pts)
      if (dr.pts.length % 5 === 0) { K.ripple(svg, r.x, r.y, 36); api.sfx('tap') }
    })
    function rend (ev, cancel) {
      if (!dr || ev.pointerId !== dr.id) return
      var d = dr
      dr = null
      if (d.sail) { hold = false; cancelAnimationFrame(raf); if (!arrived && u < 1) api.warn(L.holdMore); return }
      if (cancel) { drawRoute([]); return }
      checkRoute(d)
    }
    ferry.addEventListener('pointerup', function (ev) { rend(ev, false) })
    ferry.addEventListener('pointercancel', function (ev) { rend(ev, true) })
    ferry.addEventListener('lostpointercapture', function (ev) { rend(ev, true) })
    function reject (msg) { api.warn(msg); K.juice(api, 'wobble', cur.x, cur.y - 120, ferry); drawRoute([]); route = null; K.glow(ferry, 2600) }
    function checkRoute (d) {
      var pts = d.pts
      if (d.len < 120 || pts.length < 4) { reject(L.drawIt); return }
      var end = pts[pts.length - 1]
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i]
        if (onLand(p)) { reject(L.onLand); return }
        for (var k = 0; k < KEYS.length; k++) {
          var is = ISL[KEYS[k]]
          if (dist(p, is.c) < is.r - 30 && !(KEYS[k] === target && dist(end, ISL[target].dock) < 190)) { reject(L.onLand); return }
        }
      }
      if (dist(end, ISL[target].dock) < 170) { accept(pts); return }
      var wrong = null
      KEYS.forEach(function (k) { if (k !== target && dist(end, ISL[k].dock) < 190) wrong = k })
      if (wrong) { reject(L.wrongIsland.replace('%n', String(wants[wrong]))); K.glow(signs[wrong], 2400); K.glow(signs[target], 3200); return }
      reject(L.drawIt)
      K.glow(goalG, 3000)
    }
    function accept (pts) {
      // resample + make it end on the ghost ferry
      var out = pts.slice(0)
      out.push({ x: ISL[target].dock.x, y: ISL[target].dock.y })
      route = out
      drawRoute(route)
      K.juice(api, 'cheer', ISL[target].dock.x, ISL[target].dock.y - 80)
      api.warn(L.routeOk)
      api.later(function () { api.advance() }, 1000)
    }

    // ---- step 3: hold to sail along the route
    var segs = []
    var total = 0
    function buildSegs () {
      segs = []
      total = 0
      var r = route || defaultRoute()
      for (var i = 1; i < r.length; i++) { var l = dist(r[i - 1], r[i]); segs.push({ a: r[i - 1], b: r[i], l: l, s: total }); total += l }
    }
    function posAt (v) {
      var t = v * total
      for (var i = 0; i < segs.length; i++) {
        if (t <= segs[i].s + segs[i].l || i === segs.length - 1) { var k = segs[i].l ? Math.min(1, (t - segs[i].s) / segs[i].l) : 1; return { x: segs[i].a.x + (segs[i].b.x - segs[i].a.x) * k, y: segs[i].a.y + (segs[i].b.y - segs[i].a.y) * k } }
      }
      return START
    }
    function sail (now) {
      if (!hold || arrived) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      u = Math.min(1, u + dt / 4200)
      var p = posAt(u)
      if (p.x > cur.x + 0.5) face(-1); else if (p.x < cur.x - 0.5) face(1)
      place(p.x, p.y + Math.sin(now / 90) * 1.2)
      if (u >= 1) { hold = false; arrive(); return }
      raf = requestAnimationFrame(sail)
    }
    function arrive () {
      if (arrived) return
      arrived = true
      hold = false
      cancelAnimationFrame(raf)
      goalG.style.display = 'none'
      place(ISL[target].dock.x, ISL[target].dock.y)
      K.juice(api, 'splash', cur.x, cur.y - 14)
      K.juice(api, 'horn', cur.x, cur.y - 150)
      K.ripple(svg, cur.x, cur.y - 10, 120)
      drawRoute([])
      api.warn(L.arrived)
      unload()
    }
    function unload () {
      busy = true
      var is = ISL[target]
      var nn = 0
      cs.forEach(function (c, i) {
        var rr = c.el.getBoundingClientRect()
        var p0 = B.toRef(rr.left, rr.top)
        c.el.style.display = 'none'
        var fl = api.at(sc, 'hopcrate', 0, 0, DW, DH)
        fl.style.cssText += ';z-index:9;pointer-events:none;transform-origin:50% 50%'
        api.art(fl, 'pc2-peti', 0, 0, DW, DH, '')
        var to = { x: is.c.x - 100 + i * 60, y: is.c.y + 40 + (i % 2) * 20 }
        api.later(function () {
          K.juice(api, 'pop', p0.x + 30, p0.y + 20)
          api.tween(p0, to, 600, function (p, k) { fl.style.transform = 'translate(' + p.x + 'px,' + (p.y - Math.sin(k * Math.PI) * 110) + 'px) scale(' + (1 + k * 0.5) + ')' }, function () {
            api.sfx('ok')
            api.fx('gold-star', to.x + 30, to.y, 120)
            var nb = api.at(sc, 'snum', to.x + 20, to.y - 54, 52, 52)
            nb.style.cssText += ';z-index:15;pointer-events:none;border-radius:50%;background:#fff;border:5px solid #13318A;color:#13318A;font:900 34px/42px Fredoka,Nunito,sans-serif;text-align:center'
            nb.textContent = String(i + 1)
            nb.setAttribute('data-num', String(i + 1))
            nn++
            if (nn === 4) finish()
          })
        }, i * 520)
      })
    }
    function finish () {
      api.fx('confetti', ISL[target].c.x, ISL[target].c.y, 340)
      api.later(function () {
        K.ask(api, { custom: { id: 'm05-sum', prompt: '4 peti sudah sampai, 3 peti menunggu. Berapa semuanya?', choices: ['6', '7', '8'], answer: '7', scene: { groups: [{ key: 'pc2-peti', n: 4 }, { key: 'pc2-peti', n: 3 }] }, hint1: 'Empat tambah tiga. Hitung dari empat.' }, done: function () {
          api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { api.later(function () { busy = false; api.advance() }, 300) } }) }, 400)
        } })
      }, 900)
    }

    function firstPile () { for (var i = 0; i < cs.length; i++) if (cs[i].loc.t === 'pile') return cs[i]; return null }
    var ctl = {
      onStep: function (n) {
        goalG.style.display = n <= 1 ? 'block' : 'none'
        ferry.style.cursor = n === 0 || n === 2 ? 'grab' : 'default'
        if (n === 0) { K.glow(ferry, 3200); K.glow(signs[target], 3200) }
        if (n === 1) {
          drawRoute(route || [])
          place(START.x, START.y)
          face(1)
          lvl.style.display = 'block'
          cs.forEach(function (c, i) { c.loc = { t: 'pile', i: i }; render(c); K.glow(c.el, 3200) })
          api.warn(L.dragCrate)
        }
        if (n === 2) {
          lvl.style.display = 'none'
          buildSegs()
          drawRoute(route || defaultRoute())
          u = 0
          place(START.x, START.y)
          if (!cs.some(function (c) { return c.loc.t === 'L' || c.loc.t === 'R' })) cs.forEach(function (c, i) { c.loc = { t: i < 2 ? 'L' : 'R', i: i % 2 }; render(c) })
          lean()
          K.glow(ferry, 3200)
        }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        var d = ISL[target].dock
        if (n === 0) hd.move([{ x: START.x, y: START.y - 120 }, { x: (START.x + d.x) / 2, y: (START.y + d.y) / 2 - 100 }, { x: d.x, y: d.y - 100 }], 1400)
        else if (n === 1) { var p = firstPile(); if (p) hd.move([{ x: PILE[p.loc.i].x + 65, y: PILE[p.loc.i].y + 50 }, { x: cur.x, y: cur.y - TH * 0.4 }], 1500) }
        else hd.move([{ x: cur.x - 30, y: cur.y - 150 }, { x: cur.x - 30, y: cur.y - 150 }], 2200)
      },
      hint: function (lvl2) {
        var s = api.step()
        if (s === 0) {
          K.glow(ferry, 3000); K.glow(signs[target], 3000)
          if (lvl2 >= 2) K.glow(goalG, 3000)
          if (lvl2 >= 4 && !busy) accept(defaultRoute())
        } else if (s === 1) {
          var p = firstPile()
          if (p) K.glow(p.el, 3000)
          if (lvl2 >= 4 && !busy) {
            cs.forEach(function (c, i) { c.loc = { t: i < 2 ? 'L' : 'R', i: i % 2 }; render(c) })
            verdict(lean())
          }
        } else {
          K.glow(ferry, 3000)
          if (lvl2 >= 4 && !arrived) { place(ISL[target].dock.x, ISL[target].dock.y); arrive() }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { hold = false; cancelAnimationFrame(raf) }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W05-M05', mod)
})(window)
