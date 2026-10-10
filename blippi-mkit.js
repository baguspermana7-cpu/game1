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

  w.BlippiKit = { glow: glow, socket: socket, hand: hand, dragCard: dragCard, within: within, land: land }
})(window)
