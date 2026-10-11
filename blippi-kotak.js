/* G32 Blippi -- W03-M04 "Dari Kotak Menjadi Mainan" (PRD 11.4: Build & Use; P07/P08; "Pilih benda pakai ulang dan bangun komponen taman"; replay "terowongan atau menara dengan set sama"; V07 = RECYCLING TRUCK carries the reusable things), played INSIDE bg-w03-m04-kotak-mainan.
 * Six things lie on the paved floor; the recycling truck (Blippi at the wheel) waits at the right with a load row.
 * 1 PILIH  (choose): tap the things that can be used again (cardboard boxes + the cardboard tube); each hops onto the truck's load row. Newspaper / can / bottle shake and say why not. Then "Berapa benda pakai ulang?".
 * 2 BANGUN (build): the truck tips the three pieces out above it. Tap TEROWONGAN or MENARA (the same set builds either), then drag the pieces onto the ghost layout. Then "Ada 6 benda, 3 dipakai. Sisa berapa?".
 * 3 MAIN   (use): tap the girl; she runs through the tunnel (behind the pieces) or climbs to the top of the tower and cheers. Then a maths-only SoalEngine question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 340
  var TH = 254
  var TS = 0.85
  var HOME = { x: 1340, y: 735 }
  var IW = 150
  var IH = 130
  var ITEMS = [
    { id: 'kardus', key: 'w3-kardus', ok: 'box', name: 'Kardus', x: 640, y: 500 },
    { id: 'koran', key: 'w3-koran', ok: '', name: 'Koran', x: 810, y: 500, why: 'Koran gampang sobek dan basah.' },
    { id: 'tabung', key: 'w3-tabung', ok: 'tube', name: 'Tabung', x: 980, y: 500 },
    { id: 'kaleng', key: 'w3-kaleng2', ok: '', name: 'Kaleng', x: 725, y: 598, why: 'Kaleng tajam, jangan dipakai bermain.' },
    { id: 'kardus2', key: 'w3-kardus', ok: 'box', name: 'Kardus', x: 895, y: 598 },
    { id: 'botol', key: 'w3-botol', ok: '', name: 'Botol', x: 1065, y: 598, why: 'Botol itu plastik. Kita butuh kardus dan tabung.' }
  ]
  var BOXW = 150
  var BOXH = 131
  var TUBW = 200
  var TUBH = 142
  // ghost layouts: the SAME set (2 boxes + 1 tube) builds a tunnel or a tower
  var LAYOUT = {
    tunnel: [{ t: 'tube', x: 250, y: 480 }, { t: 'box', x: 90, y: 480 }, { t: 'box', x: 470, y: 480 }],
    tower: [{ t: 'box', x: 250, y: 520 }, { t: 'box', x: 250, y: 389 }, { t: 'tube', x: 225, y: 247 }]
  }
  var SPOT = [{ x: 1130, y: 330 }, { x: 1290, y: 330 }, { x: 1450, y: 330 }]       // where the truck tips the pieces
  var SLOT = [{ fx: 0.04, fy: -0.32 }, { fx: 0.36, fy: -0.32 }, { fx: 0.68, fy: -0.32 }]
  var PICK = ['kardus', 'kardus2', 'tabung']

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var picked = saved.picked || {}
    var layout = saved.layout || null
    var placed = saved.placed || {}                 // layout index -> true
    var busy = false
    var hd = null
    function save () { api.persist({ picked: picked, layout: layout, placed: placed }) }
    if (step0 >= 1) PICK.forEach(function (k) { picked[k] = true })
    if (step0 >= 2 && !layout) layout = 'tunnel'
    if (step0 >= 3) LAYOUT[layout].forEach(function (s, i) { placed[i] = true })
    function nPicked () { return Object.keys(picked).length }
    function nPlaced () { return Object.keys(placed).length }

    // ---- the recycling truck, Blippi at the wheel, with a load row
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk daur ulang')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:6;pointer-events:none;transform-origin:50% 100%;cursor:default'
    var tart = api.art(truck, 'veh-recycling-truck', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'recycling-truck')
    K.driver(truck, { x: 0.71, y: 0.27, w: 0.25, h: 0.22 })
    var shade = api.at(sc, 'shd', 0, 0, 290, 40)
    shade.style.zIndex = '5'
    function placeTruck (x, y, sq) {
      truck.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH) + 'px) scale(' + TS + ',' + (TS * (sq || 1)) + ')'
      shade.style.transform = 'translate(' + (x - 145 * TS) + 'px,' + (y - 24) + 'px) scale(' + TS + ')'
    }
    placeTruck(HOME.x, HOME.y)
    var slotG = []
    var slotR = []
    PICK.forEach(function (k, i) {
      var key = k === 'tabung' ? 'w3-tabung' : 'w3-kardus'
      var g = K.ghost(api, truck, key, SLOT[i].fx * TW, SLOT[i].fy * TH, 96, 84)
      g.setAttribute('data-load-ghost', k)
      g.style.zIndex = '2'
      var r = api.at(truck, '', SLOT[i].fx * TW, SLOT[i].fy * TH, 96, 84)
      r.setAttribute('data-load', k)
      r.style.cssText += ';pointer-events:none;z-index:3;display:none'
      api.art(r, key, 0, 0, 96, 84, '')
      slotG.push(g)
      slotR.push(r)
      if (picked[k]) { g.style.display = 'none'; r.style.display = step0 >= 2 ? 'none' : 'block' }
    })

    // ---- step 1: things on the floor; tap the reusable ones
    var itemEls = {}
    ITEMS.forEach(function (it, i) {
      var c = api.at(sc, 'litter', it.x, it.y, IW, IH, 'button')
      c.type = 'button'
      c.setAttribute('data-item', it.id)
      c.setAttribute('data-reuse', it.ok ? '1' : '0')
      c.setAttribute('aria-label', it.name)
      c.style.cssText += ';background:none;border:0;padding:0;z-index:5;cursor:pointer;touch-action:manipulation;pointer-events:none'
      api.art(c, it.key, 0, 0, IW, IH, '')
      if (c.animate && !api.reduced()) c._bob = c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1700 + i * 150, iterations: Infinity, easing: 'ease-in-out' })
      itemEls[it.id] = c
      if (picked[it.id]) { c.style.display = 'none'; c.setAttribute('data-gone', '1') }
      if (step0 >= 1 && it.ok === '') c.style.opacity = '.5'
      c.addEventListener('click', function () { tapItem(it, c) })
    })
    function tapItem (it, c) {
      if (api.step() !== 0 || busy || c.getAttribute('data-gone')) return
      api.touch()
      if (!it.ok) {
        api.warn(it.why + ' Pilih kardus atau tabung.')
        if (c.animate && !api.reduced()) c.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }], { duration: 300 })
        PICK.forEach(function (k) { if (!picked[k]) K.glow(itemEls[k], 2600) })
        return
      }
      busy = true
      picked[it.id] = true
      c.setAttribute('data-gone', '1')
      c.classList.remove('glow')
      if (c._bob) c._bob.cancel()
      var idx = PICK.indexOf(it.id)
      var from = { x: it.x, y: it.y }
      var to = { x: HOME.x - TW * TS / 2 + SLOT[idx].fx * TW * TS - 20, y: HOME.y - TH * TS + SLOT[idx].fy * TH * TS - 20 }
      api.tween(from, to, 650, function (p, kk) { c.style.left = p.x + 'px'; c.style.top = (p.y - Math.sin(kk * Math.PI) * 120) + 'px'; c.style.transform = 'scale(' + (1 - kk * 0.4) + ')' }, function () {
        c.style.display = 'none'
        slotG[idx].style.display = 'none'
        slotR[idx].style.display = 'block'
        K.land(api, slotR[idx])
        api.sfx('bump')
        api.fx('dust', to.x + 40, to.y + 50, 110)
        save()
        busy = false
        if (nPicked() >= PICK.length) {
          api.warn(L.picked)
          itemOthers()
          api.later(function () {
            K.ask(api, { custom: { id: 'm04-count', prompt: 'Berapa benda pakai ulang di truk?', choices: ['2', '3', '4'], answer: '3', scene: { groups: [{ key: 'w3-kardus', n: 2 }, { key: 'w3-tabung', n: 1 }] }, hint1: 'Hitung: 2 kardus dan 1 tabung.' }, done: function () { api.later(function () { api.advance() }, 400) } })
          }, 500)
        } else api.warn(L.more)
      })
    }
    function itemOthers () { ITEMS.forEach(function (it) { if (!it.ok) itemEls[it.id].style.opacity = '.5' }) }

    // ---- step 2: the truck tips the pieces out, choose a build, drag onto the ghosts
    var pieces = []
    var ghosts = []
    var cards = []
    function makePieces () {
      if (pieces.length) return
      PICK.forEach(function (k, i) {
        var tube = k === 'tabung'
        var wd = tube ? TUBW : BOXW
        var ht = tube ? TUBH : BOXH
        var e = api.at(sc, 'piece', SPOT[i].x, SPOT[i].y, wd, ht, 'button')
        e.type = 'button'
        e.setAttribute('data-piece', k)
        e.setAttribute('data-type', tube ? 'tube' : 'box')
        e.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none'
        api.art(e, tube ? 'w3-tabung' : 'w3-kardus', 0, 0, wd, ht, '')
        K.land(api, e)
        pieces.push({ el: e, tube: tube, wd: wd, ht: ht, home: SPOT[i], done: false })
        slotR[i].style.display = 'none'
        var d = null
        e.addEventListener('pointerdown', function (ev) {
          if (api.step() !== 1 || busy || d || placedPiece(e)) return
          if (!layout) { api.warn(L.chooseFirst); showCards(); return }
          api.touch()
          var r = B.toRef(ev.clientX, ev.clientY)
          d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
          e.classList.remove('glow'); e.style.zIndex = '30'
          try { e.setPointerCapture(ev.pointerId) } catch (er) { /* synthetic */ }
        })
        e.addEventListener('pointermove', function (ev) {
          if (!d || ev.pointerId !== d.id) return
          var r = B.toRef(ev.clientX, ev.clientY)
          d.p = r
          d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
          e.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.05)'
        })
        function end (ev, cancel) {
          if (!d || ev.pointerId !== d.id) return
          var cu = d
          d = null
          e.style.zIndex = '7'
          var si = -1
          var bd = 1e9
          LAYOUT[layout].forEach(function (s, j) {
            if (placed[j]) return
            var sw = s.t === 'tube' ? TUBW : BOXW
            var sh = s.t === 'tube' ? TUBH : BOXH
            var dd = Math.hypot(cu.p.x - (s.x + sw / 2), cu.p.y - (s.y + sh / 2))
            if (dd < 150 && dd < bd) { si = j; bd = dd }
          })
          if (!cancel && cu.moved > 10 && si >= 0) {
            var sl = LAYOUT[layout][si]
            if (sl.t === (tube ? 'tube' : 'box')) { put(pieces[i], si); return }
            api.warn(tube ? L.tubeSpot : L.boxSpot)
            LAYOUT[layout].forEach(function (s, j) { if (!placed[j] && s.t === (tube ? 'tube' : 'box')) K.glow(ghosts[j], 2800) })
          } else if (!cancel) api.warn(cu.moved > 10 ? L.toGhost : L.dragPiece)
          api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 280, function (t) { e.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { e.style.transform = '' })
        }
        e.addEventListener('pointerup', function (ev) { end(ev, false) })
        e.addEventListener('pointercancel', function (ev) { end(ev, true) })
        e.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
      })
    }
    function restoreBuilt () {
      makePieces()
      var used = {}
      pieces.forEach(function (pc) {
        var j = -1
        LAYOUT[layout].forEach(function (sl, q) { if (j < 0 && !used[q] && sl.t === (pc.tube ? 'tube' : 'box')) j = q })
        used[j] = true
        var sl = LAYOUT[layout][j]
        pc.done = true
        pc.el.setAttribute('data-placed', '1')
        pc.el.style.pointerEvents = 'none'
        pc.el.style.transform = 'translate(' + (sl.x - pc.home.x) + 'px,' + (sl.y - pc.home.y) + 'px)'
      })
    }
    function placedPiece (e) { return e.getAttribute('data-placed') === '1' }
    function put (pc, si) {
      var s = LAYOUT[layout][si]
      placed[si] = true
      pc.done = true
      pc.el.setAttribute('data-placed', '1')
      pc.el.style.pointerEvents = 'none'
      pc.el.style.transform = 'translate(' + (s.x - pc.home.x) + 'px,' + (s.y - pc.home.y) + 'px)'
      ghosts[si].style.display = 'none'
      api.sfx('bump')
      api.fx('dust', s.x + pc.wd / 2, s.y + pc.ht, 130)
      if (pc.el.animate && !api.reduced()) pc.el.animate([{ transform: pc.el.style.transform + ' scale(1)' }, { transform: pc.el.style.transform + ' scale(1.08,.92)', offset: 0.4 }, { transform: pc.el.style.transform + ' scale(1)' }], { duration: 320 })
      save()
      if (nPlaced() >= PICK.length) {
        api.sfx('ok')
        api.fx('confetti', 400, 420, 320)
        api.warn(L.built)
        api.later(function () {
          K.ask(api, { custom: { id: 'm04-left', prompt: 'Ada 6 benda. 3 dipakai ulang. Sisa berapa?', choices: ['2', '3', '4'], answer: '3', scene: { groups: [{ key: 'w3-koran', n: 1 }, { key: 'w3-kaleng2', n: 1 }, { key: 'w3-botol', n: 1 }, { key: 'w3-kardus', n: 2, role: 'leave' }, { key: 'w3-tabung', n: 1, role: 'leave' }] }, hint1: 'Tiga sudah dipakai. Hitung yang tersisa.' }, done: function () { api.later(function () { api.advance() }, 400) } })
        }, 800)
      } else api.warn(L.more2)
    }
    function drawGhosts () {
      ghosts.forEach(function (g) { if (g.parentNode) g.parentNode.removeChild(g) })
      ghosts = []
      LAYOUT[layout].forEach(function (s, j) {
        var tube = s.t === 'tube'
        var g = K.ghost(api, sc, tube ? 'w3-tabung' : 'w3-kardus', s.x, s.y, tube ? TUBW : BOXW, tube ? TUBH : BOXH, false, true)
        g.setAttribute('data-ghost-build', String(j))
        if (placed[j]) g.style.display = 'none'
        ghosts.push(g)
      })
    }
    function chooseLayout (name) {
      layout = name
      cards.forEach(function (c) { if (c.parentNode) c.parentNode.removeChild(c) })
      cards = []
      drawGhosts()
      save()
      api.warn(L.dragPiece)
      pieces.forEach(function (p) { K.glow(p.el, 2800) })
    }
    function showCards () {
      if (layout || cards.length) return
      ;[{ n: 'tunnel', x: 200, y: 300, key: 'w3-tabung', lb: 'TEROWONGAN' }, { n: 'tower', x: 440, y: 300, key: 'w3-kardus', lb: 'MENARA' }].forEach(function (cd) {
        var c = api.at(sc, 'panel choicecard', cd.x, cd.y, 210, 170, 'button')
        c.type = 'button'
        c.setAttribute('data-build', cd.n)
        c.style.cssText += ';z-index:9;cursor:pointer;padding:0'
        api.art(c, cd.key, 25, 10, 160, 112, '')
        var lb = api.at(c, '', 0, 126, 210, 40)
        lb.style.cssText += ';font:900 24px/40px Fredoka,Nunito,sans-serif;color:#13318A;text-align:center'
        lb.textContent = cd.lb
        K.land(api, c)
        K.glow(c, 3000)
        c.addEventListener('click', function () { api.touch(); api.sfx('tap'); chooseLayout(cd.n) })
        cards.push(c)
      })
    }

    // ---- step 3: the girl plays
    var girl = api.at(sc, 'girl', 700, 360, 150, 152, 'button')
    girl.type = 'button'
    girl.setAttribute('data-girl', '1')
    girl.setAttribute('aria-label', 'Anak bermain')
    girl.style.cssText += ';background:none;border:0;padding:0;z-index:4;cursor:pointer;touch-action:manipulation;display:none'
    api.art(girl, 'cast-child', 0, 0, 150, 152, '')
    var played = false
    function play () {
      if (api.step() !== 2 || busy || played) return
      api.touch()
      busy = true
      played = true
      girl.classList.remove('glow')
      api.sfx('honk')
      var from = { x: 700, y: 360 }
      var tunnel = layout === 'tunnel'
      var mid = tunnel ? { x: 30, y: 400 } : { x: 250, y: 230 }
      var first = tunnel ? { x: 640, y: 400 } : { x: 520, y: 400 }
      girl.style.zIndex = '2'
      api.tween(from, first, 500, function (p) { girl.style.left = p.x + 'px'; girl.style.top = p.y + 'px' }, function () {
        api.tween(first, mid, tunnel ? 1500 : 900, function (p, kk) { girl.style.left = p.x + 'px'; girl.style.top = (p.y - (tunnel ? Math.sin(kk * 12) * 6 : 0)) + 'px' }, function () {
          api.sfx('ok')
          girl.style.zIndex = '8'
          if (!tunnel) { girl.style.left = '255px'; girl.style.top = '140px' }
          api.fx('confetti', tunnel ? 150 : 330, tunnel ? 440 : 200, 320)
          api.warn(L.played)
          api.later(function () {
            K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { busy = false; api.later(function () { api.advance() }, 300) } })
          }, 900)
        })
      })
    }
    girl.addEventListener('click', play)

    function firstPick () { var k = null; PICK.forEach(function (x) { if (!k && !picked[x]) k = x }); return k }
    function firstPiece () { var r = null; pieces.forEach(function (p, i) { if (!r && !p.done) r = { p: p, i: i } }); return r }
    function slotFor (pc) { var r = -1; LAYOUT[layout].forEach(function (s, j) { if (r < 0 && !placed[j] && s.t === (pc.tube ? 'tube' : 'box')) r = j }); return r }

    var ctl = {
      onStep: function (n) {
        ITEMS.forEach(function (it) { itemEls[it.id].style.pointerEvents = n === 0 && !itemEls[it.id].getAttribute('data-gone') ? 'auto' : 'none'; itemEls[it.id].classList.remove('glow') })
        if (n === 0) PICK.forEach(function (k) { if (!picked[k]) itemEls[k].classList.add('glow') })
        if (n === 1) {
          makePieces()
          if (layout) drawGhosts()
          if (!layout) api.later(showCards, 500)
        }
        if (n === 2 && !pieces.length) restoreBuilt()
        if (n === 2) { girl.style.display = 'block'; K.glow(girl, 3200); api.warn(L.tapGirl) }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var k = firstPick(); if (k) { var it = ITEMS.filter(function (x) { return x.id === k })[0]; hd.move([{ x: it.x + 50, y: it.y + 30 }, { x: HOME.x - 80, y: HOME.y - 260 }], 1100) } }
        else if (n === 1) { var fp = firstPiece(); if (!layout) hd.move([{ x: 560, y: 330 }, { x: 330, y: 370 }], 900); else if (fp) { var sj = slotFor(fp.p); var s = LAYOUT[layout][sj]; hd.move([{ x: fp.p.home.x + 60, y: fp.p.home.y + 50 }, { x: s.x + 60, y: s.y + 50 }], 1200) } }
        else hd.move([{ x: 760, y: 440 }, { x: 760, y: 440 }], 1800)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var k = firstPick()
          if (!k) return
          K.glow(itemEls[k], 3000)
          if (lvl >= 4) tapItem(ITEMS.filter(function (x) { return x.id === k })[0], itemEls[k])
        } else if (s === 1) {
          if (!layout) { showCards(); cards.forEach(function (c) { K.glow(c, 3000) }); if (lvl >= 4) chooseLayout('tunnel'); return }
          var fp = firstPiece()
          if (!fp) return
          K.glow(fp.p.el, 3000)
          var sj = slotFor(fp.p)
          if (sj >= 0) K.glow(ghosts[sj], 3000)
          if (lvl >= 4 && sj >= 0) put(fp.p, sj)
        } else {
          K.glow(girl, 3000)
          if (lvl >= 4) play()
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W03-M04', mod)
})(window)
