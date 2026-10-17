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
