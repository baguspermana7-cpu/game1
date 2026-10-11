/* G32 Blippi -- W03-M03 "Roda Pemilah Berhenti" (PRD 11.4: Fix & Transform; P02/P03/P07; "Periksa gear mainan yang belum terpasang; pilah 6 benda"; V07 = RECYCLING TRUCK collects), played INSIDE bg-w03-m03-roda-pemilah.
 * The sorting machine has stopped: its wall shows empty gear sockets (ghost gears). Three gears lie on the platform; the recycling truck (Blippi at the wheel) waits on the left.
 * 1 PASANG (fix): drag each gear to its ghost socket (the big yellow one in the middle, the two small ones beside it). A wrong size floats back with the reason. The gears mesh and turn; then "Gear mana paling besar?".
 * 2 PILAH  (tap the bin): the belt brings ONE thing at a time to the end; tap the bin of its material (green LOGAM, orange PLASTIK, blue KERTAS). The thing hops in; a wrong bin shakes and says why. Then 2 + 2 + 2.
 * 3 ANGKUT (hold to drive): HOLD the truck, it rolls to the bins (ghost truck); each bin tips into the hopper and a numbered bale lands on its load row. Then a maths-only SoalEngine question. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var TW = 340
  var TH = 254
  var TS = 0.85
  var HOME = { x: 300, y: 735 }
  var DEST = { x: 640, y: 655 }
  var GEARS = [
    { id: 'kuning', key: 'w3-gear-kuning', size: 190, x: 480, y: 545, kind: 'big', name: 'kuning' },
    { id: 'biru', key: 'w3-gear-biru', size: 150, x: 745, y: 580, kind: 'small', name: 'biru' },
    { id: 'merah', key: 'w3-gear-merah', size: 150, x: 965, y: 580, kind: 'small', name: 'merah' }
  ]
  var SOCK = [
    { id: 'big', cx: 915, cy: 225, s: 180, kind: 'big', key: 'w3-gear-kuning' },
    { id: 'a', cx: 830, cy: 305, s: 130, kind: 'small', key: 'w3-gear-biru' },
    { id: 'b', cx: 1000, cy: 305, s: 130, kind: 'small', key: 'w3-gear-merah' }
  ]
  var KINDS = ['logam', 'plastik', 'kertas']                // left to right on the machine
  var BIN = { logam: { cx: 360, key: 'w3-bin-logam', bale: 'w3-bale-logam', col: 'hijau', slot: 0 }, plastik: { cx: 503, key: 'w3-bin-plastik', bale: 'w3-bale-plastik', col: 'oranye', slot: 1 }, kertas: { cx: 646, key: 'w3-bin-kertas', bale: 'w3-bale-kertas', col: 'biru', slot: 2 } }
  var BINW = 150
  var BINH = 108
  var BINY = 386
  var ITEMS = [
    { id: 'koran', kind: 'kertas', key: 'w3-koran', name: 'Koran' },
    { id: 'gelas', kind: 'plastik', key: 'w3-gelas', name: 'Gelas' },
    { id: 'kaleng', kind: 'logam', key: 'w3-kaleng2', name: 'Kaleng' },
    { id: 'kardus', kind: 'kertas', key: 'w3-kardus', name: 'Kardus' },
    { id: 'botol', kind: 'plastik', key: 'w3-botol', name: 'Botol' },
    { id: 'kaleng2', kind: 'logam', key: 'w3-kaleng', name: 'Kaleng' }
  ]
  var IW = 150
  var IH = 130
  var FEED = { x0: 1110, x: 815, y: 342 }
  var SLOT = [{ fx: 0.04, fy: -0.36 }, { fx: 0.36, fy: -0.36 }, { fx: 0.68, fy: -0.36 }]
  var BLW = 96
  var BLH = 82

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var step0 = rs ? rs.step : 0
    var fitted = saved.fitted || {}                 // socket id -> gear id
    var nDone = saved.nDone || 0
    var arrived = false
    var busy = false
    var hd = null
    var cur = { x: HOME.x, y: HOME.y }
    var spinning = []
    function save () { api.persist({ fitted: fitted, nDone: nDone }) }
    if (step0 >= 1) SOCK.forEach(function (s, i) { fitted[s.id] = GEARS[i].id })
    if (step0 >= 2) nDone = ITEMS.length
    function nFit () { return Object.keys(fitted).length }

    // ---- sockets (ghost gears on the machine wall) and the gears on the platform
    var sockEls = {}
    SOCK.forEach(function (s) {
      var g = K.ghost(api, sc, s.key, s.cx - s.s / 2, s.cy - s.s / 2, s.s, s.s, false, true)
      g.setAttribute('data-sock', s.id)
      sockEls[s.id] = g
      if (fitted[s.id]) g.style.display = 'none'
    })
    var gearEls = {}
    function snapTo (el, g, s) {
      var k = s.s / g.size
      el.style.transform = 'translate(' + (s.cx - g.size / 2 - g.x) + 'px,' + (s.cy - g.size / 2 - g.y) + 'px) scale(' + k + ')'
    }
    function spinAll () {
      spinning.forEach(function (a) { a.cancel() })
      spinning = []
      if (api.reduced()) return
      GEARS.forEach(function (g, i) {
        var a = gearEls[g.id].firstChild
        if (a && a.animate) spinning.push(a.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(' + (i === 0 ? 360 : -360) + 'deg)' }], { duration: i === 0 ? 5200 : 3600, iterations: Infinity }))
      })
    }
    GEARS.forEach(function (g, i) {
      var c = api.at(sc, 'gearpiece', g.x, g.y, g.size, g.size, 'button')
      c.type = 'button'
      c.setAttribute('data-gear', g.id)
      c.setAttribute('aria-label', 'Gear ' + g.name)
      c.style.cssText += ';background:none;border:0;padding:0;z-index:7;cursor:grab;touch-action:none'
      api.art(c, g.key, 0, 0, g.size, g.size, '')
      gearEls[g.id] = c
      var sockId = null
      SOCK.forEach(function (s) { if (fitted[s.id] === g.id) sockId = s.id })
      if (sockId) { c.setAttribute('data-gone', '1'); c.style.pointerEvents = 'none'; snapTo(c, g, SOCK.filter(function (s) { return s.id === sockId })[0]) } else if (c.animate && !api.reduced()) c._bob = c.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-6px)' }, { transform: 'translateY(0)' }], { duration: 1800 + i * 200, iterations: Infinity, easing: 'ease-in-out' })
      var d = null
      c.addEventListener('pointerdown', function (ev) {
        if (api.step() !== 0 || busy || d || c.getAttribute('data-gone')) return
        api.touch()
        var r = B.toRef(ev.clientX, ev.clientY)
        d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, p: r }
        c.classList.remove('glow')
        c.style.zIndex = '30'
        try { c.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      })
      c.addEventListener('pointermove', function (ev) {
        if (!d || ev.pointerId !== d.id) return
        var r = B.toRef(ev.clientX, ev.clientY)
        d.p = r
        d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
        c.style.transform = 'translate(' + (r.x - d.x0) + 'px,' + (r.y - d.y0) + 'px) scale(1.06)'
      })
      function end (ev, cancel) {
        if (!d || ev.pointerId !== d.id) return
        var cu = d
        d = null
        c.style.zIndex = '7'
        var near = null
        var bd = 1e9
        SOCK.forEach(function (s) {
          if (fitted[s.id]) return
          var dd = Math.hypot(cu.p.x - s.cx, cu.p.y - s.cy)
          if (dd < 150 && dd < bd) { near = s; bd = dd }
        })
        if (!cancel && cu.moved > 10 && near) {
          if (near.kind === g.kind) { fit(g, c, near); return }
          api.warn(g.kind === 'big' ? L.tooBig : L.tooSmall)
          if (sockEls[near.id].animate && !api.reduced()) sockEls[near.id].animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 300 })
          SOCK.forEach(function (s) { if (!fitted[s.id] && s.kind === g.kind) K.glow(sockEls[s.id], 2800) })
        } else if (!cancel) api.warn(cu.moved > 10 ? L.noSocket : L.dragGear)
        api.tween({ x: cu.p.x - cu.x0, y: cu.p.y - cu.y0 }, { x: 0, y: 0 }, 280, function (t) { c.style.transform = 'translate(' + t.x + 'px,' + t.y + 'px)' }, function () { c.style.transform = '' })
      }
      c.addEventListener('pointerup', function (ev) { end(ev, false) })
      c.addEventListener('pointercancel', function (ev) { end(ev, true) })
      c.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
    })
    function fit (g, c, s) {
      fitted[s.id] = g.id
      c.setAttribute('data-gone', '1')
      c.style.pointerEvents = 'none'
      sockEls[s.id].style.display = 'none'
      api.sfx('bump')
      api.fx('gold-star', s.cx, s.cy, 150)
      if (c._bob) c._bob.cancel()
      snapTo(c, g, s)
      save()
      if (nFit() >= SOCK.length) {
        api.later(function () {
          spinAll()
          api.sfx('ok')
          api.fx('confetti', 915, 250, 320)
          api.warn(L.running)
          api.later(function () {
            K.ask(api, { custom: { id: 'm03-big', prompt: 'Gear mana yang paling besar?', choices: ['Kuning', 'Biru', 'Merah'], choicePics: ['assets/blippi/w3-gear-kuning.webp', 'assets/blippi/w3-gear-biru.webp', 'assets/blippi/w3-gear-merah.webp'], answer: 'Kuning', hint1: 'Bandingkan ukurannya. Yang paling lebar.' }, done: function () { api.later(function () { api.advance() }, 400) } })
          }, 1100)
        }, 500)
      } else api.warn(L.more)
    }
    if (step0 >= 1) spinAll()

    // ---- bins on the machine (tap targets with a count bubble)
    var bins = {}
    var badges = {}
    var counts = { logam: 0, plastik: 0, kertas: 0 }
    ITEMS.forEach(function (it, i) { if (i < nDone) counts[it.kind]++ })
    KINDS.forEach(function (k) {
      var b = BIN[k]
      var el = api.at(sc, 'bin', b.cx - BINW / 2, BINY, BINW, BINH, 'button')
      el.type = 'button'
      el.setAttribute('data-bin', k)
      el.setAttribute('aria-label', 'Kotak ' + k)
      el.style.cssText += ';background:none;border:0;padding:0;z-index:4;pointer-events:none;cursor:pointer;touch-action:manipulation'
      api.art(el, b.key, 0, 0, BINW, BINH, '')
      var bd = api.at(el, 'cnt', BINW - 40, -22, 54, 54)
      bd.style.cssText += ';border-radius:50%;background:#fff;border:5px solid #13318A;color:#13318A;font:900 30px/44px Fredoka,Nunito,sans-serif;text-align:center;display:none;z-index:2'
      bins[k] = el
      badges[k] = bd
      el.addEventListener('click', function () { tapBin(k) })
    })
    function setBadge (k) { badges[k].textContent = String(counts[k]); badges[k].style.display = counts[k] > 0 && api.step() < 2 ? 'block' : 'none' }
    KINDS.forEach(setBadge)

    // ---- the belt brings one thing at a time
    var itemEl = null
    function feed () {
      if (nDone >= ITEMS.length) return
      var it = ITEMS[nDone]
      itemEl = api.at(sc, 'litter', FEED.x0, FEED.y, IW, IH)
      itemEl.setAttribute('data-item', it.id)
      itemEl.setAttribute('data-kind', it.kind)
      itemEl.style.cssText += ';z-index:5;pointer-events:none'
      api.art(itemEl, it.key, 0, 0, IW, IH, '')
      busy = true
      var e = itemEl
      api.tween({ x: FEED.x0, y: FEED.y }, { x: FEED.x, y: FEED.y }, 900, function (p) { e.style.left = p.x + 'px' }, function () {
        busy = false
        if (e.animate && !api.reduced()) e._bob = e.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-5px)' }, { transform: 'translateY(0)' }], { duration: 1500, iterations: Infinity, easing: 'ease-in-out' })
        KINDS.forEach(function (k) { K.glow(bins[k], 2200) })
      })
    }
    function tapBin (k) {
      if (api.step() !== 1 || busy || !itemEl) return
      api.touch()
      var it = ITEMS[nDone]
      var bn = bins[k]
      if (k !== it.kind) {
        api.warn(it.name + ' itu ' + it.kind + '. Ketuk kotak ' + BIN[it.kind].col + ' ' + it.kind.toUpperCase() + '.')
        if (bn.animate && !api.reduced()) bn.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(0)' }], { duration: 300 })
        if (itemEl.animate && !api.reduced()) itemEl.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(12px)' }, { transform: 'translateX(0)' }], { duration: 260 })
        K.glow(bins[it.kind], 2800)
        return
      }
      busy = true
      var e = itemEl
      itemEl = null
      if (e._bob) e._bob.cancel()
      var tx = BIN[k].cx - IW / 2
      api.tween({ x: FEED.x, y: FEED.y }, { x: tx, y: BINY - 60 }, 520, function (p, kk) { e.style.left = p.x + 'px'; e.style.top = (p.y - Math.sin(kk * Math.PI) * 90) + 'px'; e.style.transform = 'scale(' + (1 - kk * 0.35) + ')' }, function () {
        if (e.parentNode) e.parentNode.removeChild(e)
        counts[k]++
        nDone++
        setBadge(k)
        api.sfx('bump')
        api.fx('dust', BIN[k].cx, BINY + BINH * 0.5, 110)
        if (bn.animate && !api.reduced()) bn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.1,.92)', offset: 0.4 }, { transform: 'scale(1)' }], { duration: 320 })
        save()
        busy = false
        if (nDone >= ITEMS.length) {
          api.later(function () {
            K.ask(api, { custom: { id: 'm03-sum', prompt: '2 kertas, 2 plastik, 2 logam. Berapa semuanya?', choices: ['4', '6', '8'], answer: '6', scene: { groups: [{ key: 'w3-koran', n: 2 }, { key: 'w3-gelas', n: 2 }, { key: 'w3-kaleng2', n: 2 }] }, hint1: 'Hitung: 2 dan 2 jadi 4, tambah 2 lagi.' }, done: function () { api.warn(L.sorted); api.later(function () { api.advance() }, 500) } })
          }, 500)
        } else { api.warn(L.next); api.later(feed, 400) }
      })
    }

    // ---- the recycling truck, Blippi at the wheel
    var truck = api.at(sc, '', 0, 0, TW, TH, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk daur ulang')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:6;touch-action:none;transform-origin:50% 100%;cursor:default'
    var tart = api.art(truck, 'veh-recycling-truck', 0, 0, TW, TH, '')
    tart.setAttribute('data-veh', 'recycling-truck')
    K.driver(truck, { x: 0.71, y: 0.27, w: 0.25, h: 0.22 })
    var shade = api.at(sc, 'shd', 0, 0, 290, 40)
    shade.style.zIndex = '5'
    function placeTruck (x, y, sq) {
      cur = { x: x, y: y }
      truck.style.transform = 'translate(' + (x - TW / 2) + 'px,' + (y - TH) + 'px) scale(' + TS + ',' + (TS * (sq || 1)) + ')'
      shade.style.transform = 'translate(' + (x - 145 * TS) + 'px,' + (y - 24) + 'px) scale(' + TS + ')'
    }
    placeTruck(HOME.x, HOME.y)
    var slots = {}
    KINDS.forEach(function (k) {
      var s = SLOT[BIN[k].slot]
      var g = K.ghost(api, truck, BIN[k].bale, s.fx * TW, s.fy * TH, BLW, BLH)
      g.setAttribute('data-bale-ghost', k)
      g.style.zIndex = '2'
      g.style.visibility = 'hidden'
      var real = api.at(truck, '', s.fx * TW, s.fy * TH, BLW, BLH)
      real.setAttribute('data-bale', k)
      real.style.cssText += ';pointer-events:none;z-index:3;display:none'
      api.art(real, BIN[k].bale, 0, 0, BLW, BLH, '')
      var nb = api.at(real, '', BLW - 34, -14, 44, 44)
      nb.style.cssText += ';border-radius:50%;background:#fff;border:4px solid #13318A;color:#13318A;font:900 26px/36px Fredoka,Nunito,sans-serif;text-align:center'
      nb.textContent = '2'
      slots[k] = { ghost: g, real: real }
    })

    // ---- step 3: hold to drive to the bins; they tip in one by one
    var goalG = null
    var u = 0
    var hold = false
    var raf = 0
    var lastT = 0
    function pathAt (v) { return { x: HOME.x + (DEST.x - HOME.x) * v, y: HOME.y + (DEST.y - HOME.y) * v - Math.sin(v * Math.PI) * 14 } }
    function drive (now) {
      if (!hold || arrived) return
      var dt = Math.min(50, now - lastT)
      lastT = now
      u = Math.min(1, u + dt / 2400)
      var p = pathAt(u)
      placeTruck(p.x, p.y + Math.sin(now / 70) * 1.2)
      if (u >= 1) { hold = false; arrive(); return }
      raf = requestAnimationFrame(drive)
    }
    function arrive () {
      if (arrived) return
      arrived = true
      hold = false
      cancelAnimationFrame(raf)
      if (goalG) goalG.style.display = 'none'
      placeTruck(DEST.x, DEST.y)
      api.sfx('bump')
      api.fx('dust', DEST.x - 100, DEST.y, 150)
      var i = 0
      function nextBin () {
        if (i >= KINDS.length) { finish(); return }
        var k = KINDS[i++]
        var b = BIN[k]
        var fly = api.at(sc, 'binfly', b.cx - BINW / 2, BINY, BINW, BINH)
        fly.style.cssText += ';z-index:9;pointer-events:none;transform-origin:50% 50%'
        api.art(fly, b.key, 0, 0, BINW, BINH, '')
        bins[k].style.visibility = 'hidden'
        badges[k].style.display = 'none'
        var hop = { x: DEST.x - TW * TS * 0.18 - BINW / 2, y: DEST.y - TH * TS - 70 }
        var from = { x: b.cx - BINW / 2, y: BINY }
        api.tween(from, { x: hop.x, y: hop.y - 30 }, 420, function (p) { fly.style.transform = 'translate(' + (p.x - from.x) + 'px,' + (p.y - from.y) + 'px)' }, function () {
          api.tween({ x: hop.x, y: hop.y - 30 }, { x: hop.x, y: hop.y + 30 }, 330, function (p, kk) { fly.style.transform = 'translate(' + (p.x - from.x) + 'px,' + (p.y - from.y) + 'px) rotate(' + (kk * 100) + 'deg) scale(' + (1 - kk * 0.4) + ')' }, function () {
            if (fly.parentNode) fly.parentNode.removeChild(fly)
            bins[k].style.visibility = 'visible'
            slots[k].ghost.style.display = 'none'
            slots[k].real.style.display = 'block'
            K.land(api, slots[k].real)
            api.sfx('bump')
            api.fx('dust', hop.x + BINW / 2, hop.y + 30, 120)
            api.tween({ x: 0.82, y: 0 }, { x: 1, y: 0 }, 380, function (p) { placeTruck(cur.x, cur.y, p.x) })
            api.later(nextBin, 450)
          })
        })
      }
      nextBin()
    }
    function finish () {
      api.sfx('ok')
      api.fx('confetti', DEST.x, DEST.y - 200, 340)
      save()
      api.warn(L.loaded)
      api.later(function () { K.ask(api, { context: 'gate', grade: 1, topic: 'matematika', done: function () { api.later(function () { api.advance() }, 300) } }) }, 800)
    }
    truck.addEventListener('pointerdown', function (ev) {
      if (busy) return
      var s = api.step()
      api.touch()
      if (s < 2) { api.warn(s === 0 ? L.fixFirst : L.sortFirst); return }
      if (arrived) return
      try { truck.setPointerCapture(ev.pointerId) } catch (e) { /* synthetic */ }
      hold = true; lastT = performance.now(); api.sfx('honk'); raf = requestAnimationFrame(drive)
    })
    function release () { if (hold) { hold = false; cancelAnimationFrame(raf); if (!arrived && u < 1) api.warn(L.holdMore) } }
    truck.addEventListener('pointerup', release)
    truck.addEventListener('pointercancel', release)
    truck.addEventListener('lostpointercapture', release)

    function firstGear () { var g = null; GEARS.forEach(function (x) { if (!g && !gearEls[x.id].getAttribute('data-gone')) g = x }); return g }
    function socketFor (g) { var r = null; SOCK.forEach(function (s) { if (!r && !fitted[s.id] && s.kind === g.kind) r = s }); return r }

    var ctl = {
      onStep: function (n) {
        GEARS.forEach(function (g) { var c = gearEls[g.id]; c.style.pointerEvents = n === 0 && !c.getAttribute('data-gone') ? 'auto' : 'none'; c.classList.remove('glow') })
        KINDS.forEach(function (k) { bins[k].style.pointerEvents = n === 1 ? 'auto' : 'none'; setBadge(k) })
        truck.style.cursor = n === 2 ? 'grab' : 'default'
        if (n === 0) GEARS.forEach(function (g) { if (!gearEls[g.id].getAttribute('data-gone')) gearEls[g.id].classList.add('glow') })
        if (n === 1) { if (!itemEl) api.later(feed, 400) }
        if (n === 2) {
          KINDS.forEach(function (k) { slots[k].ghost.style.visibility = 'visible' })
          if (!goalG) { goalG = K.ghost(api, sc, 'veh-recycling-truck', DEST.x - TW * TS / 2, DEST.y - TH * TS, TW * TS, TH * TS, false, true); goalG.setAttribute('data-goal', '1') }
          K.glow(truck, 3200)
        }
      },
      onTool: function () {},
      demo: function (n) {
        if (!hd) hd = K.hand(api)
        if (n === 0) { var g = firstGear(); if (g) { var s = socketFor(g); hd.move([{ x: g.x + g.size / 2 - 30, y: g.y + g.size / 2 - 30 }, { x: s.cx - 30, y: s.cy - 30 }], 1200) } }
        else if (n === 1 && ITEMS[nDone]) { var b = BIN[ITEMS[nDone].kind]; hd.move([{ x: FEED.x + 60, y: FEED.y + 40 }, { x: b.cx - 30, y: BINY + 30 }], 1100) }
        else hd.move([{ x: cur.x - 30, y: cur.y - 130 }, { x: cur.x - 30, y: cur.y - 130 }], 2200)
      },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          var g = firstGear()
          if (!g) return
          K.glow(gearEls[g.id], 3000)
          var so = socketFor(g)
          if (lvl >= 2 && so) K.glow(sockEls[so.id], 3000)
          if (lvl >= 4 && so) fit(g, gearEls[g.id], so)
        } else if (s === 1) {
          var it = ITEMS[nDone]
          if (!it) return
          K.glow(bins[it.kind], 3000)
          if (lvl >= 4 && !busy) tapBin(it.kind)
        } else {
          K.glow(truck, 3000)
          if (lvl >= 4 && !arrived) { placeTruck(DEST.x, DEST.y); arrive() }
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { hold = false; cancelAnimationFrame(raf) }
    }
    save()
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W03-M03', mod)
})(window)
