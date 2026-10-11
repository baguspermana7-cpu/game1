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

  w.BlippiKit = { glow: glow, socket: socket, hand: hand, dragCard: dragCard, within: within, land: land, waterPath: waterPath, waterBody: waterBody, ripple: ripple }
})(window)
