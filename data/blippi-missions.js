/* G32 Blippi -- CONTENT. Stable ids, Indonesian lines, reward keys.
 * Runtime (games/blippi*.js) reads this and never hardcodes a mission line.
 * PRD v3 refs: 10.1 vehicles, 10.2 capability tags, 11.2-11.3 catalogue, 13.2-13.3 rewards, 16.2 hint ladder.
 */
(function (w) {
  'use strict'

  var VEHICLES = [
    { id: 'buggy', name: 'BUGGY', art: 'veh-buggy', thumb: 'thumb-buggy', tags: ['drive_land', 'observe'],
      say: 'Ayo jelajah!', demo: { id: 'honk', label: 'COBA KLAKSON' },
      modules: [
        { id: 'ban-jalan', name: 'BAN JALAN', art: 'modul-ban-jalan', info: 'Ban halus. Melaju mulus di jalan yang keras.' },
        { id: 'ban-berpola', name: 'BAN BERPOLA', art: 'modul-ban-berpola', info: 'Ban bergerigi. Tidak mudah tergelincir di lumpur.' }
      ] },
    { id: 'truk-air', name: 'TRUK AIR', art: 'veh-truk-air', thumb: 'thumb-truk-air', tags: ['pump_water', 'spray', 'haul'],
      say: 'Ayo alirkan air!', demo: { id: 'spray', label: 'COBA SEMPROT' },
      modules: [
        { id: 'pompa', name: 'POMPA', art: 'modul-pompa', info: 'Pompa mendorong air dari tangki lewat selang.' },
        { id: 'semprot', name: 'SEMPROT', art: 'modul-semprot', info: 'Nozzle semprot. Air keluar jauh dan terarah.' }
      ] },
    { id: 'excavator', name: 'EXCAVATOR', art: 'veh-excavator', thumb: 'thumb-excavator', tags: ['dig'],
      say: 'Ayo gali pasirnya!', demo: { id: 'dig', label: 'COBA GALI' },
      modules: [
        { id: 'bucket-sempit', name: 'BUCKET SEMPIT', art: 'modul-bucket-sempit', info: 'Bucket sempit. Cocok untuk parit kecil.' },
        { id: 'bucket-lebar', name: 'BUCKET LEBAR', art: 'modul-bucket-lebar', info: 'Bucket lebar. Sekali gali dapat banyak pasir.' }
      ] },
    { id: 'dump-truck', name: 'DUMP TRUCK', art: 'veh-dump-truck', thumb: 'veh-dump-truck', tags: ['haul', 'tip'],
      say: 'Ayo muat dan tuang!', demo: { id: 'honk', label: 'COBA KLAKSON' }, modules: [] }
  ]

  var WORLDS = [
    { id: 'kota-roda', name: 'KOTA RODA', mission: 'W01-M01', missions: ['W01-M01', 'W01-M02', 'W01-M03', 'W01-M04', 'W01-M05'], finale: 'W01-M05', art: 'pulau-kota-roda', artDone: 'pulau-kota-roda-selesai', box: [15, 70, 640, 250], label: [275, 293, 235, 50], thumb: 'thumb-jalan-pertamaku' },
    { id: 'taman-air', name: 'TAMAN AIR', locked: 'Terbuka setelah Kota Roda.', after: 'W01-M05', mission: 'W02-M01', missions: ['W02-M01', 'W02-M02', 'W02-M03', 'W02-M04', 'W02-M05'], art: 'pulau-taman-air', artDone: 'pulau-taman-air-selesai', box: [625, 150, 480, 215], label: [750, 322, 208, 48], thumb: 'thumb-taman-air' },
    { id: 'eco-park', name: 'ECO PARK', locked: 'Terbuka setelah Taman Air.', art: 'pulau-eco-park', box: [1090, 95, 560, 300], label: [1248, 320, 215, 50] },
    { id: 'kebun-ceria', name: 'KEBUN CERIA', locked: 'Terbuka setelah Eco Park.', art: 'pulau-kebun-ceria', box: [155, 355, 560, 330], label: [307, 598, 220, 50] },
    { id: 'pelabuhan', name: 'PELABUHAN PENJELAJAH', locked: 'Terbuka setelah Kebun Ceria.', art: 'pulau-pelabuhan', box: [665, 385, 480, 300], label: [800, 606, 248, 66] },
    { id: 'wonder-lab', name: 'WONDER LAB', locked: 'Terbuka setelah pulau lain selesai.', art: 'pulau-wonder-lab', box: [1130, 395, 510, 310], label: [1303, 634, 218, 50] }
  ]

  var MISSIONS = {
    'W01-M01': {
      id: 'W01-M01', world: 'kota-roda', title: 'Jalan Pertamaku', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['drive_land'], vehicle: 'buggy', bg: 'bg-misi-jalan',
      reward: { key: 'reward:W01-M01', sticker: 'stiker-buggy', stickerName: 'Stiker Buggy' },
      worldDelta: 'kota-roda:jalur-taman',
      steps: [
        { id: 'pasang', label: 'PASANG', tool: 'papan', toolName: 'PAPAN', toolArt: 'tool-papan', icon: 'plank',
          instr: 'Seret tiga papan ke jembatan.',
          wrong: 'Belum waktunya. Sekarang kita pasang papan dulu.' },
        { id: 'jalan', label: 'JALAN', tool: 'jalan', toolName: 'JALAN', toolArt: 'tool-jalan', icon: 'wheel',
          instr: 'Tahan tombol, buggy melaju.',
          wrong: 'Pasang papan dulu, baru buggy bisa jalan.' },
        { id: 'antar', label: 'ANTAR', tool: 'paket', toolName: 'PAKET', toolArt: 'tool-paket', icon: 'box',
          instr: 'Seret paket ke bendera.',
          wrong: 'Antar paketnya setelah sampai di bendera.' }
      ],
      lines: {
        start: 'Ada sungai di depan. Ayo buat jalan!',
        pickRoute: 'Bagus! Seret papannya satu per satu.',
        board: 'Satu papan terpasang!',
        built: 'Jembatan jadi! Tahan JALAN untuk menyeberang.',
        arrive: 'Sampai! Ketuk paketnya untuk mengantar.',
        dragParcel: 'Seret paketnya sampai ke bendera.',
        parcelMiss: 'Belum sampai. Letakkan paket di bendera ya.',
        retryNear: 'Tidak apa-apa. Taruh papan di tempat yang bergaris ya.',
        wrongTool: 'Belum waktunya. Pakai alat yang menyala oranye ya.',
        win: 'Hore! Jalur taman pertama sudah jadi!'
      },
      hints: ['Papan yang bergaris menunggu kamu.', 'Seret papan dari tumpukan ke tempat yang bergaris.', 'Lihat tanganku. Ketuk tumpukan papan ini!']
    },
    'W01-M02': {
      id: 'W01-M02', world: 'kota-roda', title: 'Harta di Bawah Pasir', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['dig'], vehicle: 'excavator', bg: 'bg-w01-m02-pasir',
      reward: { key: 'reward:W01-M02', sticker: 'stiker-harta', stickerName: 'Stiker Harta' },
      worldDelta: 'kota-roda:harta-pasir',
      steps: [
        { id: 'baca', label: 'BACA', tool: 'baca', toolName: 'PETUNJUK', toolArt: 'tool-baca', icon: 'bulb',
          instr: 'Ketuk gulungan petunjuk.', wrong: 'Baca petunjuknya dulu. Menggali nanti ya.' },
        { id: 'gali', label: 'GALI', tool: 'gali', toolName: 'GALI', toolArt: 'tool-gali', icon: 'box',
          instr: 'Ketuk petak, ekskavator menggali.', wrong: 'Ketuk petak pasir supaya ekskavator menggali.' },
        { id: 'pasang', label: 'PASANG', tool: 'pasang', toolName: 'PASANG', toolArt: 'tool-taman', icon: 'wheel',
          instr: 'Seret ke bayangannya.', wrong: 'Semua sudah ketemu. Pasang di taman.' }
      ],
      lines: {
        start: 'Ada tiga mainan taman terkubur di pasir. Baca petunjuknya!',
        read: 'Cocokkan bentuknya. Ketuk petak yang menyala di peta kecil.',
        readFirst: 'Baca petunjuk dulu ya.',
        found: 'Ketemu!',
        empty: 'Cuma kerikil. Lihat petunjuknya lagi!',
        dugAlready: 'Petak ini sudah digali. Coba yang lain!',
        allFound: 'Semua ketemu! Pasang di taman.',
        dragIt: 'Seret ke bayangannya di taman.',
        wrongSpot: 'Bukan di sini. Cari bayangan yang sama.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Taman punya tiga mainan baru!'
      },
      hints: ['Gulungan petunjuk bercahaya. Baca dulu.', 'Lihat kotak kecil di petunjuk: petak oranye itu tempatnya.', 'Lihat tanganku. Ketuk petak ini!']
    },
    'W01-M03': {
      id: 'W01-M03', world: 'kota-roda', title: 'Bukit dan Muatan', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['haul'], vehicle: 'dump-truck', bg: 'bg-w01-m03-bukit',
      reward: { key: 'reward:W01-M03', sticker: 'stiker-bukit', stickerName: 'Stiker Bukit', vehicle: 'dump-truck' },
      worldDelta: 'kota-roda:bukit-uji',
      steps: [
        { id: 'muat', label: 'MUAT', tool: 'muat', toolName: 'MUAT', toolArt: 'tool-antar', icon: 'box',
          instr: 'Seret 4 kotak ke truk.', wrong: 'Muat kotaknya dulu ke bak truk.' },
        { id: 'uji', label: 'UJI', tool: 'uji', toolName: 'UJI', toolArt: 'tool-uji', icon: 'wheel',
          instr: 'Seret truk ke tiap ramp.', wrong: 'Kotak sudah dimuat. Saatnya menguji ramp.' },
        { id: 'antar', label: 'TUANG', tool: 'tuang', toolName: 'TUANG', toolArt: 'tool-tuang', icon: 'box',
          instr: 'Ramp mana ke garis biru?', wrong: 'Ujinya sudah selesai. Antar muatan ke garis biru.' }
      ],
      lines: {
        start: 'Muat kotak, uji ramp, lalu tuang di garis biru!',
        dragCrate: 'Seret kotaknya ke bak truk.',
        crateMiss: 'Belum masuk. Lepas di atas bak truk ya.',
        more: 'Satu kotak masuk!',
        loaded: 'Muatan penuh! Sekarang uji ramp.',
        loadFirst: 'Muat kotaknya dulu ya.',
        guess: 'Tebakan tersimpan. Seret truk ke ramp untuk membuktikan!',
        dragTruck: 'Seret trukmu ke salah satu ramp.',
        noRamp: 'Belum di ramp. Taruh truk di atas ramp.',
        both: 'Ramp tinggi meluncur lebih jauh. Dua bendera tersimpan!',
        short: 'Kurang jauh. Coba ramp yang lain!',
        atBlue: 'Sampai di garis biru! Tahan truk untuk menuang.',
        holdLonger: 'Tahan terus sampai kotaknya meluncur.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Muatan sampai di garis biru!'
      },
      hints: ['Kotak yang berkedip bisa diseret ke truk.', 'Ramp yang lebih tinggi memberi dorongan lebih kuat.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W01-M04': {
      id: 'W01-M04', world: 'kota-roda', title: 'Jembatan untuk Semua', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['haul'], vehicle: 'truk-air', bg: 'bg-w01-m04-jembatan',
      reward: { key: 'reward:W01-M04', sticker: 'stiker-jembatan', stickerName: 'Stiker Jembatan' },
      worldDelta: 'kota-roda:jembatan-akses',
      steps: [
        { id: 'pasang', label: 'PASANG', tool: 'balok', toolName: 'PASANG', toolArt: 'tool-balok', icon: 'wheel',
          instr: 'Seret balok ke sungai.', wrong: 'Pasang jembatannya dulu. Truk menunggu.' },
        { id: 'jalan', label: 'JALAN', tool: 'jalan', toolName: 'JALAN', toolArt: 'tool-jalan', icon: 'wheel',
          instr: 'Tahan truk agar menyeberang.', wrong: 'Jembatan sudah jadi. Tahan truknya!' },
        { id: 'antar', label: 'ANTAR', tool: 'paket', toolName: 'ANTAR', toolArt: 'tool-paket', icon: 'box',
          instr: 'Seret paket ke taman.', wrong: 'Truk sudah sampai. Seret paketnya.' }
      ],
      lines: {
        start: 'Sungai memisahkan jalan dan taman. Ayo buat jembatan!',
        short: 'Pendek belum sampai. Pasang tiang tengah!',
        dragIt: 'Seret baloknya ke sungai.',
        postWhere: 'Tiang berdiri di air, di tengah sungai.',
        placed: 'Terpasang!',
        built: 'Jembatan jadi! Tahan truk untuk menyeberang.',
        wait: 'Jembatannya belum jadi. Truk menunggu di tepi.',
        dragParcel: 'Seret paketnya ke taman.',
        parcelMiss: 'Belum sampai. Letakkan di tempat yang bergaris.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Jembatan terbuka untuk semua!'
      },
      hints: ['Cari tempat yang bergaris oranye di sungai.', 'Lihat bayangan bagian itu di tempatnya.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W01-M05': {
      id: 'W01-M05', world: 'kota-roda', title: 'Hari Pembukaan Taman', sub: 'Kota Roda', thumb: 'thumb-jalan-pertamaku',
      needs: ['dig'], vehicle: 'excavator', bg: 'bg-w01-m05-pembukaan',
      reward: { key: 'reward:W01-M05', sticker: 'stiker-taman', stickerName: 'Stiker Taman', badge: 'lencana-w01', badgeName: 'Lencana Kota Roda' },
      worldDelta: 'kota-roda:taman-buka',
      steps: [
        { id: 'siapkan', label: 'SIAPKAN', tool: 'siapkan', toolName: 'SIAPKAN', toolArt: 'tool-siapkan', icon: 'wheel',
          instr: 'Seret tiga benda ke tempatnya.', wrong: 'Siapkan tamannya dulu. Gerbang dibuka nanti.' },
        { id: 'buka', label: 'BUKA', tool: 'buka', toolName: 'BUKA', toolArt: 'tool-buka', icon: 'box',
          instr: 'Ketuk gerbang untuk membuka!', wrong: 'Semua siap. Sekarang buka gerbangnya.' }
      ],
      lines: {
        start: 'Hari ini taman dibuka! Kerjakan dalam urutan yang kamu mau.',
        dragIt: 'Seret bendanya ke tempat yang bergaris.',
        miss: 'Belum pas. Letakkan di tempat yang bergaris.',
        moreSand: 'Satu lagi pasir!',
        toysFirst: 'Mainan butuh pasir dulu. Taruh pasir ya.',
        done1: 'Selesai satu!',
        ready: 'Semua siap! Ketuk gerbang untuk membuka.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Taman Kota Roda resmi dibuka!'
      },
      hints: ['Benda yang menyala bisa diseret ke garis oranye.', 'Pasir dulu, supaya mainan punya tempat berdiri.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W02-M01': {
      id: 'W02-M01', world: 'taman-air', title: 'Kincir yang Menunggu', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['pump_water'], vehicle: 'truk-air', bg: 'bg-misi-kincir',
      reward: { key: 'reward:W02-M01', sticker: 'stiker-kincir', stickerName: 'Stiker Kincir', vehicle: 'truk-air' },
      worldDelta: 'taman-air:kincir-aktif',
      steps: [
        { id: 'sambung', label: 'SAMBUNG', tool: 'selang', toolName: 'SELANG', toolArt: 'tool-selang', icon: 'hose',
          instr: 'Sambungkan selang ke kincir.',
          wrong: 'Sambungkan selang dulu. Katup dan pompa dipakai nanti.' },
        { id: 'buka', label: 'BUKA', tool: 'katup', toolName: 'KATUP', toolArt: 'tool-katup', icon: 'valve',
          instr: 'Pilih katup, lalu putar untuk membuka.',
          wrong: 'Pilih katup untuk membuka jalan air. Pompa nanti ya.' },
        { id: 'pompa', label: 'POMPA', tool: 'pompa', toolName: 'POMPA', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Pilih pompa, lalu tahan untuk memompa.',
          wrong: 'Pompa dipakai setelah katup terbuka.' }
      ],
      lines: {
        start: 'Kincirnya menunggu air. Ayo sambungkan selang!',
        connected: 'Tersambung! Sekarang buka katupnya.',
        retry: 'Hampir! Coba lagi, dekatkan ke lubang pipa.',
        opened: 'Katup terbuka! Sekarang pompa airnya.',
        pumping: 'Terus pompa...',
        pickValve: 'Pilih katup dulu di bawah.',
        pickPump: 'Pilih pompa dulu di bawah.',
        win: 'Hore! Kincirnya berputar!'
      },
      hints: ['Ujung selang bercahaya. Seret ke lubang pipa.', 'Ikuti panah: dari ujung selang ke lubang pipa.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W02-M02': {
      id: 'W02-M02', world: 'taman-air', title: 'Ke Mana Airnya Pergi?', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['pump_water'], vehicle: 'truk-air', bg: 'bg-w02-m02-aliran',
      reward: { key: 'reward:W02-M02', sticker: 'stiker-sambung', stickerName: 'Stiker Sambungan' },
      worldDelta: 'taman-air:kolam-uji',
      steps: [
        { id: 'cari', label: 'CARI', tool: 'cari', toolName: 'POMPA', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Tahan pompa. Lihat airnya.', wrong: 'Tahan pompanya dulu untuk melihat aliran air.' },
        { id: 'sambung', label: 'SAMBUNG', tool: 'sambung', toolName: 'SAMBUNG', toolArt: 'tool-selang', icon: 'hose',
          instr: 'Seret konektor bulat ke celah.', wrong: 'Pasang konektor di celah selang dulu.' },
        { id: 'uji', label: 'UJI', tool: 'uji', toolName: 'UJI', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Tahan pompa. Isi kolamnya.', wrong: 'Sudah tersambung. Tahan pompa untuk menguji.' }
      ],
      lines: {
        start: 'Airnya tidak sampai ke kolam. Ayo cari sebabnya!',
        found: 'Airnya berhenti di sini. Selangnya terputus!',
        needPlug: 'Pasang konektor dulu, baru pompa.',
        dragPlug: 'Seret konektor ke celah selang.',
        wrongShape: 'Bentuknya belum pas. Cari yang bulat.',
        fits: 'Pas! Selangnya tersambung.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Kolam percobaan terisi air!'
      },
      hints: ['Pompa dan celah selang menyala. Mulai dari pompa.', 'Kartu bulat di selang: cari konektor yang sama.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W02-M03': {
      id: 'W02-M03', world: 'taman-air', title: 'Gerobak di Lumpur', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['drive_land'], vehicle: 'buggy', bg: 'bg-w02-m03-lumpur',
      reward: { key: 'reward:W02-M03', sticker: 'stiker-gerobak', stickerName: 'Stiker Gerobak', vehicle: 'buggy' },
      worldDelta: 'taman-air:jalur-kebun',
      steps: [
        { id: 'kait', label: 'KAIT', tool: 'kait', toolName: 'KAIT', toolArt: 'tool-kait', icon: 'wheel',
          instr: 'Seret kait ke gerobak.', wrong: 'Pasang kaitnya dulu ke gerobak.' },
        { id: 'ban', label: 'BAN', tool: 'ban', toolName: 'BAN', toolArt: 'tool-ban', icon: 'wheel',
          instr: 'Seret ban ke buggy.', wrong: 'Kait sudah terpasang. Pilih ban untuk buggy.' },
        { id: 'tarik', label: 'TARIK', tool: 'tarik', toolName: 'TARIK', toolArt: 'tool-jalan', icon: 'box',
          instr: 'Seret buggy ke satu jalur.', wrong: 'Ban sudah dipilih. Pilih jalur untuk menarik gerobak.' }
      ],
      lines: {
        start: 'Gerobaknya harus sampai ke gerbang taman air!',
        dragHook: 'Seret kaitnya ke lingkaran di antara buggy dan gerobak.',
        hookMiss: 'Belum pas. Taruh kait di lingkaran.',
        hooked: 'Terkait! Sekarang pilih ban.',
        dragTire: 'Seret ban ke buggy.',
        tireSmooth: 'Ban halus. Cepat di jalan kering.',
        tireTread: 'Ban berpola. Mencengkeram tanah licin.',
        dragBuggy: 'Seret buggy ke salah satu lingkaran.',
        slip: 'Ban halus tergelincir. Coba ban berpola!',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Gerobak sampai di taman air!'
      },
      hints: ['Benda yang menyala bisa diseret ke lingkaran oranye.', 'Ban berpola mencengkeram lumpur lebih kuat.', 'Lihat tanganku. Seret seperti ini!']
    },
    'W02-M04': {
      id: 'W02-M04', world: 'taman-air', title: 'Dua Jalan untuk Air', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['pump_water'], vehicle: 'truk-air', bg: 'bg-w02-m04-dua-jalan',
      reward: { key: 'reward:W02-M04', sticker: 'stiker-aliran', stickerName: 'Stiker Aliran' },
      worldDelta: 'taman-air:kanal-bercabang',
      steps: [
        { id: 'kira', label: 'KIRA-KIRA', tool: 'kira', toolName: 'KIRA-KIRA', toolArt: 'tool-kira', icon: 'bulb',
          instr: 'Ketuk wadah yang akan terisi.', wrong: 'Tebak dulu wadah mana yang terisi air.' },
        { id: 'uji', label: 'UJI', tool: 'uji', toolName: 'POMPA', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Tahan pompa. Lihat airnya.', wrong: 'Tebakanmu tersimpan. Tahan pompa untuk menguji.' },
        { id: 'buka', label: 'BUKA', tool: 'buka', toolName: 'KATUP', toolArt: 'tool-katup', icon: 'valve',
          instr: 'Putar katup, lalu tahan pompa.', wrong: 'Buka katup jalur yang tertutup.' }
      ],
      lines: {
        start: 'Air punya dua jalan. Wadah mana yang akan terisi?',
        guessed: 'Tebakan tersimpan. Sekarang uji dengan pompa!',
        guessFirst: 'Tebak dulu: ketuk salah satu wadah.',
        hit: 'Tebakanmu benar! Satu jalan tertutup.',
        miss: 'Hampir! Satu jalan tertutup, jadi air hanya lewat jalan yang terbuka.',
        openFirst: 'Putar katup yang menyala dulu.',
        valveOpen: 'Terbuka! Tahan pompa lagi.',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Kedua wadah terisi air!'
      },
      hints: ['Dua wadah menyala. Ketuk salah satu.', 'Pintu yang tertutup menahan air.', 'Lihat tanganku. Putar katup seperti ini!']
    },
    'W02-M05': {
      id: 'W02-M05', world: 'taman-air', title: 'Parade Air Ceria', sub: 'Taman Air', thumb: 'thumb-taman-air',
      needs: ['pump_water'], vehicle: 'truk-air', bg: 'bg-w02-m05-parade-air',
      reward: { key: 'reward:W02-M05', sticker: 'stiker-parade', stickerName: 'Stiker Parade', badge: 'lencana-w02', badgeName: 'Lencana Taman Air' },
      worldDelta: 'taman-air:parade',
      steps: [
        { id: 'sambung', label: 'SAMBUNG', tool: 'sambung', toolName: 'SELANG', toolArt: 'tool-selang', icon: 'hose',
          instr: 'Seret selang ke lubang kolam.', wrong: 'Sambungkan selang dulu ke kolam.' },
        { id: 'isi', label: 'ISI', tool: 'isi', toolName: 'POMPA', toolArt: 'tool-pompa', icon: 'drop',
          instr: 'Tahan pompa. Kolam terisi.', wrong: 'Selang sudah tersambung. Tahan pompa.' },
        { id: 'pola', label: 'POLA', tool: 'pola', toolName: 'PANCURAN', toolArt: 'tool-pancuran', icon: 'drop',
          instr: 'Seret dua pancuran ke kolam.', wrong: 'Kolam sudah penuh. Pasang dua pancuran.' }
      ],
      lines: {
        start: 'Hari parade! Ayo hidupkan air mancur.',
        hoseMiss: 'Belum sampai. Dekatkan ke lingkaran di tepi kolam.',
        hoseFirst: 'Sambungkan selang dulu ya.',
        dragJet: 'Seret pancurannya ke lingkaran.',
        jetMiss: 'Belum pas. Taruh di lingkaran yang bergaris.',
        moreJet: 'Bagus! Satu lagi.',
        show: 'Lihat urutan pancuran pilihanmu!',
        wrongTool: 'Pakai alat yang menyala oranye ya.',
        win: 'Hore! Parade air dimulai!'
      },
      hints: ['Ujung selang menyala. Seret ke lingkaran.', 'Pancuran A dan B bisa masuk lingkaran mana saja.', 'Lihat tanganku. Seret seperti ini!']
    }
  }

  var STICKERS = [
    { id: 'W01-M01', name: 'Stiker Buggy', art: 'stiker-buggy' },
    { id: 'W02-M01', name: 'Stiker Kincir', art: 'stiker-kincir' },
    { id: 'W01-M02', name: 'Stiker Harta', art: 'stiker-harta' },
    { id: 'W01-M03', name: 'Stiker Bukit', art: 'stiker-bukit' },
    { id: 'W01-M04', name: 'Stiker Jembatan', art: 'stiker-jembatan' },
    { id: 'W01-M05', name: 'Stiker Taman', art: 'stiker-taman' },
    { id: 'W02-M02', name: 'Stiker Sambungan', art: 'stiker-sambung' },
    { id: 'W02-M03', name: 'Stiker Gerobak', art: 'stiker-gerobak' },
    { id: 'W02-M04', name: 'Stiker Aliran', art: 'stiker-aliran' },
    { id: 'W02-M05', name: 'Stiker Parade', art: 'stiker-parade' }
  ]

  var HUB_LINES = {
    hub: 'Mau menjelajah?',
    map: 'Pilih pulau, lalu ketuk JELAJAHI.',
    park: 'Pilih kendaraanmu!'
  }

  w.BlippiData = {
    version: 1,
    vehicles: VEHICLES,
    worlds: WORLDS,
    missions: MISSIONS,
    stickers: STICKERS,
    hubLines: HUB_LINES,
    firstMission: 'W01-M01',
    order: ['W01-M01', 'W01-M02', 'W01-M03', 'W01-M04', 'W01-M05', 'W02-M01', 'W02-M02', 'W02-M03'],
    stickerTotal: 30
  }
})(window)
