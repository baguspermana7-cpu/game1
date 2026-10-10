/* G32 Blippi -- W01-M04 "Jembatan untuk Semua" (PRD 12.1: Build & Use; length, fit, order), played INSIDE bg-w01-m04-jembatan.
 * 1 PILIH: choose how to cross the 235px gap. LONG beam reaches. SHORT beam does not (a kind preview shows how far it gets); two SHORT beams + the post in the middle also work.
 * 2 PASANG: drag (or tap-then-tap) each piece to its dashed socket, in any order. A miss floats back, nothing is lost.
 * 3 LEWATI: the dump truck crosses the bridge the child built. Before the bridge exists the truck stops at the bank. */
(function (w) {
  'use strict'
  var K = w.BlippiKit
  var GAP = { l: 760, r: 995 }
  var DECK = 330                       // y of the beam's top edge once laid (art is rotated level)
  var PIECE = {
    long: { key: 'pc-beam-long', w: 340, h: 131, sock: { x: 708, y: DECK - 6 } },
    short: { key: 'pc-beam-short', w: 200, h: 84 },
    post: { key: 'pc-post', w: 66, h: 95 }
  }
  var SOCKS = {
    long: [{ id: 'span', type: 'long', x: 708, y: DECK - 6, w: 340, h: 131 }],
    short: [{ id: 'post', type: 'post', x: 845, y: 408, w: 66, h: 95 }, { id: 'sl', type: 'short', x: 700, y: DECK + 2, w: 200, h: 84 }, { id: 'sr', type: 'short', x: 862, y: DECK + 2, w: 200, h: 84 }]
  }
  var TRUCK = { w: 250, h: 180, y: 395, x0: 1300, x1: 330 }
  var CARDS = { x: 24, y: 452, w: 436, h: 226 }

  var mod = { mount: function (api) {
    var B = api.B
    var sc = api.scene
    var L = api.lines
    var saved = api.data() || {}
    var rs = api.restore
    var plan = saved.plan || null
    var placed = saved.placed || []
    var triedShort = !!saved.triedShort
    var sel = null
    var busy = false
    var cardEls = {}
    var socks = {}
    var preview = null
    var hand = K.hand(api)

    function save () { api.persist({ plan: plan, placed: placed, triedShort: triedShort }) }

    // ---- the truck (always waiting on the right bank)
    var truck = api.at(sc, '', 0, 0, TRUCK.w, TRUCK.h, 'button')
    truck.type = 'button'
    truck.setAttribute('data-truck', '1')
    truck.setAttribute('aria-label', 'Truk')
    truck.style.cssText += ';background:none;border:0;padding:0;z-index:8;cursor:pointer;transform-origin:50% 100%'
    api.art(truck, 'veh-dump-truck', 0, 0, TRUCK.w, TRUCK.h, '')
    var shade = api.at(sc, 'shd', 0, 0, TRUCK.w - 30, 40)
    shade.style.zIndex = '7'
    function setTruck (x, y, s) {
      s = s || 1
      truck.style.transform = 'translate(' + (x - TRUCK.w / 2) + 'px,' + (y - TRUCK.h) + 'px) scale(' + s + ')'
      shade.style.transform = 'translate(' + (x - TRUCK.w / 2 + 16) + 'px,' + (y - 22) + 'px) scale(' + s + ')'
    }
    setTruck(TRUCK.x0, TRUCK.y)
    truck.addEventListener('click', function () { onTruck() })

    // ---- the pieces panel
    var panel = api.at(sc, 'panel', CARDS.x, CARDS.y, CARDS.w, CARDS.h)
    panel.setAttribute('data-pieces', '1')
    panel.style.zIndex = '6'
    function renderCards () {
      panel.innerHTML = ''
      cardEls = {}
      var list
      if (api.step() === 0) list = [{ k: 'short', n: 'PENDEK' }, { k: 'long', n: 'PANJANG' }, { k: 'post', n: 'TIANG' }]
      else if (plan === 'long') list = [{ k: 'long', n: 'PANJANG' }]
      else list = [{ k: 'short', n: 'PENDEK', c: 2 }, { k: 'post', n: 'TIANG', c: 1 }]
      var cw = list.length === 3 ? 132 : (list.length === 2 ? 190 : 260)
      var gap = list.length === 3 ? 12 : 24
      var x0 = (CARDS.w - (cw * list.length + gap * (list.length - 1))) / 2
      list.forEach(function (it, i) {
        var left = left0(it.k)
        var c = api.at(panel, 'pcard', x0 + i * (cw + gap) - 7, 16, cw, CARDS.h - 40, 'button')
        c.type = 'button'
        c.setAttribute('data-piece', it.k)
        c.setAttribute('aria-label', 'Bagian ' + it.n.toLowerCase())
        c.style.cssText += ';background:rgba(255,255,255,.75);border:3px solid #E3C98A;border-radius:22px;cursor:pointer;padding:0;touch-action:none;overflow:visible'
        var pw = it.k === 'short' ? (list.length === 3 ? 84 : cw - 60) : (it.k === 'long' ? (list.length === 3 ? 114 : cw - 18) : cw * 0.4)
        var ph = pw * PIECE[it.k].h / PIECE[it.k].w
        var a = api.art(c, PIECE[it.k].key, (cw - pw) / 2, 22 + (it.k === 'post' ? 0 : 36), pw, ph, '')
        void a
        var lb = api.at(c, '', 0, CARDS.h - 94, cw, 40)
        lb.style.cssText += ';font:900 24px/40px Fredoka,Nunito,sans-serif;color:#13318A;text-align:center'
        lb.textContent = it.n + (api.step() === 1 && it.k !== 'long' ? (it.k === 'short' ? ' x' + remaining('short') : '') : '')
        var gone = api.step() === 1 && left <= 0
        if (gone) { c.style.opacity = '0.28'; c.style.pointerEvents = 'none' }
        cardEls[it.k] = c
        wire(c, it.k)
      })
    }
    function left0 (k) {
      if (api.step() === 0) return 1
      var n = 0
      SOCKS[plan || 'long'].forEach(function (s) { if (s.type === k && placed.indexOf(s.id) < 0) n++ })
      return n
    }
    function remaining (k) { return left0(k) }

    function wire (c, k) {
      K.dragCard(api, c, {
        enabled: function () { return !busy && (api.step() === 0 || api.step() === 1) },
        make: function (parent) { return floater(parent, k) },
        home: function () { var r = c.getBoundingClientRect(); var p = api.toRef(r.left, r.top); return { x: p.x + 20, y: p.y + 30 } },
        tap: function () { tapCard(k) },
        drop: function (pt) { return dropPiece(k, pt) },
        onMiss: function () { if (api.step() === 1) { api.warn(L.miss); SOCKS[plan].forEach(function (z) { if (z.type === k && socks[z.id]) K.glow(socks[z.id], 2400) }) } }
      })
    }
    function floater (parent, k) {
      var f = api.at(parent, '', 0, 0, PIECE[k].w, PIECE[k].h)
      api.art(f, PIECE[k].key, 0, 0, PIECE[k].w, PIECE[k].h, '')
      f.style.filter = 'drop-shadow(0 12px 10px rgba(20,30,60,.35))'
      return f
    }

    // ---- sockets (step 2) and the built pieces
    function buildSockets () {
      Object.keys(socks).forEach(function (k) { if (socks[k].parentNode) socks[k].parentNode.removeChild(socks[k]) })
      socks = {}
      if (!plan) return
      SOCKS[plan].forEach(function (s) {
        if (placed.indexOf(s.id) >= 0) return
        socks[s.id] = K.socket(api, sc, s.x, s.y, s.w, s.h, s.id)
        if (api.step() !== 1) socks[s.id].style.opacity = '0'
      })
    }
    function installed (s, animate) {
      var p = api.art(sc, PIECE[s.type].key, s.x, s.y, s.w, s.h, 'built')
      p.setAttribute('data-built', s.id)
      p.style.zIndex = s.type === 'post' ? '3' : '5'
      p.style.pointerEvents = 'none'
      if (s.type !== 'post') p.style.transform = 'rotate(9deg)'
      if (animate) K.land(api, p)
    }
    function drawBuilt () { if (plan) SOCKS[plan].forEach(function (s) { if (placed.indexOf(s.id) >= 0) installed(s, false) }) }

    function nearest (type, pt, maxd) {
      var best = null
      var bd = 1e9
      SOCKS[plan].forEach(function (s) {
        if (s.type !== type || placed.indexOf(s.id) >= 0) return
        var d = Math.sqrt(Math.pow(pt.x - (s.x + s.w / 2), 2) + Math.pow(pt.y - (s.y + s.h / 2), 2))
        if (d < bd && d <= maxd) { bd = d; best = s }
      })
      return best
    }
    function place (s) {
      placed = placed.concat([s.id])
      if (socks[s.id] && socks[s.id].parentNode) socks[s.id].parentNode.removeChild(socks[s.id])
      delete socks[s.id]
      installed(s, true)
      api.sfx('bump')
      api.fx('dust', s.x + s.w / 2, s.y + s.h, 160)
      sel = null
      save()
      renderCards()
      if (placed.length >= SOCKS[plan].length) {
        api.warn(L.built)
        api.fx('gold-star', 878, 330, 220)
        api.later(function () { api.advance() }, 900)
      } else api.warn(L.placed)
    }
    function dropPiece (k, pt) {
      if (api.step() !== 1) return false
      if (api.tool() !== 'sambung') { api.warn(L.wrongTool); api.shakeTool('sambung'); return false }
      var s = nearest(k, pt, 150)
      if (s) { place(s); return true }
      // a piece dropped on a socket of another kind: say why, kindly
      var other = null
      SOCKS[plan].forEach(function (z) { if (z.type !== k && placed.indexOf(z.id) < 0 && K.within(pt, z.x + z.w / 2, z.y + z.h / 2, 110)) other = z })
      if (other) api.warn(L.wrongSpot)
      return false
    }
    function tapCard (k) {
      var s = api.step()
      if (s === 0) return choose(k)
      if (s !== 1) return
      if (api.tool() !== 'sambung') { api.warn(L.wrongTool); api.shakeTool('sambung'); return }
      sel = k
      Object.keys(cardEls).forEach(function (c) { cardEls[c].style.borderColor = c === k ? '#FF8A1F' : '#E3C98A' })
      SOCKS[plan].forEach(function (z) { if (z.type === k && socks[z.id]) K.glow(socks[z.id], 2600) })
    }

    // ---- step 1: choose
    function showPreview () {
      clearPreview()
      var f = api.at(sc, '', 700, DECK + 2, 200, 84)
      f.style.cssText += ';z-index:4;pointer-events:none;opacity:.8;transform:rotate(9deg)'
      api.art(f, 'pc-beam-short', 0, 0, 200, 84, '')
      var miss = api.at(sc, '', 893, DECK + 28, 105, 36)
      miss.style.cssText += ';z-index:4;pointer-events:none;border:5px dashed #E8451E;border-radius:14px;background:rgba(232,69,30,.2)'
      preview = [f, miss]
      api.later(clearPreview, 3600)
    }
    function clearPreview () { if (preview) { preview.forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e) }); preview = null } }
    function choose (k) {
      if (api.tool() !== 'balok') { api.warn(L.wrongTool); api.shakeTool('balok'); return }
      api.touch()
      if (k === 'long') {
        plan = 'long'
        api.sfx('ok')
        cardEls.long.classList.add('bounce')
        api.warn(L.planLong)
        save()
        api.later(function () { api.advance() }, 900)
      } else if (k === 'short') {
        triedShort = true
        showPreview()
        api.sfx('bump')
        api.warn(L.short)
        K.glow(cardEls.post, 3000)
        K.glow(cardEls.long, 3000)
        save()
      } else {
        if (!triedShort) { api.warn(L.postFirst); return }
        plan = 'short'
        api.sfx('ok')
        cardEls.post.classList.add('bounce')
        api.warn(L.planShort)
        save()
        api.later(function () { api.advance() }, 900)
      }
    }

    // ---- step 3: cross (or stop at the bank when the bridge is not there yet)
    function onTruck () {
      if (busy) return
      api.touch()
      var s = api.step()
      if (s < 2) {
        // acceptance: the truck stops BEFORE the gap while the structure is not valid
        busy = true
        api.sfx('honk')
        api.tween({ x: TRUCK.x0, y: 0 }, { x: 1150, y: 0 }, 420, function (p) { setTruck(p.x, TRUCK.y) }, function () {
          api.tween({ x: 1150, y: 0 }, { x: TRUCK.x0, y: 0 }, 420, function (p) { setTruck(p.x, TRUCK.y) }, function () { busy = false })
        })
        api.warn(L.wait)
        return
      }
      if (api.tool() !== 'lewat') { api.warn(L.wrongTool); api.shakeTool('lewat'); return }
      busy = true
      api.sfx('honk')
      api.fx('dust', TRUCK.x0, TRUCK.y, 170)
      api.tween({ x: TRUCK.x0, y: TRUCK.y }, { x: TRUCK.x1, y: 372 }, 2800, function (p) { setTruck(p.x, p.y, 1 - (TRUCK.y - p.y) / 230) }, function () {
        api.sfx('ok')
        api.fx('confetti', TRUCK.x1 + 40, 300, 320)
        api.later(function () { busy = false; save(); api.advance() }, 900)
      })
    }

    // ---- init from a saved game
    renderCards()
    buildSockets()
    drawBuilt()
    if (rs && rs.step >= 2) { /* bridge is whole after a reload */ }

    var ctl = {
      onStep: function (n) {
        sel = null
        if (n === 1) {
          renderCards()
          buildSockets()
          SOCKS[plan].forEach(function (z) { if (socks[z.id]) socks[z.id].style.opacity = '1' })
          panel.classList.remove('glowpanel')
        }
        if (n === 2) { panel.style.display = 'none'; K.glow(truck, 3000) }
        if (n === 0) renderCards()
      },
      onTool: function () {},
      demo: function () { ctl.hint(1); ctl.hint(3) },
      hint: function (lvl) {
        var s = api.step()
        if (s === 0) {
          if (api.tool() !== 'balok') api.glowTool('balok', 3000)
          if (lvl === 1) { K.glow(cardEls.long, 3000); K.glow(cardEls.short, 3000) }
          else if (lvl === 2) { showPreview(); K.glow(cardEls.long, 3000) }
          else if (lvl === 3) { var lr = cardEls.long.getBoundingClientRect(); var lp = api.toRef(lr.left + lr.width / 2, lr.top + lr.height / 2); hand.move([{ x: lp.x - 30, y: lp.y - 70 }, { x: lp.x - 30, y: lp.y - 86 }, { x: lp.x - 30, y: lp.y - 70 }], 450) }
          else if (api.tool() === 'balok') choose('long')
        } else if (s === 1) {
          var order = ['post', 'span', 'sl', 'sr']
          var next = null
          order.forEach(function (id) { if (!next && socks[id]) next = socks[id] })
          if (!next) return
          if (api.tool() !== 'sambung') api.glowTool('sambung', 3000)
          var z = null
          SOCKS[plan].forEach(function (q) { if (!z && socks[q.id] === next) z = q })
          if (lvl === 1) K.glow(next, 3000)
          else if (lvl === 2) { next.style.background = 'rgba(255,196,64,.5)'; K.glow(cardEls[z.type], 3000); setTimeout(function () { if (next) next.style.background = 'rgba(255,196,64,.18)' }, 3000) }
          else if (lvl === 3) { var cr = cardEls[z.type].getBoundingClientRect(); var cp = api.toRef(cr.left + cr.width / 2, cr.top + cr.height / 2); hand.move([{ x: cp.x - 30, y: cp.y - 30 }, { x: z.x + z.w / 2 - 40, y: z.y + z.h / 2 - 40 }], 800) }
          else if (api.tool() === 'sambung') place(z)
        } else {
          if (api.tool() !== 'lewat') api.glowTool('lewat', 3000)
          K.glow(truck, 3000)
          if (lvl === 3) hand.move([{ x: TRUCK.x0 - 40, y: TRUCK.y - 120 }, { x: TRUCK.x0 - 40, y: TRUCK.y - 136 }, { x: TRUCK.x0 - 40, y: TRUCK.y - 120 }], 450)
          if (lvl >= 4 && api.tool() === 'lewat') onTruck()
        }
      },
      win: function () { api.sfx('ok') },
      destroy: function () { busy = false }
    }
    api.persist({ plan: plan, placed: placed, triedShort: triedShort })
    return ctl
  } }
  if (w.BlippiMissionRegister) w.BlippiMissionRegister('W01-M04', mod)
})(window)
