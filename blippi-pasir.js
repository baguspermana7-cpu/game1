/* G32 Blippi -- W01-M02 "Harta di Bawah Pasir" (PRD 11.2: Explore & Discover; P04 Dig/Scoop/Load with V02 EXCAVATOR), played INSIDE bg-w01-m02-pasir.
 * Three PLAYGROUND parts are buried in the 3x3 sand pit (swing seat, slide, see-saw). The clue scroll shows each part as a dark SHAPE silhouette + a tiny 3x3 map
 * with the cell lit; the child taps a cell, the EXCAVATOR drives there, dips its bucket (sand spray, hole, pile) and lifts the find out. A wrong cell turns up a harmless
 * pebble (kind line; after 2 misses the row glows, then column, then cell). Step 3: drag each part onto its own shadow in the park, where it snaps on. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var COLX = [720, 945, 1170]
  var ROWY = [500, 573, 650]
  var CW = 205
  var CH = 68
  var ITEMS = [{ n: 'Ayunan', key: 'pc-swing', slot: { x: 1345, y: 345, w: 170, h: 100 } }, { n: 'Perosotan', key: 'pc-slide', slot: { x: 1500, y: 420, w: 170, h: 106 } }, { n: 'Jungkat-jungkit', key: 'prop-jungkat', slot: { x: 1380, y: 560, w: 190, h: 112 } }]
  var EXC = { w: 250, h: 238, tipX: 17, tipY: 205, park: { x: 452, y: 470 } }
  function pic (parent, it, size) {
    var d = document.createElement('div')
    d.style.cssText = 'position:relative;width:' + size + 'px;height:' + size + 'px;flex:0 0 auto'
    if (it.lib) { var i = new Image(); i.src = it.lib; i.alt = ''; i.style.cssText = 'width:100%;height:100%;object-fit:contain'; d.appendChild(i) } else w.Blippi.A.fill(d, it.key)
    parent.appendChild(d)
    return d
  }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var tg = saved.t
    if (!tg) {
      var pool = [0, 1, 2, 3, 4, 5, 6, 7, 8]
      tg = []
      while (tg.length < 3) tg.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
    }
    var hd = null
    var found = saved.found || [false, false, false]
    var dug = saved.dug || []
    var empties = 0
    var rs = api.restore
    var cells = []
    var bands = []

    // sand cells (invisible hit boxes) + dug patches
    var pit = api.at(sc, '', 0, 0, 1672, 941)
    pit.style.pointerEvents = 'none'
    var c
    for (c = 0; c < 9; c++) {
      var cx = COLX[c % 3]
      var cy = ROWY[Math.floor(c / 3)]
      var el = api.at(pit, 'dcell', cx - CW / 2, cy - CH / 2, CW, CH, 'button')
      el.type = 'button'
      el.setAttribute('data-cell', String(c))
      el.setAttribute('aria-label', 'Petak ' + (c + 1))
      el.style.cssText += ';background:none;border:0;padding:0;cursor:pointer;pointer-events:auto;z-index:3;touch-action:manipulation'
      ;(function (k) { el.addEventListener('click', function () { dig(k) }) })(c)
      cells.push(el)
      if (dug.indexOf(c) >= 0) mark(c, false)
    }
    // glow bands for the hint ladder (row, column, cell)
    function band (x, y, wd, ht) { var b = api.at(sc, '', x, y, wd, ht); b.style.cssText += ';border:5px solid #FFC440;border-radius:20px;box-shadow:0 0 22px 6px rgba(255,190,60,.85);opacity:0;pointer-events:none;transition:opacity .25s;z-index:4'; return b }
    var bRow = band(COLX[0] - CW / 2 - 6, 0, CW * 3 + 60, CH + 10)
    var bCol = band(0, ROWY[0] - CH / 2 - 6, CW + 10, ROWY[2] - ROWY[0] + CH + 12)
    var bCell = band(0, 0, CW + 10, CH + 10)
    bands = [bRow, bCol, bCell]
    function showBand (b, on) { b.style.opacity = on ? '1' : '0' }
    function clearBands () { bands.forEach(function (b) { showBand(b, false) }) }
    function nextTarget () { var i; for (i = 0; i < 3; i++) if (!found[i]) return i; return -1 }

    function mark (cell, anim) {
      var d = api.art(pit, 'pc-sand-dug', COLX[cell % 3] - 78, ROWY[Math.floor(cell / 3)] - 42, 156, 90, 'hole')
      d.setAttribute('data-hole', String(cell))
      d.style.cssText += ';pointer-events:none;z-index:2'
      if (anim && d.animate && !api.reduced()) d.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 260, easing: 'cubic-bezier(.23,1,.32,1)' })
    }

    // clue scroll + panel
    var panel = api.at(sc, 'panel', 40, 372, 420, 330)
    panel.setAttribute('data-clues', '1')
    panel.style.zIndex = '5'
    var open = !!(rs && rs.step >= 1)
    function renderPanel () {
      panel.innerHTML = ''
      if (!open) {
        var rd = api.at(panel, 'obtn', 40, 100, 340, 120, 'button')
        rd.type = 'button'
        rd.setAttribute('data-act', 'baca')
        rd.textContent = 'BACA PETUNJUK'
        rd.style.fontSize = '30px'
        rd.addEventListener('click', function () { readClues() })
        panel.classList.add('glowpanel')
        return
      }
      var t = api.at(panel, 'title', 0, 10, 420, 44)
      t.textContent = 'PETUNJUK'
      t.style.fontSize = '32px'
      ITEMS.forEach(function (it, i) {
        var row = api.at(panel, '', 14, 62 + i * 88, 392, 82)
        row.style.cssText += ';display:flex;align-items:center;gap:10px;border-radius:18px;background:' + (found[i] ? 'rgba(46,156,91,.22)' : 'rgba(255,255,255,.7)') + ';padding:4px 8px'
        row.setAttribute('data-clue', String(i))
        var pp = pic(row, it, 62)
        if (!found[i]) pp.style.filter = 'brightness(0) opacity(.72)'
        var tx = document.createElement('div')
        tx.style.cssText = 'flex:1;font:900 21px/1.1 Nunito,sans-serif;color:#13318A'
        tx.textContent = found[i] ? 'Ketemu!' : '?'
        row.appendChild(tx)
        var g = document.createElement('div')
        g.style.cssText = 'display:grid;grid-template-columns:repeat(3,16px);gap:2px;flex:0 0 auto'
        var k
        for (k = 0; k < 9; k++) { var q = document.createElement('i'); q.style.cssText = 'display:block;width:16px;height:16px;border-radius:3px;background:' + (k === tg[i] ? '#F4761A' : '#E3D2A8'); g.appendChild(q) }
        row.appendChild(g)
      })
    }
    renderPanel()

    function readClues () {
      if (api.step() !== 0) return
      api.touch()
      if (api.tool() !== 'baca') { api.warn(L.wrongTool); api.shakeTool('baca'); return }
      open = true
      api.sfx('ok')
      renderPanel()
      api.persist({ t: tg, found: found, dug: dug, carried: carried })
      api.warn(L.read)
      api.later(function () { api.advance() }, 600)
    }

    // the EXCAVATOR (V02) stands in the sandbox scene, readable size; it does the digging
    var exc = api.art(sc, 'veh-excavator', EXC.park.x, EXC.park.y, EXC.w, EXC.h, 'excv')
    exc.setAttribute('data-excavator', '1')
    exc.style.cssText += ';z-index:8;pointer-events:none;transform-origin:92% 92%'
    K.driver(exc, { x: 0.58, y: 0.38, w: 0.17, h: 0.27 })
    var excShadow = api.at(sc, 'shd', 0, 0, 220, 30)
    excShadow.style.zIndex = '7'
    var ex = { x: EXC.park.x, y: EXC.park.y }
    function excPlace (x, y, tilt) {
      ex = { x: x, y: y }
      exc.style.left = x + 'px'
      exc.style.top = y + 'px'
      exc.style.transform = tilt ? 'rotate(' + tilt + 'deg)' : ''
      excShadow.style.transform = 'translate(' + (x + 10) + 'px,' + (y + EXC.h - 24) + 'px)'
    }
    excPlace(ex.x, ex.y, 0)
    var busy = false
    function popItem (i, cell) {
      var it = ITEMS[i]
      var d = api.at(sc, '', COLX[cell % 3] - 70, ROWY[Math.floor(cell / 3)] - 140, 140, 120)
      d.style.zIndex = '9'
      d.style.pointerEvents = 'none'
      pic(d, it, 140)
      if (d.animate && !api.reduced()) d.animate([{ transform: 'translateY(50px) scale(.4)', opacity: 0 }, { transform: 'translateY(-34px) scale(1.15)', opacity: 1, offset: 0.55 }, { transform: 'translateY(-14px) scale(1)', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
      api.later(function () { if (d.parentNode) { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d) }, 520) } }, 1400)
      api.fx('gold-star', COLX[cell % 3], ROWY[Math.floor(cell / 3)] - 60, 170)
    }
    function pebble (cell) {
      var d = api.at(sc, '', COLX[cell % 3] - 24, ROWY[Math.floor(cell / 3)] - 40, 48, 32)
      d.style.cssText += ';z-index:9;pointer-events:none;border-radius:50%;background:radial-gradient(ellipse at 35% 30%,#C9C3BA,#8F887D 70%);box-shadow:0 3px 4px rgba(60,40,10,.35)'
      if (d.animate && !api.reduced()) d.animate([{ transform: 'translateY(30px) scale(.3)', opacity: 0 }, { transform: 'translateY(-26px) scale(1.1)', opacity: 1, offset: 0.55 }, { transform: 'translateY(-10px) scale(1)', opacity: 1 }], { duration: 480, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
      api.later(function () { if (d.parentNode) d.parentNode.removeChild(d) }, 1500)
    }
    function dig (c) {
      if (busy) return
      if (api.step() !== 1) { if (api.step() === 0) { api.touch(); api.warn(L.readFirst) } return }
      api.touch()
      if (dug.indexOf(c) >= 0) { api.warn(L.dugAlready); return }
      dug = dug.concat([c])
      busy = true
      var x = COLX[c % 3]
      var y = ROWY[Math.floor(c / 3)]
      var i = tg.indexOf(c)
      api.sfx('honk')
      // drive so the bucket tip is over the cell, dip (arm down), spray, lift the find
      api.tween({ x: ex.x, y: ex.y }, { x: x - EXC.tipX + 4, y: y - EXC.tipY + 26 }, 700, function (p) { excPlace(p.x, p.y, 0) }, function () {
        api.sfx('bump')
        if (exc.animate && !api.reduced()) exc.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-6deg)' }, { transform: 'rotate(-6deg)', offset: 0.6 }, { transform: 'rotate(0)' }], { duration: 760, easing: 'cubic-bezier(.23,1,.32,1)' })
        api.fx('dust', x, y, 220)
        mark(c, true)
        var pile = api.art(sc, 'pc-sand-pile', x + 40, y - 60, 120, 68, 'pile')
        pile.style.cssText += ';z-index:7;pointer-events:none'
        K.land(api, pile)
        api.later(function () { if (pile.parentNode) { pile.style.transition = 'opacity .6s'; pile.style.opacity = '0'; setTimeout(function () { if (pile.parentNode) pile.parentNode.removeChild(pile) }, 650) } }, 1500)
        api.later(function () {
          if (i >= 0 && !found[i]) {
            found[i] = true
            popItem(i, c)
            api.sfx('collect')
            api.warn(ITEMS[i].n + ' ' + L.found.toLowerCase())
            renderPanel()
            api.persist({ t: tg, found: found, dug: dug, carried: carried })
            clearBands()
            if (nextTarget() < 0) { api.later(function () { busy = false; api.warn(L.allFound); api.advance() }, 1300); return }
          } else {
            empties++
            pebble(c)
            api.persist({ t: tg, found: found, dug: dug, carried: carried })
            api.warn(L.empty)
            if (empties % 2 === 0 && nextTarget() >= 0) glowRow(nextTarget())
          }
          busy = false
        }, 560)
      })
    }
    function glowRow (nx) {
      var t = tg[nx]
      bRow.style.top = (ROWY[Math.floor(t / 3)] - CH / 2 - 5) + 'px'
      showBand(bRow, true)
      setTimeout(function () { showBand(bRow, false) }, 2600)
    }

    // step 3: the finds lie on the sand where they were dug; DRAG each onto ITS OWN shadow in the park; it snaps on (a tap does nothing, a miss floats back)
    var carried = saved.carried || []
    var pieces = []
    var slots = []
    ITEMS.forEach(function (it, i) {
      var sl = it.slot
      var z = api.at(sc, '', sl.x, sl.y, sl.w, sl.h)
      z.setAttribute('data-slot', 'park' + i)
      z.style.cssText += ';pointer-events:none;z-index:2;display:none'
      K.ghost(api, z, it.key, 0, 0, sl.w, sl.h)
      slots[i] = z
      if (carried.indexOf(i) >= 0) { z.style.display = 'block'; z.querySelector('div').style.display = 'none'; drawInstalled(i, false) }
    })
    function drawInstalled (i, anim) {
      var sl = ITEMS[i].slot
      var d = api.at(sc, '', sl.x, sl.y, sl.w, sl.h)
      d.setAttribute('data-installed', String(i))
      d.style.cssText += ';z-index:3;pointer-events:none'
      pic(d, ITEMS[i], Math.min(sl.w, sl.h + 20)).style.margin = '0 auto'
      if (anim) K.land(api, d)
    }
    function pieceHome (i) { return { x: COLX[tg[i] % 3] - 45, y: ROWY[Math.floor(tg[i] / 3)] - 100 } }
    function mkPieces () {
      ITEMS.forEach(function (it, i) {
        if (carried.indexOf(i) >= 0 || pieces[i]) return
        var d = api.at(sc, 'carry', 0, 0, 90, 90)
        d.setAttribute('data-carry', String(i))
        d.style.cssText += ';z-index:9;touch-action:none;cursor:grab'
        pic(d, it, 90)
        d.style.transform = 'translate(' + pieceHome(i).x + 'px,' + pieceHome(i).y + 'px)'
        d.classList.add('glow')
        wireCarry(d, i)
        pieces[i] = d
      })
      slots.forEach(function (z, i) { if (carried.indexOf(i) < 0) z.style.display = 'block' })
    }
    function wireCarry (d, i) {
      var dr = null
      d.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 2 || dr) return
        api.touch()
        dr = { id: ev.pointerId, moved: 0, x0: B.toRef(ev.clientX, ev.clientY) }
        d.classList.remove('glow')
        try { d.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      d.addEventListener('pointermove', function (ev) {
        if (!dr || ev.pointerId !== dr.id) return
        var p = B.toRef(ev.clientX, ev.clientY)
        dr.moved = Math.max(dr.moved, Math.abs(p.x - dr.x0.x) + Math.abs(p.y - dr.x0.y))
        dr.p = p
        d.style.transform = 'translate(' + (p.x - 45) + 'px,' + (p.y - 45) + 'px) scale(1.12)'
      })
      function end (ev, cancel) {
        if (!dr || ev.pointerId !== dr.id) return
        var cur = dr
        dr = null
        var p = cur.p
        var sl = ITEMS[i].slot
        if (!cancel && p && cur.moved > 10 && K.within(p, sl.x + sl.w / 2, sl.y + sl.h / 2, 120)) { give(i, p); return }
        if (!cancel) {
          if (cur.moved <= 10) api.warn(L.dragIt)
          else api.warn(L.wrongSpot)
          K.glow(slots[i], 2600)
        }
        var from = p ? { x: p.x - 45, y: p.y - 45 } : pieceHome(i)
        api.tween(from, pieceHome(i), 300, function (q) { d.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' })
      }
      d.addEventListener('pointerup', function (ev) { end(ev, false) })
      d.addEventListener('pointercancel', function (ev) { end(ev, true) })
      d.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    }
    function give (i, p) {
      carried = carried.concat([i])
      var d = pieces[i]
      var sl = ITEMS[i].slot
      api.sfx('collect')
      var from = p ? { x: p.x - 45, y: p.y - 45 } : pieceHome(i)
      api.tween(from, { x: sl.x + sl.w / 2 - 45, y: sl.y + sl.h / 2 - 45 }, 240, function (q) { d.style.transform = 'translate(' + q.x + 'px,' + q.y + 'px)' }, function () {
        d.style.display = 'none'
        slots[i].querySelector('div').style.display = 'none'
        drawInstalled(i, true)
        api.fx('spark', sl.x + sl.w / 2, sl.y + sl.h / 2, 200)
      })
      api.persist({ t: tg, found: found, dug: dug, carried: carried })
      if (carried.length >= 3) api.later(function () { api.fx('confetti', 1450, 420, 340); api.advance() }, 700)
    }
    function deliver () { var i; for (i = 0; i < 3; i++) if (carried.indexOf(i) < 0) { give(i, null); return } }
    if (rs && rs.step >= 2) mkPieces()

    var ctl = {
      onStep: function (n) {
        panel.classList.toggle('glowpanel', n === 0)
        if (n === 2) mkPieces()
        if (n === 0) { K.glow(panel, 2600) }
        if (n === 1) { K.glow(exc, 2600); renderPanel() }
      },
      demo: function (n) {
        this.hint(1)
        if (!K) return
        if (!hd) hd = K.hand(api)
        if (n === 2) { var nxt = 0; while (nxt < 2 && carried.indexOf(nxt) >= 0) nxt++; var h0 = pieceHome(nxt); var sl = ITEMS[nxt].slot; hd.move([h0, { x: sl.x + sl.w / 2 - 30, y: sl.y + sl.h / 2 - 30 }], 1000); return }
        var pt = n === 0 ? { x: 150, y: 470 } : { x: COLX[tg[nextTarget()] % 3] - 30, y: ROWY[Math.floor(tg[nextTarget()] / 3)] - 60 }
        hd.move([pt, { x: pt.x, y: pt.y - 16 }, pt], 420)
      },
      onTool: function () {},
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          K.glow(panel, 2600)
          if (lvl >= 4) readClues()
        } else if (s === 1) {
          var nx = nextTarget()
          if (nx < 0) return
          var t = tg[nx]
          if (lvl === 1) glowRow(nx)
          else if (lvl === 2) { bCol.style.left = (COLX[t % 3] - CW / 2 - 5) + 'px'; showBand(bCol, true); setTimeout(function () { showBand(bCol, false) }, 2600) }
          else if (lvl === 3) { bCell.style.left = (COLX[t % 3] - CW / 2 - 5) + 'px'; bCell.style.top = (ROWY[Math.floor(t / 3)] - CH / 2 - 5) + 'px'; showBand(bCell, true); setTimeout(function () { showBand(bCell, false) }, 2600) }
          else dig(t)
        } else {
          slots.forEach(function (z, i) { if (carried.indexOf(i) < 0) K.glow(z, 3000) })
          if (lvl >= 4) deliver()
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () {}
    }
    api.persist({ t: tg, found: found, dug: dug, carried: carried })
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M02', mod)
})(window)
