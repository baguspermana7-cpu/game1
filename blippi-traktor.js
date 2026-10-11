/* G32 Blippi -- W04-M02 "Traktor Ikut Rencanaku" (PRD 11.5: Explore & Discover; P11 plan a sequence; "Susun 3-5 kartu arah untuk mengantar air"; V09 = FARM TRACTOR), played INSIDE bg-w04-m02-traktor.
 * The plate is a grass grid with the water tank (top left) and a seedling bed (top right). The tractor (Blippi in the cab) waits at the tank with milk cans of water on its trailer; a bale of straw blocks the straight way.
 * 1 SUSUN (arrange): tap or drag arrow cards (up / down / right / left) into up to five boxes; ghost tractor shows where the water must go.
 * 2 JALAN (run the plan): press JALAN; the tractor follows the cards one by one (the current card lights up). A bump (straw, fence) or a short plan = kind line, the failing card glows, the tractor rolls back, edit and go again. Then a count question about the cards.
 * 3 SIRAM (hold to pour): HOLD the tractor, water arcs from the cans to the bed and the plants grow. Then a nature question and a SoalEngine maths question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 150
  var TH = 130
  var TRW = 118
  var TRH = 66
  var XS = [[423, 660, 831, 1028, 1216], [393, 612, 828, 1045, 1254]]
  var YS = [468, 555]
  var COLS = 5
  var ROWS = 2
  var START = { c: 0, r: 0 }
  var DEST = { c: 3, r: 0 }
  var BALE = { c: 2, r: 0 }
  var DIRS = { kanan: { dc: 1, dr: 0 }, kiri: { dc: -1, dr: 0 }, atas: { dc: 0, dr: -1 }, bawah: { dc: 0, dr: 1 } }
  var ORDER = ['atas', 'bawah', 'kanan', 'kiri']
  var MAXC = 5
  var SLX = 400
  var SLP = 158
  var SLY = 610
  var SLW = 150
  var SLH = 125
  var CW = 150
  var CH = 138
  var BED = { x: 1190, y: 395 }
  var PLANTS = [{ k: 'w4-wortel', x: 1108 }, { k: 'w4-tomat', x: 1160 }, { k: 'w4-wortel', x: 1212 }, { k: 'w4-tomat', x: 1264 }]

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var step0 = api.restore ? api.restore.step : 0
    var prog = (saved.prog || []).slice()
    var busy = false
    var hd = null
    var cell = { c: START.c, r: START.r }
    var face = -1                       // -1 = faces right (art is mirrored), 1 = faces left
    var holding = false
    var level = step0 >= 3 ? 1 : 0
    var raf = 0
    var lastT = 0
    var failIdx = -1
    function save () { api.persist({ prog: prog }) }
    function pos (c, r) { return { x: XS[r][c], y: YS[r] } }
    function sc2 (r) { return 0.92 + 0.08 * r }

    // ---- the straw bale in the way
    var bp = pos(BALE.c, BALE.r)
    var bale = api.at(sc, 'bale', bp.x - 60, bp.y - 50, 120, 90)
    bale.setAttribute('data-bale', '1')
    bale.style.cssText += ';z-index:5;pointer-events:none;transform-origin:50% 100%'
    api.art(bale, 'w4-jerami', 0, 0, 120, 90, '')

    // ---- the tractor with Blippi, pulling the trailer with the water cans; unit origin = tractor centre on the ground line
    var unit = api.at(sc, '', 0, 0, 1, 1)
    unit.setAttribute('data-unit', '1')
    unit.style.cssText += ';z-index:6;touch-action:none'
    var shade = api.at(unit, 'shd', -TW / 2 + 6, -16, TW + TRW - 40, 26)
    var body = api.at(unit, '', 0, 0, 1, 1)
    var trailer = api.at(body, '', TW / 2 - 16, -TRH, TRW, TRH)
    trailer.setAttribute('data-trailer', '1')
    api.art(trailer, 'w4-trailer', 0, 0, TRW, TRH, '')
    var cans = api.at(trailer, 'cans', 20, -30, 70, 56)
    cans.setAttribute('data-cans', '1')
    cans.style.pointerEvents = 'none'
    api.art(cans, 'w4-kaleng', 0, 0, 70, 56, '')
    var tractor = api.at(body, '', -TW / 2, -TH, TW, TH, 'button')
    tractor.type = 'button'
    tractor.setAttribute('data-tractor', '1')
    tractor.setAttribute('aria-label', 'Traktor')
    tractor.style.cssText += ';background:none;border:0;padding:0;cursor:default;touch-action:none'
    var tart = api.art(tractor, 'veh-farm-tractor', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'farm-tractor')
    K.driver(tractor, { x: 0.41, y: 0.16, w: 0.34, h: 0.34 })
    if (tractor.animate && !api.reduced()) tart.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], { duration: 1200, iterations: Infinity, easing: 'ease-in-out' })
    function place (x, y, bob, sq) {
      unit.style.transform = 'translate(' + x + 'px,' + (y + 46 + (bob || 0)) + 'px) scale(' + sc2(Math.max(0, Math.min(1, (y - YS[0]) / (YS[1] - YS[0])))) + ')'
      body.style.transform = 'scaleX(' + face + ') scaleY(' + (sq || 1) + ')'
    }
    function placeCell (c, r) { cell = { c: c, r: r }; var p = pos(c, r); place(p.x, p.y) }
    placeCell(START.c, START.r)

    // ---- ghost tractor at the destination (what will be there) next to the bed
    var dp = pos(DEST.c, DEST.r)
    var goal = K.ghost(api, sc, 'veh-farm-tractor', dp.x - TW / 2, dp.y + 46 - TH, TW, TH, true, true)
    goal.setAttribute('data-goal', '1')

    // ---- the bed: plants that grow with the water
    var plants = PLANTS.map(function (p, i) {
      var e = api.at(sc, 'plant', p.x - 45, BED.y - 78, 90, 84)
      e.setAttribute('data-plant', String(i))
      e.style.cssText += ';z-index:4;pointer-events:none;transform-origin:50% 100%;opacity:0'
      api.art(e, p.k, 0, 0, 90, 84, '')
      return e
    })
    function setLevel (v) {
      level = Math.max(0, Math.min(1, v))
      plants.forEach(function (e, i) {
        var k = Math.max(0, Math.min(1, level * 1.4 - i * 0.12))
        e.style.opacity = k > 0.02 ? '1' : '0'
        e.style.transform = 'scale(' + (0.25 + 0.75 * k) + ')'
      })
    }
    setLevel(level)
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('viewBox', '0 0 1672 941')
    svg.setAttribute('width', '1672'); svg.setAttribute('height', '941')
    svg.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:8'
    sc.appendChild(svg)
    var stream = null

    // ---- the program: five boxes, four arrow cards
    var slotEl = []
    var slotArt = []
    function slotXY (i) { return { x: SLX + i * SLP, y: SLY } }
    for (var i = 0; i < MAXC; i++) {
      var sp = slotXY(i)
      var s = api.at(sc, 'slot', sp.x, sp.y, SLW, SLH, 'button')
      s.type = 'button'
      s.setAttribute('data-slot', String(i))
      s.setAttribute('aria-label', 'Kotak ' + (i + 1))
      s.style.cssText += ';z-index:7;padding:0;border:4px solid rgba(255,255,255,.9);border-radius:26px;background:rgba(255,255,255,.42);box-shadow:inset 0 3px 10px rgba(60,40,10,.25);cursor:pointer;touch-action:none'
      var nb = api.at(s, 'num', 8, 4, 36, 36)
      nb.style.cssText += ';border-radius:50%;background:#13318A;color:#fff;font:900 22px/36px Fredoka,Nunito,sans-serif;text-align:center;z-index:2;pointer-events:none'
      nb.textContent = String(i + 1)
      slotEl.push(s)
      slotArt.push(null)
      ;(function (idx) { s.addEventListener('click', function () { api.touch(); onSlotTap(idx) }) })(i)
    }
    function drawSlots () {
      slotEl.forEach(function (s, i) {
        if (slotArt[i]) { s.removeChild(slotArt[i]); slotArt[i] = null }
        if (prog[i]) {
          var a = api.at(s, 'kartu', 8, 6, SLW - 16, SLH - 12)
          a.style.pointerEvents = 'none'
          api.art(a, 'w4-kartu-' + prog[i], 0, 0, SLW - 16, SLH - 12, '')
          a.setAttribute('data-card', prog[i])
          slotArt[i] = a
        }
      })
    }
    function onSlotTap (i) {
      if (busy || api.step() > 1) return
      if (!prog[i]) { api.warn(L.tapCard); return }
      prog.splice(i, 1)
      api.sfx('tap')
      drawSlots(); save()
    }
    function addCard (dir, idx) {
      if (prog.length >= MAXC && idx == null) { api.warn(L.full); return false }
      if (idx != null && idx < prog.length) prog[idx] = dir
      else if (prog.length < MAXC) prog.push(dir)
      else return false
      api.sfx('tap')
      drawSlots()
      var k = Math.min(prog.length - 1, idx == null ? prog.length - 1 : idx)
      if (slotArt[k] && slotArt[k].animate && !api.reduced()) slotArt[k].animate([{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1.08)', opacity: 1, offset: 0.6 }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(.23,1,.32,1)' })
      failIdx = -1
      save()
      return true
    }
    // palette (left column): one card per direction; tap = next box, drag = a box of your choice
    var pal = {}
    ORDER.forEach(function (dir, i) {
      var cx = 20
      var cy = 130 + i * 146
      var el = api.at(sc, 'pcard', cx, cy, CW, CH, 'button')
      el.type = 'button'
      el.setAttribute('data-pcard', dir)
      el.setAttribute('aria-label', 'Panah ' + dir)
      el.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none'
      api.art(el, 'w4-kartu-' + dir, 0, 0, CW, CH, '')
      if (el.animate && !api.reduced()) el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-4px)' }, { transform: 'translateY(0)' }], { duration: 1800 + i * 160, iterations: Infinity, easing: 'ease-in-out' })
      pal[dir] = el
      K.dragCard(api, el, {
        enabled: function () { return api.step() <= 1 && !busy },
        make: function (parent) { var f = api.at(parent, '', 0, 0, 140, 130); api.art(f, 'w4-kartu-' + dir, 0, 0, 140, 130, ''); f.style.filter = 'drop-shadow(0 8px 8px rgba(0,0,0,.3))'; return f },
        onLift: function () { el.classList.remove('glow') },
        tap: function () { addCard(dir) },
        drop: function (pt) {
          var best = -1
          var bd = 1e9
          for (var j = 0; j < MAXC; j++) { var q = slotXY(j); var dd = Math.hypot(pt.x - (q.x + SLW / 2), pt.y - (q.y + SLH / 2)); if (dd < 110 && dd < bd) { best = j; bd = dd } }
          if (best < 0) { api.warn(L.tapCard); return false }
          return addCard(dir, Math.min(best, prog.length))
        },
        home: function () { return { x: cx + 5, y: cy + 4 } }
      })
    })
    // the JALAN button
    var go = api.at(sc, 'go', 1215, SLY, SLW, SLH, 'button')
    go.type = 'button'
    go.setAttribute('data-act', 'jalan-go')
    go.setAttribute('aria-label', 'Jalan')
    go.style.cssText += ';z-index:7;border:5px solid #fff;border-radius:30px;background:linear-gradient(#5BD65B,#2FAE3A);box-shadow:0 6px 0 #1E7F2A,0 10px 14px rgba(0,0,0,.25);cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font:900 30px/1 Fredoka,Nunito,sans-serif;gap:2px'
    go.innerHTML = '<svg viewBox="0 0 48 48" width="62" height="62"><path d="M14 8l26 16-26 16z" fill="#fff"/></svg><span>JALAN</span>'
    go.addEventListener('click', function () { api.touch(); onGo() })
    var clr = api.at(sc, 'clr', 1385, SLY + 8, 110, 110, 'button')
    clr.type = 'button'
    clr.setAttribute('data-act', 'ulang')
    clr.setAttribute('aria-label', 'Hapus semua kartu')
    clr.style.cssText += ';z-index:7;border:4px solid #fff;border-radius:50%;background:#2F7BEF;cursor:pointer;padding:0'
    clr.innerHTML = '<svg viewBox="0 0 48 48" width="62" height="62"><path d="M24 10a14 14 0 1 0 13 9" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M38 6v14H24z" fill="#fff"/></svg>'
    clr.addEventListener('click', function () { if (busy || api.step() > 1) return; api.touch(); prog = []; failIdx = -1; api.sfx('tap'); drawSlots(); save() })
    function showControls (on) { var d = on ? '' : 'none'; go.style.display = d; clr.style.display = d; slotEl.forEach(function (s) { s.style.display = d }); ORDER.forEach(function (k) { pal[k].style.display = d }) }

    // ---- running the plan
    function onGo () {
      if (busy || api.step() > 1) return
      if (!prog.length) { api.warn(L.none); ORDER.forEach(function (k) { K.glow(pal[k], 2400) }); return }
      if (prog.length < 3) { api.warn(L.few); return }
      if (api.step() === 0) api.advance()
      run()
    }
    function litSlot (i, on) { var s = slotEl[i]; if (!s) return; s.style.transform = on ? 'scale(1.08)' : ''; s.style.background = on ? 'rgba(255,230,120,.85)' : 'rgba(255,255,255,.42)' }
    function resetBack (cb) {
      api.tween({ x: pos(cell.c, cell.r).x, y: pos(cell.c, cell.r).y }, pos(START.c, START.r), 650, function (p) { place(p.x, p.y) }, function () { cell = { c: START.c, r: START.r }; face = -1; place(pos(START.c, START.r).x, pos(START.c, START.r).y); if (cb) cb() })
    }
    function run () {
      busy = true
      failIdx = -1
      slotEl.forEach(function (s, i) { litSlot(i, false) })
      placeCell(START.c, START.r)
      face = -1
      place(pos(START.c, START.r).x, pos(START.c, START.r).y)
      var i = 0
      function nextCard () {
        if (i >= prog.length) return finishRun()
        var d = DIRS[prog[i]]
        var nc = cell.c + d.dc
        var nr = cell.r + d.dr
        litSlot(i, true)
        if (d.dc) face = d.dc > 0 ? -1 : 1
        var from = pos(cell.c, cell.r)
        if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) return bump(i, from, { x: from.x + d.dc * 40, y: from.y + d.dr * 30 }, L.fence)
        if (nc === BALE.c && nr === BALE.r) { var bt = pos(nc, nr); return bump(i, from, { x: from.x + (bt.x - from.x) * 0.55, y: from.y + (bt.y - from.y) * 0.55 }, L.bale, true) }
        var to = pos(nc, nr)
        api.sfx('honk')
        api.tween(from, to, 650, function (p, k) { place(p.x, p.y, Math.sin(k * 20) * 1.2) }, function () {
          cell = { c: nc, r: nr }
          place(to.x, to.y)
          litSlot(i, false)
          i++
          api.later(nextCard, 120)
        })
      }
      function bump (idx, from, nudge, line, hitBale) {
        failIdx = idx
        api.tween(from, nudge, 360, function (p) { place(p.x, p.y) }, function () {
          api.sfx('bump')
          api.fx('dust', nudge.x, nudge.y + 40, 120)
          if (hitBale && bale.animate && !api.reduced()) bale.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(5deg)' }, { transform: 'rotate(0)' }], { duration: 420 })
          api.tween(nudge, from, 300, function (p) { place(p.x, p.y) }, function () {
            api.warn(line)
            litSlot(idx, false)
            K.glow(slotEl[idx], 3200)
            if (slotEl[idx].animate && !api.reduced()) slotEl[idx].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(0)' }], { duration: 320 })
            api.later(function () { resetBack(function () { busy = false }) }, 500)
          })
        })
      }
      nextCard()
    }
    function finishRun () {
      slotEl.forEach(function (s, j) { litSlot(j, false) })
      if (cell.c >= DEST.c && cell.r === DEST.r) {
        api.sfx('ok')
        api.fx('check-burst', pos(cell.c, cell.r).x, pos(cell.c, cell.r).y - 60, 200)
        goal.style.display = 'none'
        api.warn(L.arrived)
        var nR = prog.filter(function (d) { return d === 'kanan' }).length
        var ch = [nR - 1, nR, nR + 1].filter(function (v) { return v >= 0 }).slice(0, 3)
        if (ch.length < 3) ch.push(nR + 2)
        api.later(function () {
          K.ask(api, { custom: { id: 'w4m02-kanan', prompt: 'Berapa kartu panah ke kanan?', choices: ch.map(String), answer: String(nR), row: prog.map(function (d) { return 'w4-kartu-' + d }), hint1: 'Cari panah yang menunjuk ke kanan, hitung satu per satu.' }, done: function () { busy = false; api.later(function () { api.advance() }, 350) } })
        }, 800)
      } else {
        api.warn(L.short)
        K.glow(slotEl[Math.min(prog.length, MAXC - 1)], 3000)
        api.later(function () { resetBack(function () { busy = false }) }, 700)
      }
    }

    // ---- step 3: hold the tractor, the cans pour onto the bed
    function streamPath () {
      var p = pos(cell.c, cell.r)
      var cxs = p.x + face * 118
      return 'M' + cxs + ',' + (p.y + 46 - TRH - 30) + ' Q' + ((cxs + BED.x) / 2) + ',' + (p.y - 150) + ' ' + BED.x + ',' + (BED.y - 20)
    }
    function pour (now) {
      if (!holding || level >= 1) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      setLevel(level + dt / 2800)
      if (stream) stream.set(1)
      if (Math.floor(now / 260) !== Math.floor((now - dt) / 260)) { api.fx('droplets', BED.x - 30 + Math.random() * 120, BED.y, 110); api.sfx('water') }
      if (level >= 1) { holding = false; if (stream) stream.set(0); done3(); return }
      raf = requestAnimationFrame(pour)
    }
    var done3Called = false
    function done3 () {
      if (done3Called) return
      done3Called = true
      busy = true
      api.sfx('ok')
      api.fx('confetti', BED.x, BED.y - 20, 320)
      plants.forEach(function (e, i) { if (e.animate && !api.reduced()) e.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.16,1.22)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 600, delay: i * 90 }) })
      api.later(function () {
        K.ask(api, { custom: { id: 'w4m02-air', prompt: 'Tanaman butuh apa supaya tumbuh?', choices: ['Air', 'Batu', 'Roda'], answer: 'Air', hint1: 'Tanamannya baru saja minum.' }, done: function () {
          api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } }) }, 300)
        } })
      }, 1300)
    }
    var td = null
    unit.addEventListener('pointerdown', function (ev) {
      if (busy) return
      api.touch()
      var s = api.step()
      if (s < 2) { if (s === 0) { api.warn(L.tapCard); ORDER.forEach(function (k) { K.glow(pal[k], 2000) }) } return }
      if (level >= 1) return
      try { unit.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      td = ev.pointerId
      holding = true
      lastT = performance.now()
      if (!stream) { stream = K.waterPath(svg, streamPath(), 16) }
      stream.set(1)
      tractor.classList.remove('glow')
      raf = requestAnimationFrame(pour)
    })
    function release (ev) {
      if (td === null || ev.pointerId !== td) return
      td = null
      holding = false
      cancelAnimationFrame(raf)
      if (stream) stream.set(0)
      if (level < 1) api.warn(L.holdMore)
    }
    unit.addEventListener('pointerup', release)
    unit.addEventListener('pointercancel', release)
    unit.addEventListener('lostpointercapture', release)

    // the intro: the tank fills the cans
    function fillCans () { api.fx('droplets', pos(START.c, START.r).x - 80, pos(START.c, START.r).y - 70, 130); if (cans.animate && !api.reduced()) cans.animate([{ transform: 'translateY(-14px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 500, easing: 'cubic-bezier(.23,1,.32,1)' }) }

    function solutionFor () {
      var sol = [['bawah', 'kanan', 'kanan', 'kanan', 'atas'], ['kanan', 'bawah', 'kanan', 'kanan', 'atas']]
      var best = sol[0]
      sol.forEach(function (s) { var n = 0; while (n < prog.length && prog[n] === s[n]) n++; var m = 0; while (m < prog.length && prog[m] === best[m]) m++; if (n > m) best = s })
      return best
    }
    var ctl = {
      onStep: function (n, initial) {
        showControls(n <= 1)
        if (n === 0) { if (initial) fillCans(); ORDER.forEach(function (k) { K.glow(pal[k], 3200) }); K.glow(tractor, 2400) }
        if (n === 2) {
          goal.style.display = 'none'
          prog = prog.length ? prog : solutionFor().slice()
          if (initial) { var dpp = pos(DEST.c, DEST.r); face = -1; cell = { c: DEST.c, r: DEST.r }; place(dpp.x, dpp.y) }
          K.glow(tractor, 3400)
        }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var nx = solutionFor()[prog.length]; if (nx) { var sp2 = slotXY(Math.min(prog.length, MAXC - 1)); hd.move([{ x: 20 + 70, y: 130 + ORDER.indexOf(nx) * 146 + 60 }, { x: sp2.x + 60, y: sp2.y + 50 }], 1200) } }
        else if (n === 1) hd.move([{ x: 1215 + 60, y: SLY + 40 }, { x: 1215 + 60, y: SLY + 40 }], 1800)
        else { var p3 = pos(cell.c, cell.r); hd.move([{ x: p3.x - 20, y: p3.y - 40 }, { x: p3.x - 20, y: p3.y - 40 }], 2200) }
      },
      hint: function (lvl) {
        var s = api.step()
        if (s <= 1) {
          if (busy) return
          var sol = solutionFor()
          var nx = sol[prog.length] || sol[0]
          if (lvl === 1) { K.glow(bale, 3000); K.glow(goal, 3000) }
          if (lvl >= 2 && prog.length < sol.length) K.glow(pal[nx], 3000)
          if (lvl >= 4) {
            var okSoFar = prog.length <= sol.length && prog.every(function (d, j) { return d === sol[j] })
            if (!okSoFar) { prog = []; drawSlots() }
            if (prog.length < sol.length) addCard(sol[prog.length])
            else if (s === 1 || prog.length >= 3) onGo()
          }
        } else {
          K.glow(tractor, 3000)
          if (lvl >= 4 && !holding && level < 1) { setLevel(0.99); level = 1; done3() }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { holding = false; cancelAnimationFrame(raf) }
    }
    drawSlots()
    if (step0 === 1) { api.later(function () { /* restored mid-run: the plan is on the boxes, press JALAN */ }, 0) }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W04-M02', mod)
})(window)
