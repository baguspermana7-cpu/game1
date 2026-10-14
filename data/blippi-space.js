/* G32 Blippi -- the space craft of the LUAR ANGKASA journey (owner 2026-10-14: "ambil semua animated sprite kendaraan luar
 * angkasa ... masukkan ke selection ... ada micro movement nya agar tidak static"). Cut from the owner's animated 5x5 sheet
 * (Spacecraft_5x5_Animated.webp, 48 frames at 80 ms, transparent): one fixed box per craft over all frames (no jitter),
 * alpha only, no outline. Each craft has two horizontal frame strips in assets/space/:
 *   <id>.webp       play strip, every frame  [frameW, frameH, frames]   drawn in the run, frame = time / FRAME_MS
 *   <id>-pick.webp  picker strip, every 2nd  [frameW, frameH, frames]   a CSS steps() animation on the selection tile
 * Order = the sheet, row by row. */
window.BlippiSpace = {
  frameMs: 50,
  craft: [
 {
  "id": "rocket",
  "name": "Roket Merah",
  "play": [
   83,
   126,
   60
  ],
  "pick": [
   68,
   101,
   30
  ]
 },
 {
  "id": "ufo",
  "name": "Piring Terbang",
  "play": [
   109,
   124,
   60
  ],
  "pick": [
   88,
   100,
   30
  ]
 },
 {
  "id": "space-station",
  "name": "Stasiun Angkasa",
  "play": [
   120,
   124,
   60
  ],
  "pick": [
   96,
   100,
   30
  ]
 },
 {
  "id": "cargo-hauler",
  "name": "Kapal Kargo",
  "play": [
   88,
   124,
   60
  ],
  "pick": [
   72,
   100,
   30
  ]
 },
 {
  "id": "star-jet",
  "name": "Jet Bintang",
  "play": [
   103,
   124,
   60
  ],
  "pick": [
   84,
   100,
   30
  ]
 },
 {
  "id": "moon-lander",
  "name": "Pendarat Bulan",
  "play": [
   103,
   125,
   60
  ],
  "pick": [
   84,
   100,
   30
  ]
 },
 {
  "id": "manta-ship",
  "name": "Kapal Pari",
  "play": [
   118,
   123,
   60
  ],
  "pick": [
   95,
   99,
   30
  ]
 },
 {
  "id": "space-shuttle",
  "name": "Pesawat Ulang-alik",
  "play": [
   103,
   126,
   60
  ],
  "pick": [
   84,
   101,
   30
  ]
 },
 {
  "id": "probe",
  "name": "Probe Bola",
  "play": [
   104,
   124,
   60
  ],
  "pick": [
   84,
   100,
   30
  ]
 },
 {
  "id": "drill-ship",
  "name": "Kapal Bor",
  "play": [
   77,
   123,
   60
  ],
  "pick": [
   63,
   99,
   30
  ]
 },
 {
  "id": "ring-station",
  "name": "Stasiun Cincin",
  "play": [
   110,
   123,
   60
  ],
  "pick": [
   89,
   99,
   30
  ]
 },
 {
  "id": "red-cruiser",
  "name": "Kapal Merah",
  "play": [
   79,
   125,
   60
  ],
  "pick": [
   65,
   100,
   30
  ]
 },
 {
  "id": "jelly-ship",
  "name": "Kapal Ubur-ubur",
  "play": [
   101,
   118,
   60
  ],
  "pick": [
   82,
   95,
   30
  ]
 },
 {
  "id": "satellite",
  "name": "Satelit",
  "play": [
   123,
   113,
   60
  ],
  "pick": [
   99,
   92,
   30
  ]
 },
 {
  "id": "crescent-ship",
  "name": "Kapal Sabit",
  "play": [
   112,
   118,
   60
  ],
  "pick": [
   90,
   95,
   30
  ]
 },
 {
  "id": "nautilus-ship",
  "name": "Kapal Siput",
  "play": [
   99,
   124,
   60
  ],
  "pick": [
   80,
   100,
   30
  ]
 },
 {
  "id": "dragonfly-ship",
  "name": "Kapal Capung",
  "play": [
   123,
   120,
   60
  ],
  "pick": [
   99,
   97,
   30
  ]
 },
 {
  "id": "bubble-pod",
  "name": "Pod Merah",
  "play": [
   120,
   123,
   60
  ],
  "pick": [
   96,
   99,
   30
  ]
 },
 {
  "id": "twin-pod",
  "name": "Kapal Kembar",
  "play": [
   95,
   124,
   60
  ],
  "pick": [
   78,
   100,
   30
  ]
 },
 {
  "id": "solar-sail",
  "name": "Layar Surya",
  "play": [
   113,
   125,
   60
  ],
  "pick": [
   91,
   100,
   30
  ]
 },
 {
  "id": "donut-ship",
  "name": "Kapal Donat",
  "play": [
   105,
   126,
   60
  ],
  "pick": [
   85,
   101,
   30
  ]
 },
 {
  "id": "asteroid-miner",
  "name": "Penambang Asteroid",
  "play": [
   85,
   126,
   60
  ],
  "pick": [
   70,
   101,
   30
  ]
 },
 {
  "id": "space-sub",
  "name": "Kapal Selam Angkasa",
  "play": [
   96,
   125,
   60
  ],
  "pick": [
   79,
   100,
   30
  ]
 },
 {
  "id": "freighter",
  "name": "Kapal Barang",
  "play": [
   99,
   126,
   60
  ],
  "pick": [
   80,
   101,
   30
  ]
 },
 {
  "id": "glass-pod",
  "name": "Pod Kaca",
  "play": [
   117,
   125,
   60
  ],
  "pick": [
   95,
   100,
   30
  ]
 }
]
}
