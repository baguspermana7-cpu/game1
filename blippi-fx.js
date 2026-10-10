/* G32 Blippi -- motion + feedback. (1) Parallax.js depth scene behind every screen: base plate at depth .02 and ONE
 * ambient family per scene (blippi-motion.css classes). (2) Child-safe VFX bursts from data/blippi-vfx.js (owner-supplied,
 * blippi_safe) for feedback: hose connected, correct board, mission done. Transform/opacity only; reduced-motion keeps a
 * gentle fade; hidden screens destroy their Parallax instance (BlippiFX.stop). */
(function (w) {
  'use strict'
  var V = w.BlippiVFX || {}
  var live = 0
  var par = null
  function reduced () { return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) }

  // [family class, vfx name, depth, [[x%, y%, width px, opacity]...]]
  var AMBIENT = {
    'bg-hub': ['cloud', 'cloud', 0.07, [[4, 1, 300, 0.5], [52, 3, 240, 0.4]]],
    'bg-peta': ['water', 'spark', 0.1, [[18, 38, 70, 1], [46, 62, 60, 1], [72, 44, 80, 1], [30, 76, 56, 1]]],
    'bg-garasi': ['sparkle', 'spark', 0.1, [[12, 62, 70, 1], [48, 58, 80, 1], [84, 64, 64, 1]]],
    'bg-misi-kincir': ['water', 'spark', 0.12, [[34, 72, 70, 1], [58, 80, 60, 1], [80, 70, 80, 1]]],
    'bg-misi-jalan': ['dust', 'dust', 0.1, [[10, 70, 220, 0.5], [60, 78, 200, 0.5]]]
  }

  function li (depth, cls) {
    var e = document.createElement('li')
    e.className = 'blippi-depth-layer ' + (cls || '')
    e.setAttribute('data-depth', String(depth))
    return e
  }

  function wrapBg (slot, artEl, key) {
    var ul = document.createElement('ul')
    ul.className = 'blippi-parallax-scene'
    ul.setAttribute('data-blippi-parallax', '')
    ul.setAttribute('aria-hidden', 'true')
    var base = li(0.02)
    base.appendChild(artEl)
    ul.appendChild(base)
    var a = AMBIENT[key]
    if (a && V[a[1]]) {
      var l = li(a[2], 'fxl blippi-ambient-' + a[0])
      a[3].forEach(function (p, i) {
        var im = new Image()
        im.alt = ''
        im.draggable = false
        im.src = V[a[1]].file
        im.style.left = p[0] + '%'
        im.style.top = p[1] + '%'
        im.style.width = p[2] + 'px'
        im.style.opacity = String(p[3] * (a[0] === 'cloud' ? 1 : 0.6))
        im.style.animationDelay = (-i * 0.9) + 's'
        if (V[a[1]].blend === 'screen') im.style.mixBlendMode = 'screen'
        l.appendChild(im)
      })
      ul.appendChild(l)
    }
    slot.appendChild(ul)
  }

  function start (el) {
    stop()
    if (w.BlippiParallax && w.Parallax && el.id) par = w.BlippiParallax.init({ selector: '#' + el.id + ' [data-blippi-parallax]' })
  }
  function stop () { if (par) { try { par.destroy() } catch (e) { /* already gone */ } par = null } }

  // one short burst at reference-pixel (x,y). Returns false when skipped (cap, missing effect).
  function burst (parent, name, x, y, size, o) {
    var d = V[name]
    if (!d || !parent || live >= 10 || !w.Element.prototype.animate) return false
    o = o || {}
    var im = new Image()
    im.alt = ''
    im.draggable = false
    im.src = d.file
    var sz = size || 220
    var st = im.style
    st.cssText = 'position:absolute;pointer-events:none;z-index:' + (o.z || 40) + ';left:' + (x - sz / 2) + 'px;top:' + (y - sz / 2) + 'px;width:' + sz + 'px;height:auto;opacity:0;will-change:transform,opacity' +
      (d.blend === 'screen' ? ';mix-blend-mode:screen' : '')
    parent.appendChild(im)
    live++
    var dur = o.dur || 900
    var frames = reduced()
      ? [{ opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'scale(.4) translateY(0)' }, { opacity: 1, transform: 'scale(1.05) translateY(' + (o.rise ? -o.rise * 0.4 : 0) + 'px)', offset: 0.35 },
        { opacity: 0, transform: 'scale(1.2) translateY(' + (o.rise ? -o.rise : 0) + 'px)' }]
    var an = im.animate(frames, { duration: reduced() ? 600 : dur, easing: 'cubic-bezier(.23,1,.32,1)', fill: 'forwards' })
    function done () { live = Math.max(0, live - 1); if (im.parentNode) im.parentNode.removeChild(im) }
    an.onfinish = done
    an.oncancel = done
    return true
  }
  // a small celebration: a few effects in a spread, staggered
  function celebrate (parent, cx, cy) {
    burst(parent, 'gold-star', cx, cy, 260)
    setTimeout(function () { burst(parent, 'confetti', cx - 160, cy + 20, 240, { rise: 40 }) }, 120)
    setTimeout(function () { burst(parent, 'confetti', cx + 160, cy + 20, 240, { rise: 40 }) }, 220)
    setTimeout(function () { burst(parent, 'spark', cx, cy - 80, 200) }, 320)
  }

  w.BlippiFX = { wrapBg: wrapBg, start: start, stop: stop, burst: burst, celebrate: celebrate, live: function () { return live } }
})(window)
