/* G32 Blippi -- SoalEngine pack 'blippi' + game profile 'blippi'. No question engine of our own (owner rule: one shared
 * engine for every game): maths come from the shared generators ('mat-a'), vehicle / discovery questions from this pack.
 * Grade 1-2, Indonesian, picture choices from the shared library (key = assets/db/lib/<key>.webp), no emoji.
 * Load order: soal-engine.js, soal-gen-matematika.js, this file. */
(function () {
  'use strict'
  var W = window
  var SE = W.SoalEngine
  if (!SE) return
  // [id, prompt, answer, wrong1, wrong2, hint, explain, pic]
  var Q = [
    ['pesawat', 'Kendaraan mana yang terbang di langit?', 'Pesawat', 'Perahu', 'Sepeda', 'Lihat ke atas. Siapa yang punya sayap?', 'Pesawat punya sayap, jadi bisa terbang.', 'vehicles/airplane'],
    ['perahu', 'Kendaraan mana yang berjalan di atas air?', 'Perahu', 'Truk', 'Sepeda', 'Air ada di laut dan sungai.', 'Perahu mengapung di atas air.', 'vehicles/sailboat'],
    ['sepeda', 'Kendaraan mana yang punya dua roda?', 'Sepeda', 'Bus sekolah', 'Truk', 'Hitung rodanya satu per satu.', 'Sepeda punya dua roda.', 'vehicles/bicycle'],
    ['roket', 'Kendaraan mana yang terbang sampai luar angkasa?', 'Roket', 'Sepeda', 'Perahu', 'Luar angkasa itu sangat tinggi, di atas awan.', 'Roket terbang sampai luar angkasa.', 'mojo-chase/items/rocket'],
    ['heli', 'Baling-baling di atas membuat kendaraan ini terbang. Apa namanya?', 'Helikopter', 'Truk', 'Kapal', 'Baling-baling berputar di atas.', 'Helikopter terbang dengan baling-baling.', 'vehicles/helicopter'],
    ['pemadam', 'Siapa yang menyemprotkan air untuk memadamkan api?', 'Mobil pemadam', 'Sepeda', 'Perahu layar', 'Dia punya selang air yang panjang.', 'Mobil pemadam menyemprotkan air.', 'vehicles/fire-truck'],
    ['bus', 'Anak-anak naik apa untuk pergi ke sekolah bersama?', 'Bus sekolah', 'Pesawat', 'Roket', 'Warnanya kuning dan besar.', 'Bus sekolah mengantar banyak anak.', 'vehicles/school-bus'],
    ['ekskavator', 'Kendaraan mana yang menggali tanah?', 'Ekskavator', 'Sepeda', 'Pesawat', 'Dia punya lengan besar dengan bucket.', 'Ekskavator menggali dengan bucket.', 'vehicles/excavator'],
    ['kincir', 'Apa yang membuat roda kincir air berputar?', 'Air', 'Pasir', 'Batu', 'Roda berputar kalau air mengalir.', 'Air yang mengalir memutar roda kincir.', null],
    ['matahari', 'Apa yang terbit di pagi hari dan memberi cahaya?', 'Matahari', 'Bulan', 'Awan', 'Dia terang dan hangat.', 'Matahari memberi cahaya dan hangat.', 'nature/sun'],
    ['bulan', 'Apa yang bersinar di langit malam?', 'Bulan', 'Matahari', 'Pelangi', 'Malam hari gelap, lihat ke langit.', 'Bulan dan bintang bersinar di malam hari.', 'nature/moon-stars'],
    ['pelangi', 'Apa yang punya banyak warna setelah hujan?', 'Pelangi', 'Batu', 'Roda', 'Dia melengkung di langit.', 'Pelangi muncul setelah hujan dan matahari.', 'nature/rainbow'],
    ['paus', 'Hewan mana yang hidup di laut?', 'Lumba-lumba', 'Kucing', 'Kelinci', 'Hewan ini suka melompat di ombak.', 'Lumba-lumba hidup di laut.', 'animals/dolphin'],
    ['elang', 'Hewan mana yang bisa terbang tinggi?', 'Elang', 'Kura-kura', 'Siput', 'Dia punya sayap besar.', 'Elang terbang tinggi dengan sayapnya.', 'animals/eagle'],
    ['ban', 'Bagian kendaraan mana yang berputar supaya mobil bisa jalan?', 'Roda', 'Lampu', 'Kaca', 'Dia bulat dan menyentuh jalan.', 'Roda berputar supaya mobil berjalan.', null],
    ['lampu', 'Lampu merah di jalan artinya apa?', 'Berhenti', 'Jalan terus', 'Berlari', 'Merah artinya hati-hati dan diam dulu.', 'Lampu merah artinya berhenti.', null],
    ['sabuk', 'Apa yang harus dipakai saat naik mobil supaya aman?', 'Sabuk pengaman', 'Topi', 'Sarung tangan', 'Dia dipasang melintang di badan.', 'Sabuk pengaman menjaga kita tetap aman.', null],
    ['planet', 'Bumi adalah bagian dari apa di luar angkasa?', 'Planet', 'Awan', 'Pelangi', 'Bumi bulat dan melayang di angkasa.', 'Bumi adalah sebuah planet.', null],
    ['bintang', 'Apa yang berkelap-kelip di langit malam?', 'Bintang', 'Roda', 'Batu', 'Kecil, jauh, dan bersinar.', 'Bintang bersinar di langit malam.', 'game/star'],
    ['pelampung', 'Apa yang dipakai supaya tidak tenggelam di air?', 'Pelampung', 'Sepatu', 'Topi', 'Dia mengapung di atas air.', 'Pelampung membuat kita mengapung.', 'game/lifebuoy']
  ]
  var ITEMS = Q.map(function (x, i) {
    var o = {
      id: 'blippi-' + x[0], topic: 'sains', grade: i < 12 ? 1 : 2, level: i < 12 ? 1 : 2, theme: ['blippi'],
      prompt: x[1], choices: [x[2], x[3], x[4]], answer: x[2], hint1: x[5], explain: x[6]
    }
    if (x[7]) o.pic = x[7]
    return o
  })
  SE.registerPack('blippi', { items: function () { return ITEMS }, meta: { theme: 'blippi', topic: 'sains', grade: 1 } })
  SE.defineGame('blippi', {
    'extends': 'default',
    topics: ['matematika', 'sains'],
    weights: { matematika: 65, sains: 35 },
    themes: ['blippi'],
    packs: ['blippi'],
    general: false,
    generators: ['mat-a'],
    grade: { mudah: 1, sulit: 2, kelas1: 1, kelas2: 2 },
    choices: { easy: 3, normal: 3 },
    pictures: 'sprite',
    nouns: { _: [['mojo-chase/items/star', 'bintang'], ['mojo-chase/items/cone', 'kerucut'], ['mojo-chase/items/coin', 'koin'], ['game/lifebuoy', 'pelampung']] },
    vocab: { place: 'jalan', deck: 'jalan', load: 'naik', unload: 'turun', carrier: 'Kendaraan', box: 'kotak', crate: 'peti', seat: 'Kursi', rope: 'Tali', cheer: '' },
    maxWords: { 1: 16, 2: 16, 3: 18, 4: 18 },
    stopWords: ['blippi'],
    scope: 'game',
    contexts: { gate: { topics: ['matematika', 'sains'], weights: { matematika: 65, sains: 35 } } }
  })
})()
