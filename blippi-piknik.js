/* G32 Blippi -- W04-M05 "Piknik Hasil Kebun" (PRD 11.5: Finale; P01/P07/P11; "Rencanakan pickup, hitung buah, antar ke meja"; V09 FARM TRACTOR), played INSIDE bg-w04-m05-piknik. Closes the world (badge + finished island).
 * 1 RENCANA (plan the order): three harvest piles (carrot / tomato / corn, each with its count) wait on the lawn; TAP them in the order you want to fetch them (numbers 1-2-3 appear and a soft route is drawn). Then "how many fruits altogether?" (sum).
 * 2 JEMPUT  (drive, hold): HOLD the tractor and it follows YOUR route; at each pile it stops and the fruit hops onto the trailer (hold again to go on); the last leg ends at the picnic blanket. Then a colour question.
 * 3 HIDANG  (serve): the trailer tips its load into three baskets; drag every fruit onto its ghost place on the blanket (3 + 2 + 2). Then "how many carrots?" (count) and a SoalEngine maths question. Replay: another menu (2 / 3 / 3) and another route. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 150
  var TH = 130
  var TRW = 118
  var TRH = 66
  var START = { x: 330, y: 730 }
  var FINAL = { x: 640, y: 722 }
  var KINDS = [
    { id: 'wortel', key: 'w4-b-wortel', name: 'wortel', pile: { x: 560, y: 700 }, stop: { x: 440, y: 700 } },
    { id: 'tomat', key: 'w4-b-tomat', name: 'tomat', pile: { x: 770, y: 590 }, stop: { x: 640, y: 590 } },
    { id: 'jagung', key: 'w4-b-jagung', name: 'jagung', pile: { x: 1030, y: 552 }, stop: { x: 900, y: 552 } }
  ]
  var PW = 150
  var PH = 140
  var SRC = [{ x: 880, y: 570 }, { x: 1050, y: 570 }, { x: 1220, y: 570 }]
  var SLOT_W = 92
  var SLOT_H = 86
  // plate slots on the blanket per kind (first row / second row)
  var SLOTS = {
    wortel: [{ x: 850, y: 622 }, { x: 945, y: 622 }, { x: 1040, y: 622 }],
    tomat: [{ x: 1150, y: 622 }, { x: 1245, y: 622 }, { x: 1340, y: 622 }],
    jagung: [{ x: 900, y: 696 }, { x: 1000, y: 696 }, { x: 1100, y: 696 }]
  }
  function sc2 (y) { return Math.max(0.78, Math.min(1, 0.78 + 0.22 * ((y - 540) / 190))) }

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var step0 = api.restore ? api.restore.step : 0
    var again = !!(api.B.missionDone && api.B.missionDone('W04-M05'))
    var CNT = again ? { wortel: 2, tomat: 3, jagung: 3 } : { wortel: 3, tomat: 2, jagung: 2 }
    var TOT = CNT.wortel + CNT.tomat + CNT.jagung
    var order = (saved.order || []).slice()
    var placed = saved.placed || { wortel: 0, tomat: 0, jagung: 0 }
    if (step0 >= 1 && order.length < 3) order = [0, 1, 2]
    var busy = false
    var hd = null
    var holding = false
    var raf = 0
    var lastT = 0
    var face = -1
    var cur = { x: START.x, y: START.y }
    var leg = 0
    var legT = 0
    var arrived = step0 >= 2
    var loadedN = 0
    var pts = []
    function save () { api.persist({ order: order, placed: placed }) }
    function kindIdx (id) { for (var q = 0; q < 3; q++) if (KINDS[q].id === id) return q; return -1 }

    // ---- the three harvest piles (tap in the order you like)
    var pile = []
    var badge = []
    var numEl = []
    KINDS.forEach(function (k, i) {
      var el = api.at(sc, 'hpile', k.pile.x - PW / 2, k.pile.y - PH, PW, PH, 'button')
      el.type = 'button'
      el.setAttribute('data-pile', k.id)
      el.setAttribute('aria-label', 'Panen ' + k.name)
      el.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:pointer;touch-action:manipulation;transform-origin:50% 100%'
      var a = api.art(el, k.key, 0, 0, PW, PH, '')
      if (a.animate && !api.reduced()) a.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1600 + i * 190, iterations: Infinity, easing: 'ease-in-out' })
      var bd = api.at(el, 'cnt', PW - 46, -12, 56, 56)
      bd.style.cssText += ';border-radius:50%;background:#fff;border:5px solid #13318A;color:#13318A;font:900 32px/46px Fredoka,Nunito,sans-serif;text-align:center;z-index:2'
      bd.textContent = String(CNT[k.id])
      var nm = api.at(el, 'ord', 4, -12, 62, 62)
      nm.style.cssText += ';border-radius:50%;background:#F4761A;border:5px solid #fff;color:#fff;font:900 40px/52px Fredoka,Nunito,sans-serif;text-align:center;z-index:3;display:none'
      pile.push(el); badge.push(bd); numEl.push(nm)
      el.addEventListener('click', function () { onPile(i) })
    })
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941'); svg.setAttribute('width', '1672'); svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:3'
    sc.appendChild(svg)
    var routeEl = null
    function drawRoute () {
      if (routeEl && routeEl.parentNode) routeEl.parentNode.removeChild(routeEl)
      routeEl = null
      if (!order.length) return
      var p = [START].concat(order.map(function (i) { return KINDS[i].stop })).concat(order.length >= 3 ? [FINAL] : [])
      var d = 'M' + p.map(function (q) { return q.x + ',' + (q.y - 4) }).join(' L')
      routeEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      routeEl.setAttribute('d', d)
      routeEl.setAttribute('fill', 'none'); routeEl.setAttribute('stroke', 'rgba(255,255,255,.78)'); routeEl.setAttribute('stroke-width', '16'); routeEl.setAttribute('stroke-linecap', 'round'); routeEl.setAttribute('stroke-linejoin', 'round')
      svg.appendChild(routeEl)
    }
    function renumber () {
      numEl.forEach(function (n, i) { var o = order.indexOf(i); n.style.display = o >= 0 ? 'block' : 'none'; n.textContent = String(o + 1) })
      drawRoute()
    }
    function onPile (i) {
      if (api.step() !== 0 || busy) return
      api.touch()
      var o = order.indexOf(i)
      if (o >= 0) { order = order.slice(0, o); api.sfx('tap'); renumber(); save(); api.warn(L.pick); return }
      order.push(i)
      api.sfx('collect')
      api.fx('spark', KINDS[i].pile.x, KINDS[i].pile.y - 90, 110)
      if (pile[i].animate && !api.reduced()) pile[i].animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14,.9)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 320 })
      renumber(); save()
      if (order.length >= 3) { busy = true; api.sfx('ok'); api.warn(L.routed); api.later(askSum, 900) } else api.warn(L.pickMore)
    }
    function askSum () {
      var row = []
      ;[0, 1, 2].forEach(function (i, j) { var k = KINDS[order[i]]; if (j) row.push('+'); for (var q = 0; q < CNT[k.id]; q++) row.push(k.key) })
      K.ask(api, { custom: { id: 'w4m05-total', prompt: 'Berapa buah semuanya?', choices: [TOT - 1, TOT, TOT + 1].map(String), answer: String(TOT), row: row, rowNoBox: true, hint1: 'Hitung semua buahnya, satu per satu.' }, done: function () { busy = false; api.later(function () { api.advance() }, 350) } })
    }

    // ---- the tractor + trailer (unit origin = tractor centre on the ground line), trailer carries the fruit
    var unit = api.at(sc, '', 0, 0, 1, 1)
    unit.setAttribute('data-unit', '1')
    unit.style.cssText += ';z-index:6;touch-action:none'
    api.at(unit, 'shd', -TW / 2 + 6, -16, TW + TRW - 40, 26)
    var body = api.at(unit, '', 0, 0, 1, 1)
    var trailer = api.at(body, '', TW / 2 - 16, -TRH, TRW, TRH)
    trailer.setAttribute('data-trailer', '1')
    api.art(trailer, 'w4-trailer', 0, 0, TRW, TRH, '')
    var cargo = []
    function cargoXY (k) { return { x: 10 + (k % 4) * 24, y: k < 4 ? -22 : -42 } }
    var tractor = api.at(body, '', -TW / 2, -TH, TW, TH, 'button')
    tractor.type = 'button'
    tractor.setAttribute('data-tractor', '1')
    tractor.setAttribute('aria-label', 'Traktor')
    tractor.style.cssText += ';background:none;border:0;padding:0;cursor:default;touch-action:none'
    var tart = api.art(tractor, 'veh-farm-tractor', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'farm-tractor')
    K.driver(tractor, { x: 0.41, y: 0.16, w: 0.34, h: 0.34 })
    if (tractor.animate && !api.reduced()) tart.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], { duration: 1200, iterations: Infinity, easing: 'ease-in-out' })
    function place (x, y, bob) { cur = { x: x, y: y }; unit.style.transform = 'translate(' + x + 'px,' + (y + (bob || 0)) + 'px) scale(' + sc2(y) + ')'; body.style.transform = 'scaleX(' + face + ')' }
    function addCargo (key) {
      var k = cargo.length
      var p = cargoXY(k)
      var e = api.at(trailer, 'cargo', p.x, p.y, 26, 24)
      e.style.cssText += ';z-index:3;pointer-events:none'
      api.art(e, key, 0, 0, 26, 24, '')
      cargo.push(e)
      return e
    }
    place(cur.x, cur.y)
    if (step0 >= 2) { place(FINAL.x, FINAL.y) }
    if (step0 >= 2) { KINDS.forEach(function (k, i) { pile[i].style.display = 'none' }) }

    // ---- step 2: hold to follow the planned route, stop at every pile
    function buildPts () { pts = [START].concat(order.map(function (i) { return KINDS[i].stop })).concat([FINAL]) }
    var goal = null
    function drive (now) {
      if (!holding || arrived || busy) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      var a = pts[leg]
      var b = pts[leg + 1]
      var dist = Math.hypot(b.x - a.x, b.y - a.y)
      legT = Math.min(1, legT + dt / Math.max(900, dist * 4.2))
      var x = a.x + (b.x - a.x) * legT
      var y = a.y + (b.y - a.y) * legT
      if (Math.abs(b.x - a.x) > 4) face = b.x > a.x ? -1 : 1
      place(x, y, Math.sin(now / 55) * 1.2)
      if (now - (drive.d || 0) > 190) { drive.d = now; api.fx('dust', x + (face === -1 ? -(TW / 2 + TRW) : (TW / 2 + TRW)) * sc2(y), y - 8, 70) }
      if (Math.floor(now / 520) !== Math.floor((now - dt) / 520)) api.sfx('boost')
      if (legT >= 1) { holding = false; atPoint(leg + 1); return }
      raf = requestAnimationFrame(drive)
    }
    function atPoint (k) {
      leg = k
      legT = 0
      place(pts[k].x, pts[k].y)
      if (k >= pts.length - 1) return arrive()
      var i = order[k - 1]
      var kd = KINDS[i]
      busy = true
      api.sfx('bump')
      api.fx('dust', pts[k].x, pts[k].y, 120)
      for (var q = 0; q < CNT[kd.id]; q++) {
        ;(function (qq) {
          api.later(function () {
            addCargo(kd.key)
            K.land(api, cargo[cargo.length - 1])
            api.sfx('collect')
            api.fx('spark', kd.pile.x, kd.pile.y - 70, 90)
            loadedN++
            if (qq === CNT[kd.id] - 1) { pile[i].style.display = 'none'; busy = false; api.warn(k < 3 ? L.holdMore : L.holdLast) }
          }, 250 + qq * 260)
        })(q)
      }
    }
    function arrive () {
      if (arrived) return
      arrived = true
      holding = false
      cancelAnimationFrame(raf)
      if (goal) goal.style.display = 'none'
      face = -1
      place(FINAL.x, FINAL.y)
      api.sfx('ok')
      api.fx('dust', FINAL.x, FINAL.y, 150)
      api.later(function () {
        K.ask(api, { custom: { id: 'w4m05-merah', prompt: 'Buah mana yang berwarna merah?', choices: ['Wortel', 'Tomat', 'Jagung'], choicePics: ['assets/blippi/w4-b-wortel.webp', 'assets/blippi/w4-b-tomat.webp', 'assets/blippi/w4-b-jagung.webp'], answer: 'Tomat', hint1: 'Warnanya seperti apel merah.' }, done: function () { api.later(function () { api.advance() }, 350) } })
      }, 700)
    }
    var td = null
    unit.addEventListener('pointerdown', function (ev) {
      if (busy) return
      api.touch()
      var s = api.step()
      if (s === 0) { api.warn(L.pickMore); pile.forEach(function (p) { K.glow(p, 2200) }); return }
      if (s === 2) { api.warn(L.dragFruit); return }
      if (arrived) return
      try { unit.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      td = ev.pointerId
      holding = true
      lastT = performance.now()
      api.sfx('honk')
      tractor.classList.remove('glow')
      raf = requestAnimationFrame(drive)
    })
    function release (ev) {
      if (td === null || ev.pointerId !== td) return
      td = null
      holding = false
      cancelAnimationFrame(raf)
      if (!arrived && !busy) api.warn(L.holdMore)
    }
    unit.addEventListener('pointerup', release)
    unit.addEventListener('pointercancel', release)
    unit.addEventListener('lostpointercapture', release)

    // ---- step 3: serve the picnic
    var ghosts = {}
    var src = {}
    var srcBadge = {}
    var plated = {}
    function remaining (id) { return CNT[id] - placed[id] }
    function mkGhost (id, j) {
      var s = SLOTS[id][j]
      var g = K.ghost(api, sc, KINDS[kindIdx(id)].key, s.x, s.y, SLOT_W, SLOT_H, false, true)
      g.setAttribute('data-gap', id + j)
      return g
    }
    function setupServe (initial) {
      KINDS.forEach(function (k, i) {
        ghosts[k.id] = []
        for (var j = 0; j < CNT[k.id]; j++) {
          if (j < placed[k.id]) putFruit(k.id, j, true)
          else ghosts[k.id].push(mkGhost(k.id, j))
        }
        var s = SRC[i]
        var el = api.at(sc, 'src', s.x - PW / 2, s.y - PH, PW, PH, 'button')
        el.type = 'button'
        el.setAttribute('data-src', k.id)
        el.setAttribute('aria-label', 'Ambil ' + k.name)
        el.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none'
        var a = api.art(el, k.key, 0, 0, PW, PH, '')
        if (a.animate && !api.reduced()) a.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1600 + i * 190, iterations: Infinity, easing: 'ease-in-out' })
        var bd = api.at(el, 'cnt', PW - 46, -12, 56, 56)
        bd.style.cssText += ';border-radius:50%;background:#fff;border:5px solid #13318A;color:#13318A;font:900 32px/46px Fredoka,Nunito,sans-serif;text-align:center;z-index:2'
        src[k.id] = el; srcBadge[k.id] = bd
        setSrc(k.id)
        if (!initial && remaining(k.id) > 0) K.land(api, el)
        K.dragCard(api, el, {
          enabled: function () { return api.step() === 2 && !busy && remaining(k.id) > 0 },
          make: function (parent) { var f = api.at(parent, '', 0, 0, 120, 112); api.art(f, k.key, 0, 0, 120, 112, ''); f.style.filter = 'drop-shadow(0 8px 8px rgba(0,0,0,.3))'; return f },
          onLift: function () { el.classList.remove('glow'); api.sfx('tap') },
          tap: function () { api.warn(L.dragFruit); (ghosts[k.id] || []).forEach(function (g) { if (g.style.display !== 'none') K.glow(g, 2400) }) },
          drop: function (pt) { return tryPlace(k.id, pt) },
          home: function () { return { x: s.x - PW / 2 + 10, y: s.y - PH + 10 } }
        })
      })
      if (!initial) {
        cargo.forEach(function (e) { e.style.display = 'none' })
        if (trailer.animate && !api.reduced()) trailer.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg)', offset: 0.4 }, { transform: 'rotate(0)' }], { duration: 900 })
        api.sfx('bump')
        api.warn(L.unload)
      }
    }
    function setSrc (id) { var n = remaining(id); badgeText(id, n); src[id].style.display = n > 0 ? 'block' : 'none' }
    function badgeText (id, n) { srcBadge[id].textContent = String(n) }
    function putFruit (id, j, quiet) {
      var s = SLOTS[id][j]
      var e = api.at(sc, 'fruit', s.x, s.y, SLOT_W, SLOT_H)
      e.setAttribute('data-placed', id)
      e.style.cssText += ';z-index:4;pointer-events:none;transform-origin:50% 100%'
      api.art(e, KINDS[kindIdx(id)].key, 0, 0, SLOT_W, SLOT_H, '')
      if (!quiet && e.animate && !api.reduced()) e.animate([{ transform: 'scale(.5,.4)', opacity: 0 }, { transform: 'scale(1.12,.88)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)' }], { duration: 440, easing: 'cubic-bezier(.23,1,.32,1)' })
      return e
    }
    function tryPlace (id, pt) {
      var best = null
      var bd = 1e9
      KINDS.forEach(function (k) {
        ;(ghosts[k.id] || []).forEach(function (g, j) {
          if (g.style.display === 'none') return
          var s = SLOTS[k.id][j]
          var d = Math.hypot(pt.x - (s.x + SLOT_W / 2), pt.y - (s.y + SLOT_H / 2))
          if (d < 95 && d < bd) { best = { id: k.id, j: j, g: g }; bd = d }
        })
      })
      if (!best) { api.warn(L.toGhost); api.sfx('bad'); return false }
      if (best.id !== id) { api.warn(L.wrongKind.replace('%n', KINDS[kindIdx(best.id)].name)); api.sfx('bad'); K.glow(best.g, 2600); K.glow(src[best.id], 2600); return false }
      best.g.style.display = 'none'
      putFruit(id, best.j)
      placed[id]++
      setSrc(id)
      api.sfx('bump')
      api.fx('dust', pt.x, pt.y + 30, 100)
      api.fx('spark', pt.x, pt.y - 20, 100)
      save()
      var total = placed.wortel + placed.tomat + placed.jagung
      if (total >= TOT) { busy = true; api.later(feast, 500) }
      else api.warn(L.plantMore)
      return true
    }
    function feast () {
      api.sfx('win')
      api.fx('confetti', 1100, 560, 420)
      api.fx('gold-star', 1100, 640, 260)
      api.fx('rainbow', 1100, 400, 360)
      api.warn(L.feast)
      api.later(function () {
        var c = CNT.wortel
        K.ask(api, { custom: { id: 'w4m05-wortel', prompt: 'Ada berapa wortel di tikar?', choices: [c - 1, c, c + 1].map(String), answer: String(c), count: { key: 'w4-b-wortel', n: c }, hint1: 'Hitung wortelnya satu per satu.' }, done: function () {
          api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } }) }, 300)
        } })
      }, 1500)
    }

    function nextGhost () { for (var q = 0; q < 3; q++) { var id = KINDS[q].id; for (var j = 0; j < (ghosts[id] || []).length; j++) if (ghosts[id][j].style.display !== 'none') return { id: id, j: j } } return null }
    var ctl = {
      onStep: function (n, initial) {
        pile.forEach(function (p, i) { p.style.cursor = n === 0 ? 'pointer' : 'default' })
        tractor.style.cursor = n === 1 ? 'grab' : 'default'
        if (n === 0) { pile.forEach(function (p) { K.glow(p, 3400) }); renumber() }
        if (n === 1) {
          buildPts()
          pile.forEach(function (p) { p.classList.remove('glow') })
          if (!goal) { goal = K.ghost(api, sc, 'veh-farm-tractor', FINAL.x - TW / 2, FINAL.y - TH, TW, TH, true, true); goal.setAttribute('data-goal', '1') }
          K.glow(tractor, 3400)
        }
        if (n === 2) {
          if (goal) goal.style.display = 'none'
          if (routeEl) routeEl.style.display = 'none'
          setupServe(!!initial)
          KINDS.forEach(function (k) { if (remaining(k.id) > 0) K.glow(src[k.id], 3400) })
        }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var i0 = [0, 1, 2].filter(function (q) { return order.indexOf(q) < 0 })[0]; if (i0 != null) hd.move([{ x: KINDS[i0].pile.x, y: KINDS[i0].pile.y - 70 }, { x: KINDS[i0].pile.x, y: KINDS[i0].pile.y - 70 }], 1600) }
        else if (n === 1) hd.move([{ x: cur.x, y: cur.y - 90 }, { x: cur.x, y: cur.y - 90 }], 2200)
        else { var g = nextGhost(); if (g) { var s = SRC[kindIdx(g.id)]; var sl = SLOTS[g.id][g.j]; hd.move([{ x: s.x, y: s.y - 70 }, { x: sl.x + 45, y: sl.y + 40 }], 1200) } }
      },
      hint: function (lvl) {
        var s = api.step()
        if (busy) return
        if (s === 0) {
          var i0 = [0, 1, 2].filter(function (q) { return order.indexOf(q) < 0 })[0]
          if (i0 != null) { K.glow(pile[i0], 3000); if (lvl >= 4) onPile(i0) }
        } else if (s === 1) {
          K.glow(tractor, 3000)
          if (lvl >= 4 && !arrived) { var kk = leg; if (kk < pts.length - 1) { holding = false; atPoint(kk + 1) } }
        } else {
          var g = nextGhost()
          if (g) { K.glow(ghosts[g.id][g.j], 3000); K.glow(src[g.id], 3000); if (lvl >= 4) tryPlace(g.id, { x: SLOTS[g.id][g.j].x + 40, y: SLOTS[g.id][g.j].y + 40 }) }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { holding = false; cancelAnimationFrame(raf) }
    }
    renumber()
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W04-M05', mod)
})(window)
