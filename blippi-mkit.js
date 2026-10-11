/* G32 Blippi -- shared mission kit. Small helpers every part2 mission module reuses (drag-with-snap, tap-or-drag cards, dashed sockets, the guide hand).
 * Nothing here knows a mission: it is plumbing so each mission file stays "a small module on the template". All coordinates are the 1672x941 reference stage. */
(function (w) {
  'use strict'

  function glow (el, ms) {
    if (!el) return
    el.classList.add('glow')
    setTimeout(function () { if (el) el.classList.remove('glow') }, ms || 2600)
  }

  // a dashed outline where a piece goes (the "bergaris" spot the kind lines talk about)
  function socket (api, parent, x, y, wd, ht, id) {
    var s = api.at(parent, 'skt', x, y, wd, ht)
    s.setAttribute('data-socket', id)
    s.style.cssText += ';border:5px dashed #FF8A1F;border-radius:18px;background:rgba(255,196,64,.18);pointer-events:none;z-index:3;transition:opacity .25s'
    return s
  }

  // the guide hand (hint rung 3): moves along points, never completes the action by itself
  function hand (api) {
    var g = api.at(api.scene, 'ghost', 0, 0, 90, 90)
    g.innerHTML = api.B.ICON.hand
    g.style.zIndex = '40'
    return {
      el: g,
      move: function (pts, ms, cb) {
        g.style.opacity = '1'
        var i = 0
        function leg () {
          if (i >= pts.length - 1) { g.style.opacity = '0'; if (cb) cb(); return }
          api.tween(pts[i], pts[i + 1], ms, function (p) { g.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)' }, function () { i++; leg() })
        }
        g.style.transform = 'translate(' + pts[0].x + 'px,' + pts[0].y + 'px)'
        leg()
      }
    }
  }

  // tap OR drag on a card: tap -> o.tap(); drag -> a floating copy follows the finger, o.drop(pt) returns true when the piece was taken.
  // o.make(parent) builds the floating copy; o.enabled() gates the whole gesture.
  function dragCard (api, card, o) {
    var d = null
    card.style.touchAction = 'none'
    card.addEventListener('pointerdown', function (ev) {
      if (d || (o.enabled && !o.enabled())) return
      api.touch()
      var r = api.toRef(ev.clientX, ev.clientY)
      d = { id: ev.pointerId, x0: r.x, y0: r.y, moved: 0, fl: null }
      try { card.setPointerCapture(ev.pointerId) } catch (e) { /* ignore */ }
    })
    card.addEventListener('pointermove', function (ev) {
      if (!d || ev.pointerId !== d.id) return
      var r = api.toRef(ev.clientX, ev.clientY)
      d.moved = Math.max(d.moved, Math.abs(r.x - d.x0) + Math.abs(r.y - d.y0))
      if (d.moved > 14 && !d.fl) { d.fl = o.make(api.scene); d.fl.style.zIndex = '30'; d.fl.style.pointerEvents = 'none'; if (o.onLift) o.onLift() }
      if (d.fl) d.fl.style.transform = 'translate(' + (r.x - d.fl.offsetWidth / 2) + 'px,' + (r.y - d.fl.offsetHeight / 2) + 'px)'
    })
    function end (ev, cancel) {
      if (!d || ev.pointerId !== d.id) return
      var cur = d
      d = null
      var r = api.toRef(ev.clientX, ev.clientY)
      if (!cur.fl) { if (!cancel && o.tap) o.tap(); return }
      var took = !cancel && o.drop(r)
      var fl = cur.fl
      if (took) { if (fl.parentNode) fl.parentNode.removeChild(fl); return }
      // not taken: float back to the card (never lost, never a penalty)
      if (o.onMiss && !cancel) o.onMiss(r)
      var from = { x: r.x - fl.offsetWidth / 2, y: r.y - fl.offsetHeight / 2 }
      var to = o.home()
      api.tween(from, to, 260, function (p) { fl.style.transform = 'translate(' + p.x + 'px,' + p.y + 'px)' }, function () { if (fl.parentNode) fl.parentNode.removeChild(fl) })
    }
    card.addEventListener('pointerup', function (ev) { end(ev, false) })
    card.addEventListener('pointercancel', function (ev) { end(ev, true) })
    card.addEventListener('lostpointercapture', function (ev) { end(ev, true) })
  }

  function within (p, x, y, r) { var dx = p.x - x; var dy = p.y - y; return dx * dx + dy * dy <= r * r }

  // a piece lands: drops in from above with a soft overshoot (skipped under reduced motion)
  function land (api, el) {
    if (el.animate && !api.reduced()) el.animate([{ transform: 'translateY(-70px)', opacity: 0 }, { transform: 'translateY(6px)', opacity: 1, offset: 0.6 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 380, easing: 'cubic-bezier(.23,1,.32,1)' })
  }


  /* ---------- water that reads as water (shared by every water mission) ----------
   * waterPath: a channel with a dark body, a light edge and a moving sheen (a dashed highlight that travels along it); setProgress reveals it from the source.
   * waterBody: a basin/pond surface that rises (rx/ry scale), with a meniscus highlight arc and a slow ripple ring; ripple() drops a splash ring where a channel enters. */
  var NS = 'http://www.w3.org/2000/svg'
  var wid = 0
  function waterStyle (svg) {
    if (svg.getAttribute('data-wstyle')) return
    svg.setAttribute('data-wstyle', '1')
    var st = document.createElementNS(NS, 'style')
    st.textContent = '@keyframes kflow{to{stroke-dashoffset:-48}}@keyframes krip{0%{transform:scale(.25);opacity:.9}100%{transform:scale(1.5);opacity:0}}' +
      '.kflow{animation:kflow .75s linear infinite}.krip{transform-box:fill-box;transform-origin:center;animation:krip .9s ease-out forwards}' +
      '@media (prefers-reduced-motion:reduce){.kflow{animation:none}.krip{animation:none;opacity:0}}'
    svg.appendChild(st)
  }
  function waterPath (svg, d, width) {
    waterStyle(svg)
    var id = 'kw' + (++wid)
    var defs = document.createElementNS(NS, 'defs')
    defs.innerHTML = '<mask id="' + id + '" maskUnits="userSpaceOnUse" x="0" y="0" width="1672" height="941"><path d="' + d + '" fill="none" stroke="#fff" stroke-width="' + (width + 12) + '" stroke-linecap="round" stroke-linejoin="round" class="kmask"/></mask>'
    var g = document.createElementNS(NS, 'g')
    g.setAttribute('mask', 'url(#' + id + ')')
    g.style.opacity = '0'
    g.innerHTML = '<path d="' + d + '" fill="none" stroke="#2F8FD8" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#7CCBF5" stroke-width="' + (width - 7) + '" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="' + d + '" fill="none" stroke="#D6F2FF" stroke-width="' + Math.max(3, width / 6) + '" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="16 32" class="kflow"/>'
    svg.appendChild(defs)
    svg.appendChild(g)
    var mk = defs.querySelector('.kmask')
    var len = mk.getTotalLength()
    return {
      len: len,
      set: function (p) {
        mk.setAttribute('stroke-dasharray', (len * p) + ' ' + (len + 40))
        g.style.opacity = p > 0.001 ? '0.96' : '0'
      }
    }
  }
  function waterBody (svg, cx, cy, rx, ry) {
    waterStyle(svg)
    var g = document.createElementNS(NS, 'g')
    g.style.opacity = '0'
    g.innerHTML = '<ellipse class="kb" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="#3FA9E6"/>' +
      '<ellipse class="ki" cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="none" stroke="#B9E8FF" stroke-width="5" opacity=".85"/>' +
      '<path class="km" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/>'
    svg.appendChild(g)
    var b = g.querySelector('.kb')
    var i = g.querySelector('.ki')
    var m = g.querySelector('.km')
    return {
      el: g,
      set: function (v, full) {
        var k = 0.1 + 0.9 * v
        var x = full ? full.rx * k : rx * k
        var y = full ? full.ry * k : ry * k
        ;[b, i].forEach(function (e) { e.setAttribute('rx', String(x)); e.setAttribute('ry', String(y)) })
        // meniscus: a bright arc along the upper-left rim
        m.setAttribute('d', 'M' + (cx - x * 0.72) + ',' + (cy - y * 0.42) + ' Q' + (cx - x * 0.3) + ',' + (cy - y * 0.9) + ' ' + (cx + x * 0.25) + ',' + (cy - y * 0.88))
        g.style.opacity = v > 0 ? '1' : '0'
        g.setAttribute('data-level', v.toFixed(2))
      }
    }
  }
  function ripple (svg, x, y, r) {
    waterStyle(svg)
    var e = document.createElementNS(NS, 'ellipse')
    e.setAttribute('cx', String(x)); e.setAttribute('cy', String(y)); e.setAttribute('rx', String(r || 40)); e.setAttribute('ry', String((r || 40) * 0.32))
    e.setAttribute('fill', 'none'); e.setAttribute('stroke', '#EAF8FF'); e.setAttribute('stroke-width', '4')
    e.setAttribute('class', 'krip')
    svg.appendChild(e)
    setTimeout(function () { if (e.parentNode) e.parentNode.removeChild(e) }, 1000)
  }

  /* ---------- reset hooks (owner 2026-10-11) ---------- */
  var LIB = '../Dunia-Emosi/assets/db/lib/'
  var K = { glow: glow }
  var stats = { asked: 0, correct: 0, log: [] }
  function speak (api, t) {
    try { if (api.B.state().sound && w.speechSynthesis) { w.speechSynthesis.cancel(); var u = new w.SpeechSynthesisUtterance(t); u.lang = 'id-ID'; u.rate = 0.9; w.speechSynthesis.speak(u) } } catch (e) { /* optional */ }
  }
  // K.ask(api, o): a question that is PART of the job, answered by tapping big picture/number cards.
  //   o.custom = {prompt, choices[], answer, pic?, count?:{key,n}}  (a question about THIS scene, e.g. "Berapa kotak?")  OR  o.context/o.grade -> SoalEngine.pick({game:'blippi'})
  //   o.done(ok) fires when answered (right, or after 2 kind tries the answer is shown and we go on: never a dead end).
  function ask (api, o) {
    var q = o.custom
    if (!q) {
      var SE = w.SoalEngine
      var got = SE && SE.pick({ game: 'blippi', context: o.context || 'gate', avatar: 'auto', count: 1, grade: o.grade || 1, topic: o.topic, exclude: stats.log.slice(-40) })
      q = got && got[0]
      if (!q) { if (o.done) o.done(true); return null }
    }
    var id = q.id || ('c-' + q.prompt)
    stats.log.push(id)
    stats.asked++
    var ov = api.at(api.scene, 'askov', 0, 0, 1672, 941)
    ov.setAttribute('data-ask', '1')
    ov.style.cssText += ';z-index:60;background:rgba(10,30,70,.45);pointer-events:none'
    var card = api.at(ov, 'panel', 366, 150, 940, 560)
    card.style.zIndex = '1'
    card.style.pointerEvents = 'auto'
    var pr = api.at(card, '', 30, 18, 880, 120)
    pr.style.cssText += ';font:900 40px/1.15 Nunito,sans-serif;color:#13318A;text-align:center;display:flex;align-items:center;justify-content:center'
    pr.textContent = q.prompt
    pr.setAttribute('data-ask-prompt', '1')
    // the picture of what is being counted / asked about
    if (q.count) {
      var row = api.at(card, '', 30, 140, 880, 110)
      row.style.cssText += ';display:flex;gap:14px;justify-content:center;align-items:center'
      var i
      for (i = 0; i < q.count.n; i++) { var c = document.createElement('div'); c.style.cssText = 'position:relative;width:96px;height:96px;flex:0 0 auto'; api.B.A.fill(c, q.count.key); row.appendChild(c) }
    } else if (q.scene && q.scene.groups && q.scene.groups.length) {
      // the engine's picture of the sum: every group as that many icons ('leave' ones faded and crossed out),
      // '+' between added groups - a counting question must SHOW what is counted (one icon for 'berapa?' was wrong)
      var gs = q.scene.groups, total = 0
      gs.forEach(function (g) { total += g.n })
      var sz = Math.max(40, Math.min(110, Math.floor(820 / Math.max(1, total + (gs.length - 1)) - 8)))
      var row2 = api.at(card, '', 30, 136, 880, 120)
      row2.setAttribute('data-ask-pics', String(total))
      row2.style.cssText += ';display:flex;flex-wrap:wrap;gap:6px;justify-content:center;align-items:center;align-content:center'
      gs.forEach(function (g, gi) {
        if (gi > 0 && g.role !== 'leave') { var plus = document.createElement('b'); plus.textContent = '+'; plus.style.cssText = 'font:900 ' + Math.round(sz * 0.6) + 'px Nunito,sans-serif;color:#F4761A;margin:0 6px'; row2.appendChild(plus) }
        for (var j = 0; j < g.n; j++) {
          var ic = new Image(); ic.alt = ''; ic.src = /^(w3-|veh-|pc2-)/.test(g.key) ? 'assets/blippi/' + g.key + '.webp' : LIB + g.key + '.webp'
          ic.style.cssText = 'width:' + sz + 'px;height:' + sz + 'px;object-fit:contain;flex:0 0 auto' + (g.role === 'leave' ? ';opacity:.35;filter:grayscale(1)' : '')
          row2.appendChild(ic)
        }
      })
    } else if (q.row && q.row.length) {
      // a pattern strip (no plus signs): the pieces in order, then a '?' box for the child to answer
      var rsz = Math.max(60, Math.min(120, Math.floor(820 / (q.row.length + 1) - 12)))
      var row3 = api.at(card, '', 30, 136, 880, 130)
      row3.setAttribute('data-ask-pics', String(q.row.length))
      row3.style.cssText += ';display:flex;gap:10px;justify-content:center;align-items:center'
      q.row.forEach(function (key) {
        var im3 = new Image(); im3.alt = ''; im3.src = 'assets/blippi/' + key + '.webp'
        im3.style.cssText = 'width:' + rsz + 'px;height:' + rsz + 'px;object-fit:contain;flex:0 0 auto'
        row3.appendChild(im3)
      })
      var qm = document.createElement('b'); qm.textContent = '?'
      qm.style.cssText = 'width:' + rsz + 'px;height:' + rsz + 'px;border-radius:18px;background:#FFF3C4;border:5px solid #13318A;color:#13318A;font:900 ' + Math.round(rsz * 0.6) + 'px/' + (rsz - 10) + 'px Fredoka,Nunito,sans-serif;text-align:center;flex:0 0 auto'
      row3.appendChild(qm)
    } else if (q.pic) {
      var pic = api.at(card, '', 390, 130, 160, 120)
      var im = new Image(); im.alt = ''; im.src = LIB + q.pic + '.webp'; im.style.cssText = 'width:100%;height:100%;object-fit:contain'; pic.appendChild(im)
    }
    var n = q.choices.length
    var cw = n > 3 ? 190 : 250
    var gap = 22
    var x0 = (940 - (cw * n + gap * (n - 1))) / 2
    var tries = 0
    var done = false
    var btns = []
    q.choices.forEach(function (ch, k) {
      var b = api.at(card, 'obtn', x0 + k * (cw + gap), (q.count || q.pic || q.scene || q.row) ? 290 : 250, cw, 190, 'button')
      b.type = 'button'
      b.setAttribute('data-choice', String(ch))
      b.style.cssText += ';font:900 56px/1 Fredoka,Nunito,sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;padding:0'
      var cp = q.choicePics && q.choicePics[k]
      if (cp) { var ci = new Image(); ci.alt = ''; ci.src = /^assets\//.test(cp) ? cp : LIB + cp + '.webp'; ci.style.cssText = 'height:90px;object-fit:contain'; b.appendChild(ci) }
      var lb = document.createElement('span'); lb.textContent = String(ch); lb.style.cssText = 'font-size:' + (String(ch).length > 7 ? 30 : 52) + 'px'; b.appendChild(lb)
      b.addEventListener('click', function () {
        if (done) return
        api.touch()
        if (String(ch) === String(q.answer)) { finish(true, b) } else {
          tries++
          api.sfx('bad')
          b.style.opacity = '.35'; b.disabled = true
          if (b.animate && !api.reduced()) b.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-10px)' }, { transform: 'translateX(10px)' }, { transform: 'translateX(0)' }], { duration: 300 })
          pr.textContent = (q.hint1 || q.explain || 'Coba lagi ya, pelan-pelan.')
          if (tries >= 2) { var right = btns.filter(function (x) { return x.getAttribute('data-choice') === String(q.answer) })[0]; if (right) K.glow(right, 3000); pr.textContent = 'Jawabannya ' + q.answer + '. Ketuk yang menyala.' }
        }
      })
      btns.push(b)
    })
    function finish (ok, b) {
      done = true
      stats.correct++
      api.sfx('ok')
      if (b) b.classList.add('bounce')
      api.fx('gold-star', 836, 400, 240)
      api.later(function () { if (ov.parentNode) ov.parentNode.removeChild(ov); if (o.done) o.done(ok) }, 650)
    }
    // after two wrong tries the right card still has to be tapped (it glows) so the child always finishes by doing it
    speak(api, q.prompt)
    return ov
  }

  // K.ghost(api, parent, key, x, y, w, h): a translucent silhouette of the piece AT its place, gently pulsing (replaces every orange dashed ring)
  function ghost (api, parent, key, x, y, w, h, flip, strong) {
    var g = api.at(parent, 'ghostpiece', x, y, w, h)
    g.style.cssText += ';pointer-events:none;z-index:3;opacity:.5;filter:brightness(1.8) saturate(.4) drop-shadow(0 0 10px rgba(255,255,255,.9))'
    api.B.A.fill(g, key)
    if (flip && g.firstChild) g.firstChild.style.transform = 'scaleX(-1)'
    if (strong) g.style.cssText += ';opacity:.82;filter:brightness(1.35) saturate(.55) drop-shadow(0 0 3px #fff) drop-shadow(0 0 3px #fff) drop-shadow(0 0 12px rgba(255,255,255,.95))'
    var lo = strong ? 0.7 : 0.38
    var hi = strong ? 0.92 : 0.62
    if (g.animate && !api.reduced()) g.animate([{ opacity: lo, transform: 'scale(1)' }, { opacity: hi, transform: 'scale(1.04)' }, { opacity: lo, transform: 'scale(1)' }], { duration: 1500, iterations: Infinity, easing: 'ease-in-out' })
    return g
  }

  // K.driver(vehicleEl, win): Blippi's head and shoulders in the cab window. win = {x,y,w,h} as FRACTIONS of the vehicle element (the window rectangle).
  function driver (el, win, face) {
    var d = document.createElement('div')
    d.className = 'cabdriver'
    d.style.cssText = 'position:absolute;left:' + (win.x * 100) + '%;top:' + (win.y * 100) + '%;width:' + (win.w * 100) + '%;height:' + (win.h * 100) + '%;overflow:hidden;border-radius:14%;pointer-events:none;z-index:1'
    var im = new Image()
    im.alt = ''
    im.draggable = false
    im.src = 'assets/blippi/driver-' + (face || 'three-quarter') + '.webp'
    im.style.cssText = 'position:absolute;left:50%;bottom:-6%;width:118%;transform:translateX(-50%)'
    d.appendChild(im)
    d.setAttribute('data-driver', '1')
    el.appendChild(d)
    return d
  }

  w.BlippiKit = { glow: glow, socket: socket, hand: hand, dragCard: dragCard, within: within, land: land, waterPath: waterPath, waterBody: waterBody, ripple: ripple, ask: ask, ghost: ghost, driver: driver, stats: stats }
})(window)
