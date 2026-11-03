/* G32 Blippi -- portrait hub (#rot): Blippi + friends on bg-hub--portrait; MISI waits for landscape (missions are landscape scenes), JELAJAH DUNIA is portrait-native. */
(function (w) {
  'use strict'
  var chip = document.getElementById('phChip')
  var pending = false
  var lines = ['Halo! Aku Blippi. Mau main apa hari ini?', 'Ayo temukan hal baru bersama teman-teman!', 'Pilih jelajah dunia, atau ayo bangun jembatan!']
  var li = 0
  document.getElementById('rotMisi').addEventListener('click', function () {
    if (w.Blippi && w.Blippi.sfx) w.Blippi.sfx('tap')
    pending = true
    chip.hidden = false
    chip.classList.remove('pulse'); void chip.offsetWidth; chip.classList.add('pulse')
  })
  // Home to the Dunia Emosi landing page (owner 2026-10-17: every new game has one), also on the portrait hub
  document.getElementById('phHome').addEventListener('click', function () {
    if (w.Blippi && w.Blippi.sfx) w.Blippi.sfx('tap')
    var framed = false
    try { framed = w.top !== w && w.top.location.origin === location.origin } catch (e) { framed = false }
    if (framed) w.top.postMessage('blippi:home', location.origin); else location.href = '../Dunia-Emosi/index.html'
  })
  // a round window on JELAJAH DUNIA that cycles through the journeys' worlds (blippi-home.css)
  ;(function () {
    var b = document.getElementById('rotTrip')
    if (!b || b.querySelector('.phport')) return
    var port = document.createElement('span')
    port.className = 'phport'
    port.setAttribute('aria-hidden', 'true')
    ;['udara-2', 'angkasa-4', 'air-2', 'balap-3', 'kertas-1', 'angkasa-8', 'air-5'].forEach(function (id, i) {
      var l = document.createElement('i')
      l.style.backgroundImage = 'url("assets/blippi/trip/' + id + '.webp")'
      l.style.animationDelay = (i * 3) + 's'
      port.appendChild(l)
    })
    b.insertBefore(port, b.firstChild)
  })()
  document.getElementById('phSay').addEventListener('click', function () { li = (li + 1) % lines.length; this.textContent = lines[li] })
  function land () {
    if (w.innerWidth > w.innerHeight && pending && w.Blippi) {
      pending = false
      chip.hidden = true
      var m = w.Blippi.recommended()
      w.Blippi.startMission(m.id, m.vehicle)
    }
  }
  w.addEventListener('resize', land)
  w.addEventListener('orientationchange', function () { setTimeout(land, 150) })
})(window)
