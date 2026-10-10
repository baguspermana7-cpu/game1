/* G32 Blippi -- W01-M02 "Harta di Bawah Pasir" (PRD: Explore & Discover; spatial clues -> choose the dig cell), played INSIDE bg-w01-m02-pasir.
 * Three parts are buried in the 3x3 sand pit. The clue scroll gives each part's place as words (baris/kolom) AND a mini 3x3 grid; the child digs the
 * matching cell. A wrong cell never fails: a kind reason line, and after 2 empty digs the right row glows, then the column, then the cell (hint ladder). */
(function (w) {
  'use strict'
  var COLX = [720, 945, 1170]
  var ROWY = [500, 573, 650]
  var CW = 205
  var CH = 68
  var ROWN = ['atas', 'tengah', 'bawah']
  var COLN = ['kiri', 'tengah', 'kanan']
  var ITEMS = [{ n: 'Katup', key: 'prop-katup' }, { n: 'Pipa', key: 'prop-pipa' }, { n: 'Roda Gigi', lib: '../Dunia-Emosi/assets/db/lib/game/gear.webp' }]
  var GATE = { x: 1420, y: 300, w: 220, h: 300 }

  function place (c) { return 'baris ' + ROWN[Math.floor(c / 3)] + ', kolom ' + COLN[c % 3] }
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
      el.setAttribute('aria-label', 'Petak ' + place(c))
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
      var d = api.at(pit, '', COLX[cell % 3] - 80, ROWY[Math.floor(cell / 3)] - 24, 160, 48)
      d.style.cssText += ';border-radius:50%;background:radial-gradient(ellipse at 50% 40%,#8C6A40,#B28B57 70%,rgba(178,139,87,0));pointer-events:none;z-index:2'
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
        pic(row, it, 62)
        var tx = document.createElement('div')
        tx.style.cssText = 'flex:1;font:900 21px/1.1 Nunito,sans-serif;color:#13318A'
        tx.textContent = found[i] ? it.n + ' ketemu!' : it.n + ': ' + place(tg[i])
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
      api.persist({ t: tg, found: found, dug: dug })
      api.warn(L.read)
      api.later(function () { api.advance() }, 600)
    }

    var bucket = api.art(sc, 'modul-bucket-sempit', 0, 0, 230, 275, 'bucket')
    bucket.style.cssText += ';opacity:0;pointer-events:none;z-index:6;transform-origin:50% 100%'
    function popItem (i, cell) {
      var it = ITEMS[i]
      var d = api.at(sc, '', COLX[cell % 3] - 80, ROWY[Math.floor(cell / 3)] - 150, 160, 160)
      d.style.zIndex = '7'
      d.style.pointerEvents = 'none'
      pic(d, it, 160)
      if (d.animate && !api.reduced()) d.animate([{ transform: 'translateY(40px) scale(.4)', opacity: 0 }, { transform: 'translateY(-26px) scale(1.15)', opacity: 1, offset: .55 }, { transform: 'translateY(-14px) scale(1)', opacity: 1 }], { duration: 520, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
      api.later(function () { if (d.parentNode) { d.style.transition = 'opacity .5s'; d.style.opacity = '0'; setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d) }, 520) } }, 1500)
      api.fx('gold-star', COLX[cell % 3], ROWY[Math.floor(cell / 3)] - 60, 170)
    }
    function dig (c) {
      if (api.step() !== 1) { if (api.step() === 0) { api.touch(); api.warn('Baca petunjuk dulu ya.') } return }
      api.touch()
      if (api.tool() !== 'gali') { api.warn(L.wrongTool); api.shakeTool('gali'); return }
      if (dug.indexOf(c) >= 0) { api.warn('Petak ini sudah digali. Coba petak lain!'); return }
      dug = dug.concat([c])
      var x = COLX[c % 3]
      var y = ROWY[Math.floor(c / 3)]
      bucket.style.left = (x - 115) + 'px'
      bucket.style.top = (y - 230) + 'px'
      bucket.style.opacity = '1'
      if (bucket.animate && !api.reduced()) bucket.animate([{ transform: 'translateY(-90px) rotate(-14deg)', opacity: 0 }, { transform: 'translateY(8px) rotate(0)', opacity: 1, offset: .45 }, { transform: 'translateY(-60px) rotate(8deg)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.23,1,.32,1)' })
      api.sfx('bump')
      api.fx('dust', x, y, 190)
      mark(c, true)
      var i = tg.indexOf(c)
      api.later(function () {
        if (i >= 0 && !found[i]) {
          found[i] = true
          popItem(i, c)
          api.sfx('collect')
          api.warn(ITEMS[i].n + ' ' + L.found.toLowerCase())
          renderPanel()
          api.persist({ t: tg, found: found, dug: dug })
          clearBands()
          if (nextTarget() < 0) { api.later(function () { api.warn(L.allFound); api.advance() }, 1300) }
        } else {
          empties++
          api.persist({ t: tg, found: found, dug: dug })
          var nx = nextTarget()
          api.warn(L.empty + (nx >= 0 ? ' ' + ITEMS[nx].n + ' ada di ' + place(tg[nx]) + '.' : ''))
          if (empties % 2 === 0 && nx >= 0) { glowRow(nx) }
        }
      }, 480)
    }
    function glowRow (nx) {
      var t = tg[nx]
      bRow.style.top = (ROWY[Math.floor(t / 3)] - CH / 2 - 5) + 'px'
      showBand(bRow, true)
      setTimeout(function () { showBand(bRow, false) }, 2600)
    }

    // gate delivery
    var gate = api.at(sc, '', GATE.x, GATE.y, GATE.w, GATE.h, 'button')
    gate.type = 'button'
    gate.setAttribute('data-gate', '1')
    gate.setAttribute('aria-label', 'Gerbang taman: antar benda')
    gate.style.cssText += ';background:none;border:0;cursor:pointer;z-index:3;border-radius:30px;pointer-events:none'
    var delivered = false
    gate.addEventListener('click', function () { deliver() })
    function deliver () {
      if (delivered || api.step() !== 2) return
      api.touch()
      if (api.tool() !== 'pasang') { api.warn(L.wrongTool); api.shakeTool('pasang'); return }
      delivered = true
      api.sfx('ok')
      ITEMS.forEach(function (it, i) {
        var d = api.at(sc, '', COLX[tg[i] % 3] - 40, ROWY[Math.floor(tg[i] / 3)] - 80, 80, 80)
        d.style.zIndex = '8'
        d.style.pointerEvents = 'none'
        pic(d, it, 80)
        var from = { x: COLX[tg[i] % 3] - 40, y: ROWY[Math.floor(tg[i] / 3)] - 80 }
        api.later(function () {
          api.tween(from, { x: GATE.x + 70 + (i - 1) * 40, y: GATE.y + 150 }, 700, function (p) { d.style.transform = 'translate(' + (p.x - from.x) + 'px,' + (p.y - from.y - Math.sin(Math.min(1, (p.x - from.x) / Math.max(1, GATE.x + 70 - from.x)) * Math.PI) * 120) + 'px)' }, function () { api.fx('spark', GATE.x + 110, GATE.y + 140, 200); d.style.opacity = '0' })
        }, i * 260)
      })
      api.later(function () { api.fx('confetti', GATE.x + 110, GATE.y + 100, 320); api.persist({ t: tg, found: found, dug: dug }); api.advance() }, 1500)
    }

    var ctl = {
      onStep: function (n) {
        panel.classList.toggle('glowpanel', n === 0)
        gate.style.pointerEvents = n === 2 ? 'auto' : 'none'
        if (n === 2) { gate.classList.add('glow') } else gate.classList.remove('glow')
        if (n === 1) renderPanel()
      },
      demo: function (n) {
        this.hint(1)
        var K = w.BlippiKit
        if (!K) return
        if (!hd) hd = K.hand(api)
        var pt = n === 0 ? { x: 150, y: 470 } : (n === 1 ? { x: 220, y: 330 } : { x: GATE.x + 80, y: GATE.y + 120 })
        hd.move([pt, { x: pt.x, y: pt.y - 16 }, pt], 420)
      },
      onTool: function () {},
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          panel.classList.add('glow'); setTimeout(function () { panel.classList.remove('glow') }, 2600)
          if (lvl >= 4 && api.tool() === 'baca') readClues()
        } else if (s === 1) {
          var nx = nextTarget()
          if (nx < 0) return
          if (api.tool() !== 'gali') api.glowTool('gali', 3000)
          var t = tg[nx]
          if (lvl === 1) glowRow(nx)
          else if (lvl === 2) { bCol.style.left = (COLX[t % 3] - CW / 2 - 5) + 'px'; showBand(bCol, true); setTimeout(function () { showBand(bCol, false) }, 2600) }
          else if (lvl === 3) { bCell.style.left = (COLX[t % 3] - CW / 2 - 5) + 'px'; bCell.style.top = (ROWY[Math.floor(t / 3)] - CH / 2 - 5) + 'px'; showBand(bCell, true); setTimeout(function () { showBand(bCell, false) }, 2600) }
          else if (api.tool() === 'gali') dig(t)
        } else {
          if (api.tool() !== 'pasang') api.glowTool('pasang', 3000)
          gate.classList.add('glow')
          if (lvl >= 4 && api.tool() === 'pasang') deliver()
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () {}
    }
    if (rs && rs.step >= 2) { gate.style.pointerEvents = 'auto' }
    api.persist({ t: tg, found: found, dug: dug })
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M02', mod)
})(window)
