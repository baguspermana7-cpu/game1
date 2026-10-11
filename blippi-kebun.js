/* G32 Blippi -- W04-M01 "Baris Kebun Pertamaku" (PRD 11.5: Build & Use; P04/P07; "Siapkan petak dan pilih susunan 4-6 bibit"; V09 = FARM TRACTOR), played INSIDE bg-w04-m01-baris-kebun.
 * The plate has a wooden raised bed with six soil cells; the tractor (Blippi in the cab) with its trailer waits at the right.
 * 1 GEMBUR (hold to drive): HOLD the tractor and it rolls left along the bed; the hard soil of each cell turns into dark furrows as it passes (ghost tractor at the end). Then "Berapa petak?" (count).
 * 2 MUAT   (count-and-load): drag the seedlings (3 carrot + 3 tomato) from their piles into the trailer (six ghost slots show how many). Then a nature question (which one is red).
 * 3 TANAM  (pattern): the trailer tips its load into two baskets; drag each seedling onto its ghost in the bed (carrot, tomato, carrot, tomato ...). After four: "what comes next?", then the last two. Then a SoalEngine maths question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 240
  var TH = 207
  var TRW = 250
  var TRH = 141
  var BASE = 732
  var START = 1250
  var END = 545
  var CX = [483, 623, 763, 901, 1040, 1182]
  var CT = 453
  var CH = 80
  var CW = 134
  var PAT = ['wortel', 'tomat', 'wortel', 'tomat', 'wortel', 'tomat']
  var KEY = { wortel: 'w4-wortel', tomat: 'w4-tomat' }
  var NAME = { wortel: 'wortel', tomat: 'tomat' }
  var PW = 170
  var PH = 158
  var PILE = { wortel: { x: 960, y: 578 }, tomat: { x: 1160, y: 578 } }
  var SW = 128
  var SH = 119
  var TRL = END + TW / 2 - 20            // trailer left edge on the stage while parked
  // trailer slots (stage px relative to the trailer): two rows of three
  var SLOT = [{ x: 50, y: -2 }, { x: 100, y: -2 }, { x: 150, y: -2 }, { x: 62, y: 22 }, { x: 112, y: 22 }, { x: 162, y: 22 }]
  var SLW = 46
  var SLH = 42

  var mod = { mount: function (api) {
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var step0 = api.restore ? api.restore.step : 0
    var st = {
      load: saved.load || { wortel: 0, tomat: 0 },
      planted: saved.planted || {},
      patDone: !!saved.patDone
    }
    if (step0 >= 1) { st.tilled = true }
    if (step0 >= 2) st.load = { wortel: 3, tomat: 3 }
    var tilledN = step0 >= 1 ? CX.length : 0
    var busy = false
    var hd = null
    var arrived = step0 >= 1
    var hold = false
    var raf = 0
    var lastT = 0
    var u = step0 >= 1 ? 1 : 0
    var cur = step0 >= 1 ? END : START
    function save () { api.persist({ load: st.load, planted: st.planted, patDone: st.patDone }) }
    function loadedN () { return st.load.wortel + st.load.tomat }
    function plantedN () { return Object.keys(st.planted).length }
    function plantedOf (k) { var n = 0; Object.keys(st.planted).forEach(function (i) { if (st.planted[i] === k) n++ }); return n }

    // ---- the six cells: hard dry crust until the tractor has passed, dark furrows after
    var crust = []
    var furrow = []
    CX.forEach(function (cx, i) {
      var f = api.at(sc, 'furrow', cx - CW / 2, CT, CW, CH)
      f.setAttribute('data-furrow', String(i))
      f.style.cssText += ';border-radius:16px;pointer-events:none;z-index:2;opacity:0;background:repeating-linear-gradient(90deg,rgba(60,28,10,.62) 0 9px,rgba(150,92,52,.22) 9px 22px);box-shadow:inset 0 0 14px rgba(40,18,6,.55)'
      var c = api.at(sc, 'crust', cx - CW / 2, CT, CW, CH)
      c.setAttribute('data-crust', String(i))
      c.style.cssText += ';border-radius:16px;pointer-events:none;z-index:2;background:radial-gradient(circle at 22% 30%,rgba(255,236,200,.5) 0 5px,transparent 6px),radial-gradient(circle at 66% 64%,rgba(255,236,200,.45) 0 6px,transparent 7px),radial-gradient(circle at 80% 28%,rgba(255,236,200,.4) 0 4px,transparent 5px),rgba(200,160,112,.58);transition:opacity .45s'
      crust.push(c)
      furrow.push(f)
      if (step0 >= 1) { c.style.opacity = '0'; f.style.opacity = '.85' }
    })
    function till (i) {
      crust[i].style.opacity = '0'
      furrow[i].style.opacity = '.85'
      api.fx('dust', CX[i], CT + CH * 0.7, 120)
      api.sfx('tap')
      tilledN++
    }

    // ---- the tractor (Blippi at the wheel) pulling the trailer; unit origin = the tractor's centre on the ground line
    var unit = api.at(sc, '', 0, 0, 1, 1)
    unit.setAttribute('data-unit', '1')
    unit.style.cssText += ';z-index:6;touch-action:none'
    var shade = api.at(unit, 'shd', -TW / 2 + 10, -22, TW + TRW - 60, 36)
    shade.style.zIndex = '0'
    var trailer = api.at(unit, '', TW / 2 - 20, -TRH, TRW, TRH)
    trailer.setAttribute('data-trailer', '1')
    trailer.style.transformOrigin = '100% 100%'
    api.art(trailer, 'w4-trailer', 0, 0, TRW, TRH, '')
    var tractor = api.at(unit, '', -TW / 2, -TH, TW, TH, 'button')
    tractor.type = 'button'
    tractor.setAttribute('data-tractor', '1')
    tractor.setAttribute('aria-label', 'Traktor')
    tractor.style.cssText += ';background:none;border:0;padding:0;cursor:default;touch-action:none'
    var tart = api.art(tractor, 'veh-farm-tractor', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'farm-tractor')
    K.driver(tractor, { x: 0.41, y: 0.16, w: 0.34, h: 0.34 })
    if (tractor.animate && !api.reduced()) tart.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-2px)' }, { transform: 'translateY(0)' }], { duration: 1200, iterations: Infinity, easing: 'ease-in-out' })
    function place (x, bob) { cur = x; unit.style.transform = 'translate(' + x + 'px,' + (BASE + (bob || 0)) + 'px)' }
    place(cur)
    var goal = null

    // ---- the load row on the trailer: six soil-cell slots (how many seedlings fit); seedlings fill them
    var slotGhost = []
    var seedEls = []
    SLOT.forEach(function (s, i) {
      var g = K.ghost(api, trailer, 'w4-petak', s.x, s.y + 40, SLW, SLH * 0.7)
      g.setAttribute('data-slot', String(i))
      g.style.zIndex = '2'
      g.style.visibility = 'hidden'
      slotGhost.push(g)
    })
    function addSeed (kind, i, quiet) {
      var s = SLOT[i]
      var e = api.at(trailer, 'seed', s.x - 4, s.y + 6, SLW + 8, SLH + 4)
      e.setAttribute('data-seed', kind)
      e.style.cssText += ';z-index:3;pointer-events:none'
      api.art(e, KEY[kind], 0, 0, SLW + 8, SLH + 4, '')
      seedEls.push(e)
      if (slotGhost[i]) slotGhost[i].style.display = 'none'
      if (!quiet) K.land(api, e)
    }
    if (step0 === 1) { var si = 0; ;['wortel', 'tomat'].forEach(function (k) { for (var q = 0; q < st.load[k]; q++) addSeed(k, si++, true) }) }

    // ---- piles (step 2: seedlings to load) that become baskets (step 3: seedlings to plant)
    var piles = {}
    var badges = {}
    function remaining (k) { return api.step() === 1 ? 3 - st.load[k] : (api.step() === 2 ? st.load[k] - plantedOf(k) : 0) }
    function setPile (k) {
      var n = remaining(k)
      badges[k].textContent = String(n)
      piles[k].style.display = n > 0 && api.step() >= 1 ? 'block' : 'none'
    }
    ;['wortel', 'tomat'].forEach(function (k, ki) {
      var p = PILE[k]
      var el = api.at(sc, 'pile', p.x, p.y, PW, PH, 'button')
      el.type = 'button'
      el.setAttribute('data-pile', k)
      el.setAttribute('aria-label', 'Bibit ' + NAME[k])
      el.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none;display:none'
      var ar = api.art(el, KEY[k], 0, 0, PW, PH, '')
      if (ar.animate && !api.reduced()) ar.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1700 + ki * 220, iterations: Infinity, easing: 'ease-in-out' })
      var bd = api.at(el, 'cnt', PW - 50, -14, 58, 58)
      bd.style.cssText += ';border-radius:50%;background:#fff;border:5px solid #13318A;color:#13318A;font:900 34px/48px Fredoka,Nunito,sans-serif;text-align:center;z-index:2'
      piles[k] = el
      badges[k] = bd
      K.dragCard(api, el, {
        enabled: function () { return (api.step() === 1 || api.step() === 2) && !busy },
        make: function (parent) { var f = api.at(parent, '', 0, 0, 150, 139); api.art(f, KEY[k], 0, 0, 150, 139, ''); f.style.filter = 'drop-shadow(0 8px 8px rgba(0,0,0,.3))'; return f },
        onLift: function () { el.classList.remove('glow'); api.sfx('tap') },
        tap: function () { api.warn(api.step() === 1 ? L.dragSeed : L.dragPlant); K.glow(api.step() === 1 ? trailer : el, 2600); if (api.step() === 2) ghostsFor(k).forEach(function (g) { K.glow(g, 2600) }) },
        drop: function (pt) { return api.step() === 1 ? tryLoad(k, pt) : tryPlant(k, pt) },
        home: function () { return { x: p.x + 10, y: p.y + 10 } }
      })
    })

    // ---- step 2: load
    function tryLoad (k, pt) {
      var near = pt.x > TRL - 40 && pt.x < TRL + TRW + 40 && pt.y > BASE - TRH - 90 && pt.y < BASE + 20
      if (!near) { api.warn(L.toTrailer); K.glow(trailer, 2600); return false }
      if (st.load[k] >= 3) return false
      var i = loadedN()
      st.load[k]++
      addSeed(k, i)
      api.sfx('bump')
      api.fx('dust', TRL + SLOT[i].x + 24, BASE - TRH + 40, 100)
      setPile(k)
      save()
      if (loadedN() >= 6) { busy = true; api.later(finishLoad, 500) } else api.warn(L.loadMore)
      return true
    }
    function finishLoad () {
      api.warn(L.loaded)
      api.later(function () {
        K.ask(api, { custom: { id: 'w4m01-merah', prompt: 'Bibit mana yang buahnya merah?', choices: ['Wortel', 'Tomat'], choicePics: ['assets/blippi/w4-wortel.webp', 'assets/blippi/w4-tomat.webp'], answer: 'Tomat', hint1: 'Wortel itu oranye. Tomat itu merah.' }, done: function () { busy = false; api.later(function () { api.advance() }, 300) } })
      }, 600)
    }

    // ---- step 3: ghost targets in the bed + planting
    var ghosts = []
    var shown = 0
    function ghostAt (i) {
      var g = K.ghost(api, sc, KEY[PAT[i]], CX[i] - SW / 2, CT + CH - SH + 6, SW, SH, false, true)
      g.setAttribute('data-gap', String(i))
      g.setAttribute('data-kind', PAT[i])
      ghosts[i] = g
      return g
    }
    function showGhosts (n) { for (var i = shown; i < n; i++) if (!st.planted[i]) ghostAt(i); shown = Math.max(shown, n) }
    function ghostsFor (k) { return ghosts.filter(function (g, i) { return g && g.style.display !== 'none' && PAT[i] === k && !st.planted[i] }) }
    function openCell (pt) {
      var best = -1
      var bd = 1e9
      ghosts.forEach(function (g, i) {
        if (!g || st.planted[i]) return
        var dx = pt.x - CX[i]
        var dy = pt.y - (CT + CH * 0.3)
        var dd = Math.sqrt(dx * dx + dy * dy)
        if (dd < 120 && dd < bd) { best = i; bd = dd }
      })
      return best
    }
    var plants = {}
    function putPlant (i, k, quiet) {
      var e = api.at(sc, 'plant', CX[i] - SW / 2, CT + CH - SH + 6, SW, SH)
      e.setAttribute('data-planted', k)
      e.setAttribute('data-cell', String(i))
      e.style.cssText += ';z-index:4;pointer-events:none;transform-origin:50% 100%'
      api.art(e, KEY[k], 0, 0, SW, SH, '')
      plants[i] = e
      if (ghosts[i]) ghosts[i].style.display = 'none'
      if (!quiet && e.animate && !api.reduced()) e.animate([{ transform: 'scale(.55,.4)', opacity: 0 }, { transform: 'scale(1.1,.88)', opacity: 1, offset: 0.55 }, { transform: 'scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.23,1,.32,1)' })
      return e
    }
    function tryPlant (k, pt) {
      var i = openCell(pt)
      if (i < 0) { api.warn(L.toGhost); ghosts.forEach(function (g, j) { if (g && !st.planted[j]) K.glow(g, 2600) }); return false }
      if (PAT[i] !== k) {
        api.warn(L.wrongKind.replace('%n', NAME[PAT[i]]))
        K.glow(ghosts[i], 2800)
        K.glow(piles[PAT[i]], 2800)
        return false
      }
      doPlant(i, k)
      return true
    }
    function doPlant (i, k) {
      st.planted[i] = k
      putPlant(i, k)
      api.sfx('bump')
      api.fx('dust', CX[i], CT + CH, 130)
      setPile(k)
      save()
      var n = plantedN()
      if (n === 4 && !st.patDone) {
        busy = true
        api.later(function () {
          K.ask(api, { custom: { id: 'w4m01-pola', prompt: 'Wortel, tomat, wortel, tomat. Apa lanjutannya?', choices: ['Wortel', 'Tomat'], choicePics: ['assets/blippi/w4-wortel.webp', 'assets/blippi/w4-tomat.webp'], answer: 'Wortel', row: ['w4-wortel', 'w4-tomat', 'w4-wortel', 'w4-tomat'], hint1: 'Lihat polanya: oranye, merah, oranye, merah.' }, done: function () {
            st.patDone = true; busy = false; save(); showGhosts(6); api.warn(L.next2)
          } })
        }, 550)
      } else if (n >= 6) {
        busy = true
        api.later(grow, 450)
      } else api.warn(L.plantMore)
    }
    function grow () {
      api.sfx('ok')
      api.fx('confetti', 836, 420, 340)
      Object.keys(plants).forEach(function (i) {
        var e = plants[i]
        if (e.animate && !api.reduced()) e.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.14,1.2)', offset: 0.45 }, { transform: 'scale(1)' }], { duration: 650, delay: i * 90, easing: 'ease-out' })
        api.later(function () { api.fx('gold-star', CX[i], CT + 10, 110) }, i * 90)
      })
      save()
      api.later(function () {
        K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } })
      }, 1500)
    }
    function unload () {
      // the trailer tips and its seedlings land in the two baskets
      if (trailer.animate && !api.reduced()) trailer.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-9deg)', offset: 0.4 }, { transform: 'rotate(0)' }], { duration: 900, easing: 'ease-in-out' })
      seedEls.forEach(function (e) { e.style.display = 'none' })
      api.sfx('bump')
      ;['wortel', 'tomat'].forEach(function (k) { setPile(k); if (piles[k].style.display !== 'none') K.land(api, piles[k]) })
    }

    // ---- step 1: hold the tractor, it drives and tills
    function drive (now) {
      if (!hold || arrived) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      u = Math.min(1, u + dt / 3400)
      var x = START + (END - START) * u
      place(x, Math.sin(now / 60) * 1.3)
      if (now - (drive.dt || 0) > 190) { drive.dt = now; api.fx('dust', x + TW / 2 + 20, BASE - 10, 70) }
      if (Math.floor(now / 520) !== Math.floor((now - dt) / 520)) api.sfx('boost')
      for (var i = 0; i < CX.length; i++) if (!furrow[i].getAttribute('data-done') && x - 75 <= CX[i] + 20) { furrow[i].setAttribute('data-done', '1'); till(i) }
      if (u >= 1) { hold = false; arrive(); return }
      raf = requestAnimationFrame(drive)
    }
    function arrive () {
      if (arrived) return
      arrived = true
      hold = false
      cancelAnimationFrame(raf)
      for (var i = 0; i < CX.length; i++) if (!furrow[i].getAttribute('data-done')) { furrow[i].setAttribute('data-done', '1'); till(i) }
      place(END)
      if (goal) goal.style.display = 'none'
      api.sfx('bump')
      api.fx('dust', END + 60, BASE - 10, 160)
      api.later(function () {
        K.ask(api, { custom: { id: 'w4m01-petak', prompt: 'Berapa petak yang sudah gembur?', choices: ['5', '6', '7'], answer: '6', count: { key: 'w4-petak', n: 6 }, hint1: 'Hitung petaknya satu per satu.' }, done: function () { api.warn(L.tilled); api.later(function () { api.advance() }, 500) } })
      }, 700)
    }
    var td = null
    unit.addEventListener('pointerdown', function (ev) {
      if (busy) return
      var s = api.step()
      api.touch()
      if (s !== 0) {
        api.warn(s === 1 ? L.dragSeed : L.dragPlant)
        ;['wortel', 'tomat'].forEach(function (k) { if (piles[k].style.display !== 'none') K.glow(piles[k], 2400) })
        return
      }
      if (arrived) return
      try { unit.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      td = ev.pointerId
      hold = true
      lastT = performance.now()
      api.sfx('honk')
      tractor.classList.remove('glow')
      raf = requestAnimationFrame(drive)
    })
    function release (ev) {
      if (td === null || ev.pointerId !== td) return
      td = null
      hold = false
      cancelAnimationFrame(raf)
      if (!arrived && u < 1) api.warn(L.tillMore)
    }
    unit.addEventListener('pointerup', release)
    unit.addEventListener('pointercancel', release)
    unit.addEventListener('lostpointercapture', release)

    function nextPlantCell () { for (var i = 0; i < ghosts.length; i++) if (ghosts[i] && !st.planted[i]) return i; return -1 }
    function firstPile () { return ['wortel', 'tomat'].filter(function (k) { return remaining(k) > 0 })[0] }

    var ctl = {
      onStep: function (n, initial) {
        ;['wortel', 'tomat'].forEach(setPile)
        tractor.style.cursor = n === 0 ? 'grab' : 'default'
        slotGhost.forEach(function (g, i) { g.style.visibility = n === 1 ? 'visible' : 'hidden' })
        if (n === 0) {
          if (!goal) { goal = K.ghost(api, sc, 'veh-farm-tractor', END - TW / 2, BASE - TH, TW, TH, false, true); goal.setAttribute('data-goal', '1') }
          K.glow(tractor, 3200)
        }
        if (n === 1) {
          if (goal) goal.style.display = 'none'
          ;['wortel', 'tomat'].forEach(function (k) { if (piles[k].style.display !== 'none') { K.glow(piles[k], 3200); if (!initial) K.land(api, piles[k]) } })
          K.glow(trailer, 3200)
        }
        if (n === 2) {
          if (goal) goal.style.display = 'none'
          if (initial) { seedEls.forEach(function (e) { e.style.display = 'none' }); slotGhost.forEach(function (g) { g.style.display = 'none' }) } else unload()
          Object.keys(st.planted).forEach(function (i) { if (!plants[i]) putPlant(+i, st.planted[i], true) })
          showGhosts(st.patDone ? 6 : 4)
          ;['wortel', 'tomat'].forEach(function (k) { if (piles[k].style.display !== 'none') K.glow(piles[k], 3200) })
        }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) hd.move([{ x: cur - 20, y: BASE - 120 }, { x: cur - 20, y: BASE - 120 }], 2200)
        else if (n === 1) { var k = firstPile(); if (k) hd.move([{ x: PILE[k].x + 70, y: PILE[k].y + 70 }, { x: TRL + 110, y: BASE - TRH + 20 }], 1100) }
        else { var c = nextPlantCell(); if (c >= 0) { var kk = PAT[c]; hd.move([{ x: PILE[kk].x + 70, y: PILE[kk].y + 70 }, { x: CX[c] - 20, y: CT + 30 }], 1100) } }
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          K.glow(tractor, 3000)
          if (lvl >= 4 && !arrived) { u = 1; arrive() }
        } else if (s === 1) {
          var k = firstPile()
          K.glow(trailer, 3000)
          if (k) K.glow(piles[k], 3000)
          if (lvl >= 4 && k && !busy) tryLoad(k, { x: TRL + 100, y: BASE - TRH + 20 })
        } else {
          var c = nextPlantCell()
          if (c >= 0) {
            K.glow(ghosts[c], 3000)
            K.glow(piles[PAT[c]], 3000)
            if (lvl >= 4 && !busy) tryPlant(PAT[c], { x: CX[c], y: CT + 30 })
          }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { hold = false; cancelAnimationFrame(raf) }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W04-M01', mod)
})(window)
