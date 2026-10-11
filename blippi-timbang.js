/* G32 Blippi -- W04-M03 "Keranjang Seimbang" (PRD 11.5 + 12.3: Predict & Test; P05/P09; "Angkat muatan rendah, uji distribusi kiri/kanan"; V10 = FORKLIFT), played INSIDE bg-w04-m03-keranjang.
 * A balance platform stands on the paved yard (the deck tilts, the pedestal stays); four identical apple baskets lie on the right; the forklift (Blippi in the cab) waits at the left.
 * 1 TARUH   (trial A): drag all four baskets onto the LEFT side (ghost baskets show the places) - the deck tips left a little more with each. Then "Berapa keranjang di kiri?" (count).
 * 2 SEIMBANG (trial B): predict (Miring / Seimbang), then drag two baskets from left to right (ghosts on the right): 2 + 2 and the deck levels out with a chime. Then 2 + 2 = ? (sum). Any other split just tips the deck and says why.
 * 3 ANGKAT  : the forklift's forks take the four baskets; HOLD the forklift and it rolls to the loading dock (ghost forklift + ghost baskets), forks lower, baskets land. Then a SoalEngine maths question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var DX = 280
  var DW = 700
  var DH = 169
  var PIV = 424
  var BW = 150
  var BH = 114
  var SLOTS = {
    L: [{ cx: -115, by: -89, s: 1 }, { cx: -270, by: -89, s: 1 }, { cx: -115, by: -129, s: 0.88 }, { cx: -270, by: -129, s: 0.88 }],
    R: [{ cx: 115, by: -89, s: 1 }, { cx: 270, by: -89, s: 1 }, { cx: 115, by: -129, s: 0.88 }, { cx: 270, by: -129, s: 0.88 }]
  }
  var PILE = [0, 1, 2, 3].map(function (i) { return { x: 1000 + i * 162, y: 621 } })
  var TW = 250
  var TH = 200
  var START = { x: 170, y: 730 }
  var MID = { x: 960, y: 730 }
  var DOCK = { x: 1240, y: 545 }
  var DOCKB = [{ x: 1365, y: 505 }, { x: 1455, y: 505 }, { x: 1365, y: 455 }, { x: 1455, y: 455 }]
  var LB = 68      // small basket on the forks
  var LH = 52

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var step0 = api.restore ? api.restore.step : 0
    var Z = (saved.Z || [null, null, null, null]).slice()
    if (step0 >= 2) Z = ['L', 'L', 'R', 'R']
    var busy = false
    var hd = null
    var holding = false
    var u = 0
    var raf = 0
    var lastT = 0
    var arrived = false
    var cur = { x: START.x, y: START.y, s: 1 }
    function save () { api.persist({ Z: Z }) }
    function cnt (z, skip) { var n = 0; Z.forEach(function (v, i) { if (v === z && i !== skip) n++ }); return n }

    // ---- the platform: pedestal (still) + deck (tilts about its centre)
    var base = api.at(sc, 'pbase', DX, PIV, DW, 176)
    base.style.zIndex = '3'
    base.style.pointerEvents = 'none'
    api.art(base, 'w4-base', 0, 0, DW, 176, '')
    var deck = api.at(sc, 'pdeck', DX, PIV - DH, DW, DH)
    deck.setAttribute('data-deck', '1')
    deck.style.cssText += ';z-index:4;transform-origin:50% 100%;transition:transform .7s cubic-bezier(.34,1.56,.64,1)'
    var dart = api.art(deck, 'w4-deck', 0, 0, DW, DH, '')
    dart.style.pointerEvents = 'none'
    function setTilt () {
      var d = Math.max(-10, Math.min(10, (cnt('L') - cnt('R')) * 2.6))
      deck.style.transform = 'rotate(' + (-d) + 'deg)'
      deck.setAttribute('data-tilt', d.toFixed(1))
    }
    function slotPos (z, k) { var s = SLOTS[z][k]; return { x: DW / 2 + s.cx - BW / 2, y: DH + s.by - BH, s: s.s } }

    // ---- ghost baskets (what will be there)
    var ghosts = { L: [], R: [] }
    ;['L', 'R'].forEach(function (z) {
      for (var k = 0; k < 4; k++) {
        var p = slotPos(z, k)
        var g = K.ghost(api, deck, 'w4-keranjang', p.x, p.y, BW, BH, false, true)
        g.setAttribute('data-gap', z + k)
        g.style.display = 'none'
        g.style.zIndex = '1'
        ghosts[z].push(g)
      }
    })
    function showGhosts () {
      var s = api.step()
      var nL = cnt('L')
      var nR = cnt('R')
      ghosts.L.forEach(function (g, k) { g.style.display = s === 0 && k >= nL ? 'block' : 'none' })
      ghosts.R.forEach(function (g, k) { g.style.display = s === 1 && k >= nR && k < 2 ? 'block' : 'none' })
    }

    // ---- the four baskets
    var bk = []
    function render (quiet) {
      var nL = 0
      var nR = 0
      Z.forEach(function (z, i) {
        var e = bk[i]
        e.style.opacity = '1'
        if (!z) {
          if (e.parentNode !== sc) sc.appendChild(e)
          e.style.left = PILE[i].x + 'px'; e.style.top = PILE[i].y + 'px'; e.style.transform = ''; e.style.zIndex = '7'
        } else {
          var k = z === 'L' ? nL++ : nR++
          var p = slotPos(z, k)
          if (e.parentNode !== deck) deck.appendChild(e)
          e.style.left = p.x + 'px'; e.style.top = p.y + 'px'; e.style.transform = 'scale(' + p.s + ')'; e.style.zIndex = String(k < 2 ? 3 : 2)
        }
      })
      setTilt()
      showGhosts()
    }
    for (var i = 0; i < 4; i++) {
      (function (idx) {
        var e = api.at(sc, 'bkt', PILE[idx].x, PILE[idx].y, BW, BH, 'button')
        e.type = 'button'
        e.setAttribute('data-basket', String(idx))
        e.setAttribute('aria-label', 'Keranjang apel')
        e.style.cssText += ';background:none;border:0;padding:0;cursor:grab;touch-action:none;transform-origin:50% 100%'
        var a = api.art(e, 'w4-keranjang', 0, 0, BW, BH, '')
        if (a.animate && !api.reduced()) a.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1600 + idx * 170, iterations: Infinity, easing: 'ease-in-out' })
        bk.push(e)
        K.dragCard(api, e, {
          enabled: function () { var s = api.step(); return !busy && ((s === 0 && !Z[idx]) || (s === 1 && !!Z[idx])) },
          make: function (parent) { var f = api.at(parent, '', 0, 0, BW, BH); api.art(f, 'w4-keranjang', 0, 0, BW, BH, ''); f.style.filter = 'drop-shadow(0 10px 8px rgba(0,0,0,.3))'; return f },
          onLift: function () { e.style.opacity = '.3'; e.classList.remove('glow'); api.sfx('tap') },
          onMiss: function () { api.later(function () { e.style.opacity = '1' }, 300) },
          tap: function () { api.sfx('tap'); if (api.step() === 0 && !Z[idx]) { api.warn(L.dragIt); ghosts.L.forEach(function (g) { K.glow(g, 2200) }) } else if (api.step() === 1) { api.warn(L.moveRight); ghosts.R.forEach(function (g) { K.glow(g, 2200) }) } },
          drop: function (pt) { return dropBasket(idx, pt) },
          home: function () { var r = e.getBoundingClientRect(); var q = api.toRef(r.left, r.top); return { x: q.x, y: q.y } }
        })
      })(i)
    }
    function zoneAt (pt) {
      if (pt.y < 230 || pt.y > 650 || pt.x < DX - 20 || pt.x > DX + DW + 20) return null
      return pt.x < DX + DW / 2 ? 'L' : 'R'
    }
    function wobble (el) { if (el && el.animate && !api.reduced()) el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 }) }
    function dropBasket (idx, pt) {
      var z = zoneAt(pt)
      var s = api.step()
      if (!z) { api.warn(L.dragIt); api.sfx('bad'); return false }
      if (s === 0 && z !== 'L') { api.warn(L.leftFirst); api.sfx('bad'); wobble(base); K.glow(ghosts.L[cnt('L')], 2400); return false }
      if (cnt(z, idx) >= 4) { api.warn(L.full); api.sfx('bad'); return false }
      var prev = Z[idx]
      Z[idx] = z
      render()
      api.sfx('bump')
      api.fx('dust', pt.x, Math.min(640, pt.y + 40), 150)
      if (prev !== z) afterMove(z)
      save()
      return true
    }
    function afterMove (z) {
      var nL = cnt('L')
      var nR = cnt('R')
      if (api.step() === 0) {
        if (nL >= 4) { busy = true; api.later(function () { api.sfx('bump'); api.fx('dust', DX + 120, PIV + 20, 200); api.warn(L.tiltLeft); api.later(askCount, 1100) }, 500) } else api.warn(L.more)
      } else if (api.step() === 1) {
        if (nL === 2 && nR === 2) { busy = true; api.later(flat, 700) }
        else if (nR > nL) api.warn(L.tiltRight)
        else api.warn(L.moveRight)
      }
    }
    function askCount () {
      K.ask(api, { custom: { id: 'w4m03-kiri', prompt: 'Berapa keranjang di sisi kiri?', choices: ['3', '4', '5'], answer: '4', count: { key: 'w4-keranjang', n: 4 }, hint1: 'Hitung keranjangnya satu per satu.' }, done: function () { busy = false; api.later(function () { api.advance() }, 350) } })
    }
    function flat () {
      api.sfx('ok')
      api.fx('check-burst', DX + DW / 2, PIV - DH + 10, 240)
      api.fx('spark', DX + DW / 2, PIV - 80, 220)
      api.warn(L.flat)
      api.later(function () {
        K.ask(api, { custom: { id: 'w4m03-jumlah', prompt: '2 keranjang kiri + 2 keranjang kanan. Berapa semuanya?', choices: ['3', '4', '5'], answer: '4', row: ['w4-keranjang', 'w4-keranjang', '+', 'w4-keranjang', 'w4-keranjang'], rowNoBox: true, hint1: 'Hitung: 2 dan 2 jadi 4.' }, done: function () { busy = false; api.later(function () { api.advance() }, 350) } })
      }, 900)
    }
    function predict () {
      K.ask(api, { custom: { id: 'w4m03-duga', prompt: 'Pindah dua ke kanan. Papannya jadi apa?', choices: ['Miring', 'Seimbang'], answer: 'Seimbang', hint1: 'Kiri dan kanan sama banyak.' }, done: function () { api.warn(L.moveRight) } })
    }

    // ---- the forklift (Blippi at the wheel); unit origin = centre of the wheels on the ground line; the art faces left, mirrored to face right
    var unit = api.at(sc, '', 0, 0, 1, 1)
    unit.setAttribute('data-unit', '1')
    unit.style.cssText += ';z-index:6;touch-action:none'
    var shade = api.at(unit, 'shd', -TW / 2 + 10, -18, TW + 30, 32)
    var body = api.at(unit, '', 0, 0, 1, 1)
    body.style.transform = 'scaleX(-1)'
    var fork = api.at(body, '', -TW / 2, -TH, TW, TH, 'button')
    fork.type = 'button'
    fork.setAttribute('data-forklift', '1')
    fork.setAttribute('aria-label', 'Forklift')
    fork.style.cssText += ';background:none;border:0;padding:0;cursor:default;touch-action:none'
    var fart = api.art(fork, 'veh-forklift', 0, 0, TW, TH, '')
    fart.setAttribute('data-veh', 'forklift')
    K.driver(fork, { x: 0.46, y: 0.1, w: 0.26, h: 0.34 })
    if (fork.animate && !api.reduced()) fart.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], { duration: 1100, iterations: Infinity, easing: 'ease-in-out' })
    var load = api.at(body, 'load', -TW / 2 - 12, -TH * 0.16 - 2 * LH - 4, 2 * LB + 6, 2 * LH + 4)
    load.setAttribute('data-load', '1')
    load.style.cssText += ';pointer-events:none;z-index:2;display:none;transition:transform .5s ease'
    var loadEls = []
    for (var j = 0; j < 4; j++) {
      var le = api.at(load, 'lb', (j % 2) * (LB + 4), j < 2 ? LH : 0, LB, LH)
      le.setAttribute('data-lb', String(j))
      le.style.display = 'none'
      api.art(le, 'w4-keranjang', 0, 0, LB, LH, '')
      loadEls.push(le)
    }
    function place (x, y, s, bob) { cur = { x: x, y: y, s: s }; unit.style.transform = 'translate(' + x + 'px,' + (y + (bob || 0)) + 'px) scale(' + s + ')' }
    place(START.x, START.y, 1)
    var goal = null
    var goalB = []

    function attachLoad (quiet) {
      load.style.display = 'block'
      loadEls.forEach(function (le, j) {
        api.later(function () {
          le.style.display = 'block'
          if (!quiet) {
            K.land(api, le)
            api.sfx('collect')
            api.fx('spark', START.x + 100 + (j % 2) * 40, START.y - 110 - (j < 2 ? 0 : 40), 110)
          }
          if (bk[j]) bk[j].style.display = 'none'
        }, quiet ? 0 : j * 230)
      })
      if (!quiet) api.later(function () { load.style.transform = 'translateY(-26px)'; api.sfx('boost'); api.fx('dust', START.x + 120, START.y, 120); api.warn(L.loaded) }, 1100)
      else load.style.transform = 'translateY(-26px)'
    }

    // ---- step 3: hold to drive to the dock
    function pathAt (v) {
      if (v < 0.6) { var t0 = v / 0.6; return { x: START.x + (MID.x - START.x) * t0, y: START.y, s: 1 } }
      var t = (v - 0.6) / 0.4
      var a = 1 - t
      return { x: a * a * MID.x + 2 * a * t * 1200 + t * t * DOCK.x, y: a * a * MID.y + 2 * a * t * 735 + t * t * DOCK.y, s: 1 - 0.22 * t }
    }
    var lastDust = 0
    function drive (now) {
      if (!holding || arrived) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      u = Math.min(1, u + dt / 3600)
      var p = pathAt(u)
      place(p.x, p.y, p.s, Math.sin(now / 55) * 1.2)
      if (now - lastDust > 190) { lastDust = now; api.fx('dust', p.x - 150 * p.s, p.y - 8, 70) }
      if (now - lastT < 0 || Math.floor(now / 520) !== Math.floor((now - dt) / 520)) api.sfx('boost')
      if (u >= 1) { holding = false; arrive(); return }
      raf = requestAnimationFrame(drive)
    }
    function arrive () {
      if (arrived) return
      arrived = true
      holding = false
      cancelAnimationFrame(raf)
      if (goal) goal.style.display = 'none'
      goalB.forEach(function (g) { g.style.display = 'none' })
      place(DOCK.x, DOCK.y, 0.78)
      api.sfx('bump')
      api.fx('dust', DOCK.x - 100, DOCK.y, 160)
      load.style.transform = 'translateY(0)'
      api.later(function () {
        loadEls.forEach(function (le, j) {
          var r = le.getBoundingClientRect()
          var from = api.toRef(r.left, r.top)
          le.style.display = 'none'
          var cl = api.at(sc, 'bk-fly', 0, 0, 84, 64)
          cl.style.cssText += ';z-index:9;pointer-events:none'
          api.art(cl, 'w4-keranjang', 0, 0, 84, 64, '')
          api.later(function () {
            api.tween(from, { x: DOCKB[j].x - 42, y: DOCKB[j].y - 32 }, 520, function (p) { cl.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)' }, function () {
              api.sfx('bump')
              api.fx('dust', DOCKB[j].x, DOCKB[j].y + 20, 90)
              if (j === 3) { api.sfx('ok'); api.fx('confetti', DOCKB[0].x + 40, DOCKB[0].y - 40, 300); api.fx('gold-star', DOCKB[0].x + 40, DOCKB[0].y, 160); api.later(finish, 800) }
            })
          }, j * 170)
        })
      }, 400)
    }
    function finish () {
      K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { api.later(function () { api.advance() }, 300) } })
    }
    var td = null
    unit.addEventListener('pointerdown', function (ev) {
      if (busy) return
      api.touch()
      var s = api.step()
      if (s < 2) { api.warn(s === 0 ? L.dragIt : L.moveRight); return }
      if (arrived) return
      try { unit.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      td = ev.pointerId
      holding = true
      lastT = performance.now()
      api.sfx('honk')
      fork.classList.remove('glow')
      raf = requestAnimationFrame(drive)
    })
    function release (ev) {
      if (td === null || ev.pointerId !== td) return
      td = null
      holding = false
      cancelAnimationFrame(raf)
      if (!arrived && u < 1) api.warn(L.holdMore)
    }
    unit.addEventListener('pointerup', release)
    unit.addEventListener('pointercancel', release)
    unit.addEventListener('lostpointercapture', release)

    function firstPileIdx () { for (var q = 0; q < 4; q++) if (!Z[q]) return q; return -1 }
    function leftIdx () { for (var q = 0; q < 4; q++) if (Z[q] === 'L') return q; return -1 }
    var ctl = {
      onStep: function (n, initial) {
        render()
        fork.style.cursor = n === 2 ? 'grab' : 'default'
        if (n === 0) bk.forEach(function (e, q) { if (!Z[q]) K.glow(e, 3200) })
        if (n === 1) { ghosts.R.forEach(function (g, k) { if (k < 2) K.glow(g, 3200) }); if (!initial) api.later(predict, 500) }
        if (n === 2) {
          if (!goal) {
            goal = K.ghost(api, sc, 'veh-forklift', DOCK.x - TW * 0.78 / 2, DOCK.y - TH * 0.78, TW * 0.78, TH * 0.78, true, true)
            goal.setAttribute('data-goal', '1')
            DOCKB.forEach(function (d) { var g = K.ghost(api, sc, 'w4-keranjang', d.x - 42, d.y - 32, 84, 64, false, true); g.setAttribute('data-dockgap', '1'); goalB.push(g) })
          }
          attachLoad(!!initial)
          K.glow(fork, 3600)
        }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var q = firstPileIdx(); if (q >= 0) { var p = slotPos('L', cnt('L')); hd.move([{ x: PILE[q].x + 70, y: PILE[q].y + 50 }, { x: DX + DW / 2 + SLOTS.L[Math.min(3, cnt('L'))].cx, y: PIV - 120 }], 1200) } }
        else if (n === 1) { var li = leftIdx(); if (li >= 0) { var r = bk[li].getBoundingClientRect(); var a = api.toRef(r.left + r.width / 2, r.top + r.height / 2); hd.move([{ x: a.x, y: a.y }, { x: DX + DW / 2 + SLOTS.R[Math.min(1, cnt('R'))].cx, y: PIV - 120 }], 1300) } }
        else hd.move([{ x: cur.x + 20, y: cur.y - 100 }, { x: cur.x + 20, y: cur.y - 100 }], 2200)
      },
      hint: function (lvl) {
        var s = api.step()
        if (busy) return
        if (s === 0) {
          var q = firstPileIdx()
          if (q < 0) return
          K.glow(bk[q], 3000)
          if (lvl >= 2) K.glow(ghosts.L[cnt('L')], 3000)
          if (lvl >= 4) dropBasket(q, { x: DX + DW / 2 + SLOTS.L[Math.min(3, cnt('L'))].cx, y: PIV - 120 })
        } else if (s === 1) {
          var li = leftIdx()
          if (li >= 0) K.glow(bk[li], 3000)
          ghosts.R.forEach(function (g, k) { if (k < 2) K.glow(g, 3000) })
          if (lvl >= 4) {
            if (cnt('R') > 2 || cnt('L') < 2) { var ri = Z.indexOf('R'); if (ri >= 0 && cnt('R') > 2) dropBasket(ri, { x: DX + 150, y: PIV - 120 }) }
            else if (li >= 0) dropBasket(li, { x: DX + DW / 2 + SLOTS.R[Math.min(1, cnt('R'))].cx, y: PIV - 120 })
          }
        } else {
          K.glow(fork, 3000)
          if (lvl >= 4 && !arrived) { u = 1; place(DOCK.x, DOCK.y, 0.78); arrive() }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { holding = false; cancelAnimationFrame(raf) }
    }
    render()
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W04-M03', mod)
})(window)
