/* G32 Blippi -- JELAJAH DUNIA landing screens (owner 2026-11-03: "landing page ... sangat bagus dan immersive"):
 * every journey card is a window into its own world (a still the game rendered of that world: tools/make-trip-previews.mjs,
 * or the Mojo place card for a road race), the screen behind is that world drifting slowly, a tap lights the card and flies
 * into the world (a view transition where the browser has one), and the level list is a route through each level's own
 * world with the child's vehicle waiting at the next one. Only presentation: the picker DOM, data and rules stay in
 * blippi-trip-ui.js. */
(function (w) {
  'use strict'
  var T = w.BlippiTrip
  var doc = w.document
  var timer = 0

  function reduced () { return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches) }
  function levels (cat) { return T.D.levels.filter(function (l) { return l.cat === cat }) }
  // the world a level runs in, as a picture url (null when there is none: the card keeps its tint)
  function pv (id) {
    var lvl = T.D.levels.filter(function (l) { return l.id === id })[0]
    if (!lvl) return null
    if (T.laneCat(lvl.cat)) return T.mojoRace && T.mojoRace.pic ? T.mojoRace.pic(id) : null
    return 'assets/blippi/trip/' + id + '.webp'
  }
  // the level the child plays next in a journey: the first open one without a star, else the last open one
  function cur (cat) {
    var ls = levels(cat), last = ls[0], i
    for (i = 0; i < ls.length; i++) {
      if (!T.unlocked(ls[i])) break
      last = ls[i]
      var st = T.levelState(ls[i].id)
      if (!st || !st.stars) return ls[i]
    }
    return last
  }
  function css (u) { return u ? 'url("' + u + '")' : 'none' }

  // the world behind a screen: two layers that cross-fade through the given pictures, each drifting slowly
  function world (parent, urls) {
    stop()
    urls = urls.filter(Boolean)
    var box = doc.createElement('div')
    box.className = 'tworld'
    box.setAttribute('aria-hidden', 'true')
    var a = doc.createElement('i'), b = doc.createElement('i')
    box.appendChild(a); box.appendChild(b)
    parent.insertBefore(box, parent.firstChild)
    if (!urls.length) return box
    var k = 0
    a.style.backgroundImage = css(urls[0]); a.className = 'on'
    if (urls.length > 1 && !reduced()) {
      timer = w.setInterval(function () {
        if (!box.isConnected) { stop(); return }
        k = (k + 1) % urls.length
        var show = k % 2 ? b : a, hide = k % 2 ? a : b
        show.style.backgroundImage = css(urls[k])
        show.className = 'on'; hide.className = ''
      }, 5200)
    }
    return box
  }
  function stop () { if (timer) { w.clearInterval(timer); timer = 0 } }

  // a journey card as a portal into its world
  function card (b, cat, i) {
    var lv = cur(cat)
    var u = lv ? pv(lv.id) : null
    b.classList.add('tportal')
    if (u) b.style.setProperty('--pv', css(u))
    b.style.setProperty('--i', String(i))
    var fx = doc.createElement('span')
    fx.className = 'tpfx'
    fx.setAttribute('aria-hidden', 'true')
    b.insertBefore(fx, b.firstChild)
  }
  // a level card shows its own world; the next level to play is marked and its vehicle waits there
  function level (b, l, i, isCur) {
    var u = pv(l.id)
    b.classList.add('troute')
    if (b.parentNode) b.parentNode.classList.add('tpost')   // the route as a grid of postcards (FigCraft mockup 2026-11-07)
    if (u) b.style.setProperty('--pv', css(u))
    b.style.setProperty('--i', String(i))
    var st = T.levelState(l.id)
    if (st && st.stars) b.classList.add('tdone')
    if (isCur) {
      b.classList.add('tcur')
      var go = doc.createElement('span')
      go.className = 'tgo'
      go.textContent = 'MAIN!'
      go.setAttribute('aria-hidden', 'true')
      b.appendChild(go)
    }
  }
  // the tap: the card lights up with a burst, then the screen flies into its world
  function go (b, then) {
    var host = b.closest('.tscr')
    if (host && w.BlippiFX) {
      var r = b.getBoundingClientRect(), h = host.getBoundingClientRect()
      w.BlippiFX.burst(host, 'spark', r.left - h.left + r.width / 2, r.top - h.top + r.height / 2, Math.min(320, r.width * 1.2))
    }
    b.classList.add('tlit')
    var vt = doc.startViewTransition && !reduced()
    if (vt) b.style.viewTransitionName = 'tportal'
    w.setTimeout(function () {
      if (!vt) { then(); return }
      try {
        doc.startViewTransition(function () {
          b.style.viewTransitionName = ''
          then()
          var wd = doc.querySelector('.tlev .tworld')
          if (wd) wd.style.viewTransitionName = 'tportal'
        }).finished.then(function () { var wd = doc.querySelector('.tlev .tworld'); if (wd) wd.style.viewTransitionName = '' }, function () {})
      } catch (e) { then() }
    }, reduced() ? 0 : 160)
  }

  T.portal = { pv: pv, cur: cur, world: world, stop: stop, card: card, level: level, go: go }
})(window)
