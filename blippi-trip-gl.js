/* G32 Blippi -- GPU worlds for AIR and UDARA (owner 2026-10-26: "blippi udara, laut itu jelek, masih kurang detail dan
 * kurang immersive. Shader terrain or langitnya laut sangat kurang detail"; 2026-11-01: "shader bener2 detail semuanya,
 * bener2 detail super detail"). Two full-screen fragment shaders on ONE small offscreen WebGL canvas that the 2D renderers
 * blit like any other layer:
 *   sea   the water surface seen from above, every frame: choppy wave octaves (sharp crests, round troughs) give a real
 *         normal, lit by the world's sun (specular, sheen, glints) and sky (slope reflection of moving clouds); cloud
 *         shadows drift over it; whitecaps carry a lace of foam cells and old foam trails across the swell; a seabed at half
 *         parallax shows through the shallows (refracted by the waves): sand ripples, rocks, seagrass, coral or ice, under a
 *         net of caustic light
 *   land  the ground far below the plane: a height field per world, hill-shaded by the sun with ambient occlusion, and
 *         painted field by field: crop plots with furrows and hedgerows, single trees with their round canopies and cast
 *         shadows, villages of pitched roofs, winding roads, rivers with sandy banks, a coast with surf lines and boats;
 *         rock strata, scree and snow in the valley; dunes with crests and wind ripples; city blocks with roof kit, lane
 *         markings, crossings and cars; a night city of street-light grids and windows; a candy patchwork.
 *         It scrolls slowly (parallax 0.12), so it is rendered into a tall strip; the next strip is built a band per frame
 *         while the current one is shown (no hitch on a slow tablet), and every frame is one drawImage.
 * No WebGL, a lost context or a compile failure -> null, and the caller keeps its 2D scenery. */
;(function (w) {
  'use strict'
  var T = w.BlippiTrip
  if (!T) return
  var cv = null, gl = null, dead = false, quad = null, progs = {}

  function src (a) { return a.join('\n') + '\n' }
  var HEAD = src([
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 uRes; uniform float uS; uniform vec2 uOff; uniform float uT;',
    'float hsh(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'vec2 hsh2(vec2 p){ return vec2(hsh(p), hsh(p + 17.17)); }',
    'float nz(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);',
    '  return mix(mix(hsh(i), hsh(i + vec2(1.0, 0.0)), u.x), mix(hsh(i + vec2(0.0, 1.0)), hsh(i + vec2(1.0, 1.0)), u.x), u.y); }',
    'const mat2 RT = mat2(1.6, 1.2, -1.2, 1.6);',
    'float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * nz(p); p = RT * p; a *= 0.5; } return s; }',
    'float fbm3(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * nz(p); p = RT * p; a *= 0.5; } return s / 0.875; }',
    // voronoi: x = distance to the nearest cell point, y = gap to the second (0 on a cell edge); t animates the points
    'vec2 vor(vec2 p, float t){ vec2 n = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0;',
    '  for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) { vec2 g = vec2(float(i), float(j)); vec2 o = hsh2(n + g);',
    '    o = 0.5 + 0.45 * sin(t + 6.2831 * o); vec2 r = g + o - f; float d = dot(r, r);',
    '    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d; }',
    '  d1 = sqrt(d1); return vec2(d1, sqrt(d2) - d1); }'
  ])

  // ---- the sea surface ----
  var SEA = HEAD + src([
    'uniform vec3 uDeep, uShal, uBed, uSky, uSunC, uFoamC; uniform vec4 uK, uL, uM;',
    // uK: bed visibility, wave strength, caustics, foam   uL: sun screen x, y (0..1), specular, glitter
    // uM: cloud shadow, choppiness, foam lace / trails, bed type (0 sand, 1 coral, 2 seagrass, 3 ice)
    'float octv(vec2 uv, float ch){ uv += nz(uv); vec2 wv = 1.0 - abs(sin(uv)), sw = abs(cos(uv)); wv = mix(wv, sw, wv); return pow(1.0 - pow(wv.x * wv.y, 0.65), ch); }',
    'float seah(vec2 p, float t){ float fr = 2.6, am = 0.5, ch = uM.y, h = 0.0; vec2 uv = p * vec2(0.8, 1.0);',
    '  for (int i = 0; i < 5; i++) { h += (octv((uv + t) * fr, ch) + octv((uv - t) * fr, ch)) * am; uv = RT * uv * 0.5; fr *= 1.95; am *= 0.26; ch = mix(ch, 1.0, 0.2); }',
    '  return h; }',
    'void main(){',
    '  vec2 sc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    '  vec2 p = (sc + vec2(uOff.x, -uOff.y)) / uS;',
    '  float t = uT, st = t * 0.32;',
    // the wave field and its normal (central differences, one texel apart at the base scale)
    '  float e = 0.012, h = seah(p, st), hx = seah(p + vec2(e, 0.0), st), hy = seah(p + vec2(0.0, e), st);',
    '  vec2 g = vec2(hx - h, hy - h) / e * 0.055;',
    '  vec2 q = p * 3.4 + vec2(t * 0.3, -t * 0.45); float ee = 0.035;',
    '  float n0 = fbm3(q), nx = fbm3(q + vec2(ee, 0.0)), ny = fbm3(q + vec2(0.0, ee));',
    '  g += vec2(nx - n0, ny - n0) / ee * 0.035;',
    '  vec2 q2 = p * 13.0 + vec2(-t * 0.9, -t * 1.3); float m0 = nz(q2), mx = nz(q2 + vec2(0.05, 0.0)), my = nz(q2 + vec2(0.0, 0.05));',
    '  g += vec2(mx - m0, my - m0) / 0.05 * 0.016;',
    '  vec3 N = normalize(vec3(-g * uK.y, 1.0));',
    '  float hn = clamp(h / 1.25, 0.0, 1.0);',
    // the bed at half parallax, refracted by the surface slope
    '  vec2 bp = (sc + vec2(uOff.x * 0.5, -uOff.y * 0.5)) / uS * 0.8 + N.xy * 0.4;',
    '  float bed = fbm(bp * 0.45 + 7.0);',
    '  float sh = smoothstep(0.38, 0.72, bed) * uK.x;',
    '  vec3 col = mix(uDeep, uShal, clamp(sh + (1.0 - uK.x) * 0.3 + (hn - 0.4) * 0.35, 0.0, 1.0));',
    // the bed: sand ripples, rocks, then the world's own life
    '  if (uK.x > 0.01) {',
    '  float bt = fbm3(bp * 3.0), fine = nz(bp * 26.0);',
    '  float rip = 0.5 + 0.5 * sin(dot(bp, vec2(0.82, 0.57)) * 24.0 + fbm3(bp * 1.6) * 7.0);',
    '  vec3 bedc = uBed * (0.8 + 0.34 * bt) * (0.92 + 0.12 * rip) * (0.95 + 0.08 * fine);',
    '  vec2 rk = vor(bp * 1.5 + 3.1, 0.0); float rmask = smoothstep(0.55, 0.68, fbm3(bp * 0.9 + 5.3));',
    '  float rock = rmask * (1.0 - smoothstep(0.32, 0.4, rk.x));',
    '  bedc = mix(bedc, uBed * vec3(0.55, 0.55, 0.58) * (0.8 + 0.4 * nz(bp * 14.0)) * (0.7 + 0.5 * smoothstep(0.0, 0.3, rk.x)), rock);',
    '  bedc *= 1.0 - 0.35 * rmask * (1.0 - smoothstep(0.3, 0.46, rk.x)) * (1.0 - rock);',   // the rock's own shade on the sand
    '  if (uM.w > 0.5 && uM.w < 1.5) {',                                                      // coral: small round heads, each its colour, in patches
    '    float patch = smoothstep(0.42, 0.6, fbm3(bp * 0.7 + 2.0));',
    '    for (int k = 0; k < 2; k++) { vec2 cg = bp * (6.0 + float(k) * 3.5) + float(k) * 7.3; vec2 cc0 = floor(cg), cf = fract(cg) - 0.5 - (hsh2(cc0) - 0.5) * 0.3;',
    '      float cr = 0.2 + 0.16 * hsh(cc0 + 1.9); float dd = length(cf) / cr; float on = step(0.5, hsh(cc0 + 4.1)) * patch;',
    '      float pick = hsh(cc0 + 2.7); vec3 ccol = pick < 0.25 ? vec3(1.0, 0.52, 0.56) : pick < 0.5 ? vec3(1.0, 0.72, 0.36) : pick < 0.72 ? vec3(0.72, 0.52, 0.95) : pick < 0.88 ? vec3(0.96, 0.9, 0.5) : vec3(0.4, 0.8, 0.75);',
    '      float dome = sqrt(max(0.0, 1.0 - dd * dd)); float knob = 0.8 + 0.3 * smoothstep(0.35, 0.75, nz(cg * 7.0));',
    '      bedc *= 1.0 - 0.35 * on * (1.0 - smoothstep(1.0, 1.5, length(cf + vec2(0.08, 0.1)) / cr));',
    '      bedc = mix(bedc, ccol * (0.55 + 0.55 * dome) * knob, on * (1.0 - smoothstep(0.85, 1.0, dd))); } }',
    '  else if (uM.w > 1.5 && uM.w < 2.5) {',                                                 // seagrass meadows swaying
    '    float gm = smoothstep(0.48, 0.62, fbm3(bp * 0.8 + 4.0));',
    '    float blade = 0.5 + 0.5 * sin(bp.x * 70.0 + sin(bp.y * 9.0 + t * 1.4) * 2.2 + nz(bp * 8.0) * 6.0);',
    '    bedc = mix(bedc, vec3(0.2, 0.42, 0.22) * (0.7 + 0.5 * blade), gm * (0.75 + 0.25 * blade)); }',
    '  else if (uM.w > 2.5) {',                                                                // ice: cracked plates
    '    vec2 ic = vor(bp * 1.1, 0.0); bedc = mix(bedc, bedc * 0.6, 1.0 - smoothstep(0.0, 0.04, ic.y)); }',
    // caustics: two drifting nets of light
    '  vec2 cp = bp * 2.4; vec2 v1 = vor(cp + vec2(t * 0.12, t * 0.08), t * 0.9), v2 = vor(cp * 1.37 + 4.0 - vec2(t * 0.09, -t * 0.06), t * 1.1 + 2.0);',
    '  float ca = (1.0 - smoothstep(0.0, 0.085, v1.y)) * 0.7 + (1.0 - smoothstep(0.0, 0.06, v2.y)) * 0.45;',
    '  bedc += vec3(1.0, 1.0, 0.9) * ca * uK.z * (1.0 - rock * 0.5);',
    '  col = mix(col, min(bedc, vec3(1.0)), sh * 0.6);',
    '  }',
    // light that passes through the crests: the shallow colour glows in the wave tops facing the sun
    '  vec2 toS = (uL.xy * uRes - sc) / uRes.y;',
    '  vec3 L = normalize(vec3(toS, 0.75)); vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));',
    '  col += uShal * smoothstep(0.55, 1.0, hn) * 0.22 * (0.5 + 0.5 * clamp(dot(N.xy, normalize(toS + 1e-4)) * 4.0, -1.0, 1.0));',
    // slope reflection: the sky with its clouds, mirrored by each facet
    '  float fr = clamp((1.0 - N.z) * 6.0, 0.0, 1.0);',
    '  vec2 rf = p * 0.32 + N.xy * 2.6 + vec2(t * 0.02, t * 0.012);',
    '  float cl = smoothstep(0.48, 0.78, fbm3(rf));',
    '  col = mix(col, mix(uSky, vec3(1.0), cl * 0.55), fr * 0.5);',
    // cloud shadows drifting across the sea
    '  float cs = smoothstep(0.42, 0.72, fbm(p * 0.13 + vec2(t * 0.035, t * 0.02))) * uM.x;',
    '  col *= 1.0 - 0.3 * cs;',
    // sun: tight specular, broad sheen, and twinkling glints on the facets that face it
    '  float ndh = max(dot(N, Hh), 0.0);',
    '  float sp = (pow(ndh, 180.0) + 0.12 * pow(ndh, 18.0)) * uL.z * (1.0 - cs * 0.8);',
    '  float near = smoothstep(1.0, 0.0, length(toS));',
    '  vec2 gp = p * 34.0; vec2 gc = floor(gp), gf = fract(gp) - 0.5;',
    '  float gs = step(0.93, hsh(gc + floor(t * 5.0 + hsh(gc) * 7.0))) * smoothstep(0.985, 1.0, ndh + 0.02);',
    '  float star = gs * (smoothstep(0.08, 0.0, abs(gf.x) * (0.4 + abs(gf.y) * 9.0)) + smoothstep(0.08, 0.0, abs(gf.y) * (0.4 + abs(gf.x) * 9.0)));',
    '  float gli = (smoothstep(0.88, 1.0, nz(p * 26.0 + vec2(t * 2.3, -t * 1.7)) * (0.6 + 0.4 * fr)) * 0.6 + star) * near * uL.w;',
    '  col += uSunC * (sp * (0.25 + 0.6 * near) + gli * 1.2);',
    '  col *= 0.9 + 0.2 * (N.x * 0.5 - N.y * 0.8);',
    // foam: whitecaps on the crests with a lace of cells, and old foam trails drifting over the swell
    '  vec2 lc = vor(p * 5.0 + vec2(fbm3(p * 2.0), fbm3(p * 2.0 + 5.1)) * 1.6 + vec2(t * 0.08, -t * 0.12), t * 0.5);',
    '  float lace = (1.0 - smoothstep(0.0, 0.08, lc.y)) * (0.4 + 0.6 * nz(p * 14.0 + t * 0.3));',
    '  float cap = smoothstep(0.6, 0.92, hn + (fbm3(p * 2.4 + t * 0.15) - 0.5) * 0.45);',
    '  float fl = smoothstep(0.38, 0.7, fbm3(vec2(p.x * 4.0, p.y * 1.6) + vec2(t * 0.3, -t * 0.6)));',
    '  float foam = cap * (0.4 + 0.6 * lace) * (0.55 + 0.45 * fl) * uK.w * 1.6;',
    '  vec2 wq = p * 2.2 + vec2(fbm3(p * 1.3), fbm3(p * 1.3 + 3.7)) * 1.4 + vec2(0.0, t * 0.04);',
    '  vec2 tl = vor(wq, t * 0.15);',
    '  float trail = (1.0 - smoothstep(0.0, 0.03, tl.y)) * smoothstep(0.55, 0.8, fbm3(p * 0.7 + vec2(t * 0.02, 0.0))) * (0.5 + 0.5 * nz(p * 9.0)) * uM.z;',
    '  col = mix(col, uFoamC, clamp(foam + trail * 0.35, 0.0, 1.0));',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ])

  // ---- the ground far below ----
  var LAND = HEAD + src([
    'uniform float uKind; uniform vec3 uHaze; uniform float uHazeA; uniform vec2 uSun;',
    'float terr(vec2 p){ vec2 q = vec2(fbm3(p * 0.22), fbm3(p * 0.22 + vec2(5.2, 1.3))); return fbm(p * 0.3 + q * 1.6); }',
    'float ridge(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * (1.0 - abs(nz(p) * 2.0 - 1.0)); p = RT * p; a *= 0.5; } return s; }',
    'float detail(vec2 p){ return (fbm3(p * 2.6) - 0.5) * 0.06 + (nz(p * 9.0) - 0.5) * 0.008; }',
    'float dune(vec2 p){ vec2 d = vec2(0.94, 0.34); float w = fbm3(p * 0.22) * 2.4 + 0.45 * sin(dot(p, vec2(-d.y, d.x)) * 1.6 + fbm3(p * 0.5) * 3.0);',   // transverse dunes: a long gentle windward slope, a short steep slip face, sinuous crests that break
    '  float f = fract(dot(p, d) * 0.8 + w); float pr = smoothstep(0.0, 0.7, f) * (1.0 - smoothstep(0.7, 1.0, f));',
    '  return pr * (0.5 + 0.5 * smoothstep(0.25, 0.75, fbm3(p * 0.3 + 5.0))); }',
    'float height(vec2 p){',
    '  if (uKind < 0.5) return terr(p) + detail(p) * 0.6;',                                               // bay
    '  if (uKind < 1.5) return terr(p * 0.8) * 0.6;',                                                     // candy
    '  if (uKind < 2.5) return terr(p) * 0.7;',                                                           // night lights
    '  if (uKind < 3.5) { float r = ridge(p * 0.42 + vec2(fbm3(p * 0.2) * 1.5)); return pow(r, 2.6) + detail(p) * 0.7; }',   // valley
    '  if (uKind < 4.5) { float w = fbm3(p * 0.18); float rp = sin(p.x * 30.0 + p.y * 11.0 + w * 20.0 + nz(p * 3.0) * 3.0) * 0.003;',
    '    return dune(p) * 0.3 + dune(p * 2.3 + 3.3) * 0.025 + rp + detail(p) * 0.3 + smoothstep(0.66, 0.7, terr(p * 0.6)) * 0.5; }',   // desert
    '  return 0.0;',                                                                                       // city: flat
    '}',
    // one round tree per cell: cover, sun shade on the round canopy, its cast shadow, an id
    'vec4 tree(vec2 p, float sz, float dens, vec3 L){',
    '  vec2 g = p * sz, c = floor(g), f = fract(g) - 0.5; vec2 o = (hsh2(c) - 0.5) * 0.36; float r = 0.22 + 0.1 * hsh(c + 3.7);',
    '  float on = step(1.0 - dens, hsh(c + 1.3)); vec2 d = (f - o) / r; float qq = dot(d, d);',
    '  float cov = on * (1.0 - smoothstep(0.72, 1.0, qq));',
    '  vec3 n = normalize(vec3(d * 0.9, sqrt(max(0.0, 1.0 - qq)) + 0.15)); float lit = clamp(dot(n, L), 0.0, 1.0);',
    '  vec2 ds = (f - o + L.xy * r * 0.7) / r; float shd = on * (1.0 - smoothstep(0.6, 1.0, dot(ds, ds)));',
    '  return vec4(cov, lit, shd, hsh(c + 5.1)); }',
    'vec3 canopy(vec4 a, vec3 dark, vec3 light, vec3 base){ vec3 c = mix(base, base * 0.55, a.z); vec3 cc = mix(dark, light, a.y) * (0.85 + 0.3 * a.w); return mix(c, cc, a.x); }',
    // a house per cell: cover, the lit or shaded half of its pitched roof, its shadow, an id; ridge = on the ridge line
    'vec4 house(vec2 p, float sz, vec3 L, out float ridgeL){',
    '  vec2 g = p * sz, c = floor(g), f = fract(g) - 0.5;',
    '  vec2 hs = vec2(0.2 + 0.1 * hsh(c + 4.4), 0.12 + 0.06 * hsh(c + 5.5)); float sw = step(0.5, hsh(c + 6.6)); hs = mix(hs, hs.yx, sw);',
    '  vec2 o = (hsh2(c + 7.7) - 0.5) * 0.16; vec2 lf = f - o; vec2 qq = abs(lf) - hs;',
    '  float cov = 1.0 - smoothstep(-0.012, 0.012, max(qq.x, qq.y));',
    '  float across = mix(lf.y, lf.x, sw); vec2 ax = mix(vec2(0.0, 1.0), vec2(1.0, 0.0), sw);',
    '  float lit = 0.72 + 0.4 * sign(across) * dot(ax, normalize(L.xy + 1e-4));',
    '  ridgeL = 1.0 - smoothstep(0.006, 0.016, abs(across));',
    '  vec2 qs = abs(lf + L.xy * 0.1) - hs; float shd = 1.0 - smoothstep(-0.012, 0.012, max(qs.x, qs.y));',
    '  return vec4(cov, lit, shd, hsh(c + 2.2)); }',
    'vec3 roofCol(float id){ return id < 0.35 ? vec3(0.78, 0.36, 0.24) : id < 0.55 ? vec3(0.86, 0.3, 0.22) : id < 0.75 ? vec3(0.4, 0.42, 0.48) : id < 0.88 ? vec3(0.92, 0.88, 0.8) : vec3(0.36, 0.5, 0.68); }',
    // crop plots: warped grid, each plot its crop, furrows one way or the other, a hedgerow round it
    'vec3 plots(vec2 p, float sz, vec3 L, out float hedge){',
    '  vec2 wp = p + vec2(fbm3(p * 0.3), fbm3(p * 0.3 + 4.0)) * 0.9; vec2 gq = wp * sz;',
    '  float sub = step(0.5, hsh(floor(gq) + 9.0)); vec2 g2 = gq * vec2(1.0 + sub, 1.0); vec2 c = floor(g2), f = fract(g2);',
    '  float r = hsh(c + 0.7), dir = step(0.5, hsh(c + 2.0));',
    '  vec3 col = r < 0.22 ? vec3(0.46, 0.7, 0.28) : r < 0.4 ? vec3(0.34, 0.56, 0.22) : r < 0.56 ? vec3(0.86, 0.76, 0.42) : r < 0.68 ? vec3(0.6, 0.45, 0.3) : r < 0.78 ? vec3(0.92, 0.86, 0.3) : r < 0.9 ? vec3(0.62, 0.78, 0.4) : vec3(0.52, 0.66, 0.36);',
    '  float fur = 0.5 + 0.5 * sin(mix(f.x * (1.0 + sub), f.y, dir) * 70.0);',
    '  col *= mix(0.94 + 0.1 * fur, 0.82 + 0.3 * fur, step(0.56, r) * step(r, 0.68));',
    '  col *= 0.92 + 0.12 * nz(p * 22.0) + 0.06 * nz(p * 60.0);',
    '  vec2 dd = min(f, 1.0 - f) * vec2(1.0 / (1.0 + sub), 1.0); float d = min(dd.x, dd.y);',
    '  hedge = (1.0 - smoothstep(0.018, 0.034, d)) * step(0.3, hsh(c + 11.0)) * (0.7 + 0.5 * nz(p * 48.0));',
    '  float hs = (1.0 - smoothstep(0.03, 0.06, d)) * (1.0 - hedge);',
    '  return col * (1.0 - 0.18 * hs); }',
    'float road(vec2 p, float s, vec2 o){ float r = abs(fbm3(p * s + o) - 0.5); return 1.0 - smoothstep(0.0045, 0.0075, r); }',
    'void main(){',
    '  vec2 sc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);',
    '  vec2 p = (sc + vec2(uOff.x, -uOff.y)) / uS;',
    '  float e = 0.02, h = height(p), hx = height(p + vec2(e, 0.0)), hy = height(p + vec2(0.0, e));',
    '  vec3 N = normalize(vec3(-(hx - h) / e * 2.4, -(hy - h) / e * 2.4, 1.0));',
    '  vec3 L = normalize(vec3(uSun - vec2(0.5, 0.5), 0.55));',
    '  float hb = (height(p + vec2(0.16, 0.0)) + height(p - vec2(0.16, 0.0)) + height(p + vec2(0.0, 0.16)) + height(p - vec2(0.0, 0.16))) * 0.25;',
    '  float ao = 1.0 - clamp((hb - h) * 4.0, 0.0, 0.3);',
    '  float dif = clamp(dot(N, L), 0.0, 1.0), sh = (0.55 + 0.6 * dif) * ao;',
    '  float rv = abs(fbm3(p * 0.16 + 3.7) - 0.5); float riv = 1.0 - smoothstep(0.012, 0.02, rv), bank = (1.0 - smoothstep(0.02, 0.028, rv)) * (1.0 - riv);',
    '  vec3 col; float fine = nz(p * 14.0), fine2 = nz(p * 38.0), hg = 0.0, rl = 0.0;',
    '  vec4 tr = tree(p, 15.0, 1.0, L), tr2 = tree(p + 0.37, 21.0, 1.0, L);',
    '  if (uKind < 0.5) {',                                                                  // bay: sea, beaches, plots, woods, villages, roads
    '    float sea = 0.41;',
    '    if (h < sea) { float dd = smoothstep(sea, sea - 0.13, h); col = mix(vec3(0.38, 0.8, 0.84), vec3(0.08, 0.38, 0.64), dd);',
    '      col *= 0.9 + 0.08 * nz(vec2(p.x * 6.0, p.y * 18.0) + fbm3(p) * 4.0) + 0.06 * nz(vec2(p.x * 14.0, p.y * 40.0) + fbm3(p * 2.0) * 6.0);',
    '      col = mix(col, col * 1.12 + 0.04, (1.0 - dd) * smoothstep(0.4, 0.7, fbm3(p * 3.0)) * 0.6);',                       // sand under the shallows
    '      float sl = sin((sea - h) * 260.0 - fbm3(p * 1.5) * 4.0); col = mix(col, vec3(0.97), smoothstep(0.8, 1.0, sl) * smoothstep(0.05, 0.0, sea - h) * 0.55);',   // surf lines parallel to the shore
    '      col = mix(col, vec3(0.97), smoothstep(0.012, 0.0, sea - h) * 0.85);',
    '      vec2 bg = p * 1.6 + vec2(0.0, 3.0); vec2 bc = floor(bg), bf = fract(bg) - 0.5 - (hsh2(bc) - 0.5) * 0.5;',            // boats with their wakes
    '      float isb = step(0.78, hsh(bc + 8.0)) * step(0.5, dd); vec2 bq = abs(bf) - vec2(0.028, 0.075);',
    '      float boat = isb * (1.0 - smoothstep(0.0, 0.01, length(max(bq, 0.0)) - 0.01));',
    '      float wy = bf.y - 0.08; float wk = isb * step(0.0, wy) * (1.0 - smoothstep(0.0, 0.02 + wy * 0.08, abs(abs(bf.x) - wy * 0.32))) * smoothstep(0.3, 0.0, wy);',
    '      wk = max(wk, isb * step(0.0, wy) * (1.0 - smoothstep(0.0, 0.03, abs(bf.x))) * smoothstep(0.2, 0.0, wy) * (0.6 + 0.4 * nz(bf * 40.0)));',
    '      col = mix(col, vec3(0.92, 0.96, 1.0), wk * 0.7); col = mix(col, mix(vec3(0.95), vec3(0.85, 0.25, 0.2), step(0.6, hsh(bc))) * (0.85 + 0.15 * step(abs(bf.x), 0.012)), boat);',
    '      sh = 1.0; }',
    '    else if (h < sea + 0.022) { float wet = smoothstep(sea + 0.008, sea, h); col = mix(vec3(0.94, 0.87, 0.67), vec3(0.78, 0.7, 0.52), wet) * (0.95 + 0.08 * fine2);',
    '      vec2 ug = p * 22.0; vec2 uc = floor(ug); float um = step(0.93, hsh(uc)) * (1.0 - smoothstep(0.12, 0.18, length(fract(ug) - 0.5))) * (1.0 - wet);',
    '      col = mix(col, mix(vec3(1.0, 0.4, 0.35), vec3(0.3, 0.6, 1.0), step(0.5, hsh(uc + 1.0))), um); }',
    '    else { col = plots(p, 2.6, L, hg);',
    '      col = canopy(vec4(hg * tr2.x, tr2.y, tr2.z * hg, tr2.w), vec3(0.1, 0.26, 0.12), vec3(0.32, 0.56, 0.24), col);',
    '      float wood = smoothstep(0.5, 0.58, fbm3(p * 0.9 + 9.0));',
    '      vec3 fl = vec3(0.12, 0.24, 0.12) * (0.8 + 0.3 * fine2);',
    '      col = mix(col, canopy(max(tr, vec4(tr2.x * 0.9, tr2.yzw)), vec3(0.08, 0.24, 0.11), vec3(0.3, 0.55, 0.24), fl), wood);',
    '      float town = smoothstep(0.6, 0.66, fbm3(p * 0.7 + 21.0)) * step(h, sea + 0.12) * (1.0 - wood);',
    '      vec4 hs = house(p, 9.0, L, rl); float hon = town * step(0.25, hsh(floor(p * 9.0) + 3.0));',
    '      col = mix(col, vec3(0.72, 0.7, 0.62) * (0.9 + 0.1 * fine2), town * 0.6);',
    '      col *= 1.0 - 0.35 * hs.z * hon * (1.0 - hs.x);',
    '      col = mix(col, roofCol(hs.w) * hs.y * (1.0 - 0.3 * rl), hs.x * hon);',
    '      float rd = road(p, 0.2, vec2(13.0, 7.0)) * (1.0 - wood * 0.7); col = mix(col, vec3(0.62, 0.6, 0.56), rd);',
    '      col = mix(col, vec3(0.86, 0.78, 0.6), bank); col = mix(col, vec3(0.3, 0.62, 0.8) * (0.92 + 0.12 * fine), riv);',
    '      col = mix(col, vec3(0.62, 0.6, 0.55) * (0.85 + 0.25 * fine), smoothstep(0.66, 0.74, h)); }',
    '  } else if (uKind < 1.5) {',                                                           // candy: pastel plots, cane stripes, sprinkles, lollipop trees, a chocolate river
    '    vec2 wp = p * 0.8 + vec2(fbm3(p * 0.4)) * 1.4; vec2 c = floor(wp * 1.4), f = fract(wp * 1.4); float r = hsh(c);',
    '    col = r < 0.25 ? vec3(1.0, 0.74, 0.86) : r < 0.5 ? vec3(0.66, 0.92, 0.82) : r < 0.7 ? vec3(1.0, 0.93, 0.62) : r < 0.85 ? vec3(0.82, 0.74, 1.0) : vec3(0.7, 0.86, 1.0);',
    '    float cane = step(0.6, hsh(c + 3.0)) * step(0.5, fract((f.x + f.y) * 7.0)); col = mix(col, vec3(1.0), cane * 0.65);',
    '    float fro = 0.5 + 0.5 * sin(length(f - 0.5) * 60.0 - atan(f.y - 0.5, f.x - 0.5) * 3.0); col *= 0.94 + 0.08 * fro * step(hsh(c + 3.0), 0.6);',
    '    vec2 dd = min(f, 1.0 - f); col = mix(col, vec3(1.0, 0.97, 0.94), 1.0 - smoothstep(0.015, 0.03, min(dd.x, dd.y)));',
    '    vec2 sg = p * 30.0, scc = floor(sg), sf = fract(sg) - 0.5; float an = hsh(scc) * 3.1416; vec2 rr = vec2(cos(an) * sf.x + sin(an) * sf.y, -sin(an) * sf.x + cos(an) * sf.y);',
    '    float spr = step(0.72, hsh(scc + 2.0)) * (1.0 - smoothstep(0.0, 0.03, max(abs(rr.x) - 0.16, abs(rr.y) - 0.04)));',
    '    float sp2 = hsh(scc + 4.0); col = mix(col, sp2 < 0.33 ? vec3(1.0, 0.35, 0.55) : sp2 < 0.66 ? vec3(0.35, 0.65, 1.0) : vec3(1.0, 0.8, 0.2), spr);',
    '    vec2 lg = p * 5.0, lc = floor(lg), lf2 = fract(lg) - 0.5; float lo = step(0.8, hsh(lc + 6.0)); float ld = length(lf2);',
    '    float sw = 0.5 + 0.5 * sin(ld * 90.0 - atan(lf2.y, lf2.x) * 2.0);',
    '    col *= 1.0 - 0.3 * lo * (1.0 - smoothstep(0.18, 0.26, length(lf2 + L.xy * 0.08)));',
    '    col = mix(col, mix(vec3(1.0, 0.4, 0.6), vec3(1.0), sw), lo * (1.0 - smoothstep(0.17, 0.19, ld)));',
    '    col = mix(col, vec3(0.62, 0.42, 0.3), bank); col = mix(col, vec3(0.45, 0.26, 0.16) * (0.85 + 0.25 * fine) + 0.25 * smoothstep(0.7, 0.9, nz(p * 20.0)) * riv, riv);',
    '  } else if (uKind < 2.5) {',                                                           // night: dark land, a street-light grid, windows, highways, rivers holding the lights
    '    col = mix(vec3(0.05, 0.08, 0.15), vec3(0.09, 0.13, 0.21), h) * (0.85 + 0.25 * fine); sh = 0.75 + 0.35 * dif;',
    '    col = mix(col, vec3(0.06, 0.12, 0.26), riv);',
    '    float city = smoothstep(0.5, 0.64, fbm3(p * 0.35 + 2.0));',
    '    vec2 wp = p + vec2(fbm3(p * 0.4)) * 0.3; vec2 g = wp * 4.0, c = floor(g), f = fract(g); vec2 dd = min(f, 1.0 - f);',
    '    float st = (1.0 - smoothstep(0.0, 0.02, min(dd.x, dd.y))) * city;',
    '    float lamp = st * smoothstep(0.82, 1.0, sin((f.x + f.y) * 60.0));',
    '    vec2 wg = p * 30.0, wc = floor(wg), wf = fract(wg); float win = step(0.86, hsh(wc)) * smoothstep(0.55, 0.75, fbm3(p * 1.2 + 9.0)) * step(0.2, wf.x) * step(wf.x, 0.8) * step(0.25, wf.y) * step(wf.y, 0.75) * city * (1.0 - st);',
    '    float hw = road(p, 0.14, vec2(5.0, 1.0)); float hwL = hw * step(0.5, fract(p.y * 3.0 + p.x * 1.5 + hsh(floor(p * 2.0)) ));',
    '    vec3 warm = vec3(1.0, 0.75, 0.4), cool = vec3(0.75, 0.85, 1.0);',
    '    col += warm * (st * 0.16 + lamp * 1.4) + mix(warm, cool, hsh(wc + 1.0)) * win * 0.7 + vec3(1.0, 0.9, 0.7) * hw * 0.35 + vec3(1.0, 0.3, 0.25) * hwL * 0.5;',
    '    col += warm * city * 0.08 * fbm3(p * 1.5);',
    '    vec2 vg = p * 9.0, vc = floor(vg), vf = fract(vg) - 0.5 - (hsh2(vc) - 0.5) * 0.6; float vil = step(0.55, hsh(vc + 3.3)) * (1.0 - city) * (1.0 - riv);',   // villages: little clusters of house lights
    '    vec2 hg2 = vf * 7.0; vec2 hc2 = floor(hg2); float hl = step(0.55, hsh(hc2 + vc)) * (1.0 - smoothstep(0.05, 0.16, length(fract(hg2) - 0.5))) * (1.0 - smoothstep(0.25, 0.45, length(vf)));',
    '    col += mix(warm, vec3(1.0, 0.95, 0.8), hsh(hc2 + vc + 1.0)) * hl * vil * 1.2;',
    '    col += warm * vil * 0.06 * (1.0 - smoothstep(0.1, 0.45, length(vf)));',                                                    // the city's glow
    '    col += warm * riv * city * 0.25 * smoothstep(0.6, 0.9, nz(vec2(p.x * 40.0, p.y * 4.0)));',      // lights rippling in the river
    '  } else if (uKind < 3.5) {',                                                           // valley: plots, forests on the slopes, villages, rock strata, scree, snow, lakes, rivers
    '    col = plots(p * 1.1, 2.2, L, hg);',
    '    float wood = smoothstep(0.07, 0.25, h) * smoothstep(0.62, 0.5, h) * smoothstep(0.38, 0.55, fbm3(p * 1.2));',
    '    vec3 fl = vec3(0.1, 0.22, 0.12) * (0.8 + 0.3 * fine2);',
    '    col = canopy(vec4(hg * tr2.x, tr2.y, tr2.z * hg, tr2.w), vec3(0.08, 0.24, 0.12), vec3(0.3, 0.54, 0.24), col);',
    '    vec4 cn = tree(p + 0.11, 26.0, 1.0, L);',
    '    col = mix(col, canopy(max(max(tr, cn), vec4(tr2.x * 0.9, tr2.yzw)), vec3(0.06, 0.2, 0.12), vec3(0.24, 0.48, 0.24), fl), wood);',
    '    float vil = smoothstep(0.62, 0.68, fbm3(p * 0.7 + 21.0)) * smoothstep(0.12, 0.04, h) * (1.0 - wood);',
    '    vec4 hs = house(p, 10.0, L, rl); float hon = vil * step(0.3, hsh(floor(p * 10.0) + 3.0));',
    '    col *= 1.0 - 0.35 * hs.z * hon * (1.0 - hs.x); col = mix(col, roofCol(hs.w) * hs.y * (1.0 - 0.3 * rl), hs.x * hon);',
    '    float strata = 0.9 + 0.1 * sin(h * 55.0 + fbm3(p * 1.5) * 3.0);',
    '    float rockM = smoothstep(0.56, 0.7, h + (1.0 - N.z) * 0.16);',
    '    vec3 rock = mix(vec3(0.5, 0.47, 0.42), vec3(0.62, 0.57, 0.5), fbm3(p * 3.0)) * (0.86 + 0.2 * fine2) * strata;',
    '    float scree = smoothstep(0.55, 0.75, nz(p * 30.0)) * smoothstep(0.4, 0.5, h) * smoothstep(0.62, 0.5, h);',
    '    col = mix(col, mix(rock, vec3(0.68, 0.64, 0.58), scree * 0.6), rockM);',
    '    float snow = smoothstep(0.66, 0.72, h + fine * 0.05 + N.z * 0.04 - 0.04);',
    '    col = mix(col, mix(vec3(0.72, 0.8, 0.95), vec3(0.97, 0.98, 1.0), dif) * (0.95 + 0.06 * fine2), snow); sh = mix(sh, 0.9 + 0.12 * dif, snow);',
    '    float lake = smoothstep(0.035, 0.025, h); col = mix(col, vec3(0.86, 0.8, 0.62), smoothstep(0.045, 0.035, h) * (1.0 - lake)); col = mix(col, mix(vec3(0.24, 0.55, 0.78), vec3(0.4, 0.72, 0.88), fbm3(p * 3.0)), lake);',
    '    float rr = riv * smoothstep(0.3, 0.1, h), bb = bank * smoothstep(0.3, 0.1, h);',
    '    col = mix(col, vec3(0.82, 0.76, 0.6), bb); col = mix(col, vec3(0.3, 0.6, 0.85) * (0.92 + 0.12 * fine), rr);',
    '    float rd = road(p, 0.2, vec2(13.0, 7.0)) * smoothstep(0.35, 0.2, h) * (1.0 - lake); col = mix(col, vec3(0.6, 0.58, 0.54), rd);',
    '  } else if (uKind < 4.5) {',                                                           // desert: dunes with crests and wind ripples, mesas, rocks, an oasis, a track
    '    float du = dune(p);',
    '    col = mix(vec3(0.86, 0.6, 0.36), vec3(0.99, 0.85, 0.6), clamp(h * 4.5, 0.0, 1.0)) * (0.95 + 0.08 * fine2); sh = (0.6 + 0.6 * dif) * ao;',
    '    float crest = smoothstep(0.8, 0.97, du); col = mix(col, vec3(1.0, 0.93, 0.78), crest * 0.35);',
    '    float rip = 0.5 + 0.5 * sin(p.x * 120.0 + p.y * 40.0 + fbm3(p * 2.0) * 9.0); col *= 0.97 + 0.04 * rip * smoothstep(0.2, 0.6, du);',
    '    float mesa = smoothstep(0.66, 0.7, terr(p * 0.6)); float mstr = 0.9 + 0.1 * sin(h * 70.0 + fine * 2.0);',
    '    col = mix(col, vec3(0.74, 0.42, 0.28) * (0.85 + 0.3 * fine) * mstr, mesa);',
    '    vec2 rc4 = floor(p * 4.0), rq4 = fract(p * 4.0) - (0.5 + (hsh2(rc4 + 3.0) - 0.5) * 0.4); float on4 = step(0.982, hsh(rc4 + 1.0));',   // a rare boulder: one lumpy stone with its own shadow cast away from the sun
    '    float rr = 0.1 + 0.06 * hsh(rc4 + 9.0) + 0.02 * nz(p * 22.0); float rock = on4 * (1.0 - smoothstep(rr - 0.02, rr, length(rq4)));',
    '    col *= 1.0 - 0.32 * on4 * (1.0 - smoothstep(rr - 0.03, rr + 0.03, length(rq4 + L.xy * 0.07))) * (1.0 - rock);',
    '    col = mix(col, vec3(0.56, 0.4, 0.3) * (0.75 + 0.5 * clamp(0.5 - dot(rq4 / rr, L.xy) * 0.5, 0.0, 1.0)) * (0.85 + 0.3 * nz(p * 30.0)), rock);',
    '    float oz = fbm3(p * 0.5 + 11.0); float oa = smoothstep(0.76, 0.8, oz);',
    '    col = mix(col, vec3(0.55, 0.62, 0.3), oa * 0.8); col = mix(col, canopy(vec4(tr.x * oa, tr.yzw), vec3(0.12, 0.34, 0.14), vec3(0.4, 0.66, 0.26), col), oa);',
    '    col = mix(col, mix(vec3(0.16, 0.56, 0.7), vec3(0.3, 0.75, 0.8), fine), smoothstep(0.85, 0.87, oz));',
    '    float tk = road(p, 0.12, vec2(2.0, 9.0)) * (1.0 - mesa); col = mix(col, col * 0.82, tk);',
    '  } else {',                                                                            // city: blocks, avenues, roof kit, lane marks, crossings, cars, street trees, parks, a river with bridges
    '    vec2 b = p * 2.4; vec2 cel = floor(b), f2 = fract(b);',
    '    float av = step(mod(cel.x, 4.0), 0.5) * step(f2.x, 0.16) + step(mod(cel.y, 4.0), 0.5) * step(f2.y, 0.16);',
    '    float stx = 1.0 - step(0.08, f2.x), sty = 1.0 - step(0.08, f2.y); float st = max(stx, sty);',
    '    float walk = (1.0 - step(0.1, f2.x) * step(0.1, f2.y)) * (1.0 - st) + (step(0.9, f2.x) + step(0.9, f2.y)) * 0.0;',
    '    vec2 lot = floor(f2 * 2.0), lf = fract(f2 * 2.0); float r = hsh(cel * 3.0 + lot), ht = 0.3 + 0.7 * hsh(cel * 7.0 + lot);',
    '    vec3 roof = mix(vec3(0.8, 0.5, 0.4), vec3(0.88, 0.86, 0.82), step(0.45, r)); roof = mix(roof, vec3(0.42, 0.55, 0.7), step(0.82, r));',
    '    float m = 0.12 + 0.1 * (1.0 - ht);',
    '    float bld = step(m, lf.x) * step(m, lf.y) * step(lf.x, 1.0 - m) * step(lf.y, 1.0 - m);',
    '    vec2 so = lf + L.xy * 0.14 * ht;',
    '    float shw = step(m, so.x) * step(m, so.y) * step(so.x, 1.0 - m) * step(so.y, 1.0 - m) * (1.0 - bld);',
    '    float edgeL = smoothstep(0.0, 0.05, min(min(lf.x - m, lf.y - m), min(1.0 - m - lf.x, 1.0 - m - lf.y)));',
    '    col = vec3(0.6, 0.62, 0.62) * (0.95 + 0.08 * fine2);',
    '    col *= 1.0 - 0.45 * shw;',
    '    vec3 rc = roof * (0.8 + 0.25 * ht) * (0.94 + 0.08 * fine2);',
    '    rc = mix(rc * 1.12, rc, smoothstep(0.0, 0.5, edgeL));',                                           // the parapet catches the light
    '    float kind = hsh(cel * 5.0 + lot + 0.3); vec2 rq = fract(lf * 3.0 + hsh(cel + lot) * 2.0);',
    '    float unit = step(0.35, hsh(floor(lf * 3.0) + cel * 9.0 + lot)) * step(0.25, rq.x) * step(rq.x, 0.75) * step(0.25, rq.y) * step(rq.y, 0.75) * step(0.3, edgeL);',
    '    rc = mix(rc, vec3(0.86, 0.87, 0.88), unit * 0.8 * step(kind, 0.55)); rc *= 1.0 - 0.25 * step(0.75, rq.y) * step(rq.y, 0.85) * unit * step(kind, 0.55);',
    '    vec2 pv = fract(lf * vec2(8.0, 5.0)); float solar = step(0.55, kind) * step(kind, 0.75) * step(0.3, edgeL) * step(0.1, pv.x) * step(0.12, pv.y);',
    '    rc = mix(rc, vec3(0.2, 0.3, 0.5) + 0.12 * step(0.5, pv.y), solar);',
    '    float gardn = step(0.75, kind) * step(kind, 0.85) * step(0.4, edgeL); rc = mix(rc, vec3(0.36, 0.6, 0.3) * (0.8 + 0.4 * nz(lf * 30.0 + cel)), gardn);',
    '    float pool = step(0.85, kind) * step(kind, 0.92) * step(0.32, lf.x) * step(lf.x, 0.68) * step(0.38, lf.y) * step(lf.y, 0.62); rc = mix(rc, vec3(0.3, 0.8, 0.9), pool);',
    '    col = mix(col, rc, bld);',
    '    float park = step(0.88, hsh(cel + 5.0));',
    '    vec3 pk = canopy(vec4(tr.x * 0.9, tr.yzw), vec3(0.14, 0.34, 0.16), vec3(0.36, 0.6, 0.26), vec3(0.4, 0.64, 0.32) * (0.9 + 0.15 * fine2));',
    '    pk = mix(pk, vec3(0.82, 0.78, 0.68), 1.0 - smoothstep(0.01, 0.02, abs(f2.x - f2.y)));',
    '    col = mix(col, pk, park * (1.0 - st));',
    '    col = mix(col, vec3(0.74, 0.74, 0.72), walk * (1.0 - park));',
    '    float rdm = clamp(st + av, 0.0, 1.0);',
    '    vec3 asph = vec3(0.4, 0.42, 0.45) * (0.95 + 0.08 * fine2);',
    '    float cx = stx * (1.0 - sty), cy = sty * (1.0 - stx);',
    '    float dash = cx * (1.0 - smoothstep(0.003, 0.006, abs(f2.x - 0.04))) * step(0.5, fract(f2.y * 12.0)) + cy * (1.0 - smoothstep(0.003, 0.006, abs(f2.y - 0.04))) * step(0.5, fract(f2.x * 12.0));',
    '    float zeb = stx * sty * 0.0 + (stx * step(0.08, f2.y) * step(f2.y, 0.16) + sty * step(0.08, f2.x) * step(f2.x, 0.16)) * step(0.5, fract((stx > 0.5 ? f2.x : f2.y) * 60.0));',
    '    asph = mix(asph, vec3(0.95, 0.93, 0.82), clamp(dash + zeb * 0.9, 0.0, 1.0));',
    '    vec2 cg = vec2(cx > 0.5 ? f2.x : f2.y, cx > 0.5 ? f2.y : f2.x); float lane = step(0.04, cg.x); vec2 cid = cel + vec2(lane, floor(cg.y * 10.0) * 0.1);',
    '    float car = step(0.62, hsh(cid * 1.7)) * (1.0 - smoothstep(0.0, 0.004, max(abs(fract(cg.y * 10.0) - 0.5) * 0.1 - 0.016, abs(cg.x - mix(0.02, 0.06, lane)) - 0.009))) * max(cx, cy);',
    '    float cc = hsh(cid + 3.0); vec3 carc = cc < 0.3 ? vec3(0.9, 0.2, 0.2) : cc < 0.5 ? vec3(0.95) : cc < 0.7 ? vec3(0.2, 0.45, 0.85) : cc < 0.85 ? vec3(1.0, 0.8, 0.2) : vec3(0.2, 0.22, 0.25);',
    '    asph = mix(asph, carc, car);',
    '    col = mix(col, asph, rdm);',
    '    vec4 strT = tree(p, 24.0, 1.0, L); float avT = step(mod(cel.x, 4.0), 0.5) * step(0.09, f2.x) * step(f2.x, 0.16) + step(mod(cel.y, 4.0), 0.5) * step(0.09, f2.y) * step(f2.y, 0.16);',
    '    col = canopy(vec4(strT.x * avT * 0.9, strT.yz, strT.w), vec3(0.14, 0.34, 0.16), vec3(0.4, 0.64, 0.28), col);',
    '    float bridge = riv * step(0.5, fract(p.y * 1.2 + 0.25)) * step(fract(p.y * 1.2 + 0.25), 0.56);',
    '    col = mix(col, vec3(0.32, 0.6, 0.78) * (0.9 + 0.15 * fine) + 0.12 * smoothstep(0.7, 0.95, nz(vec2(p.x * 30.0, p.y * 8.0))), riv * (1.0 - bridge)); col = mix(col, vec3(0.7, 0.68, 0.64), bridge);',
    '    col = mix(col, vec3(0.62, 0.64, 0.6), bank * (1.0 - bridge));',
    '    sh = 1.0;',
    '  }',
    '  col *= sh;',
    '  col = mix(col, uHaze, uHazeA);',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
  ])

  var VS = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'

  function init () {
    if (gl || dead) return !!gl
    if (/[?&]gl=0\b/.test(w.location.search)) { dead = true; return false }   // QA / fallback switch: the 2D scenery
    try {
      cv = w.document.createElement('canvas')
      // failIfMajorPerformanceCaveat: no context on a software rasteriser (the shaders would run on the CPU: 60 ms a frame)
      gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true })
      var di = gl && gl.getExtension('WEBGL_debug_renderer_info'), rn = di ? String(gl.getParameter(di.UNMASKED_RENDERER_WEBGL)) : ''
      if (/swiftshader|llvmpipe|softpipe|software|basic render/i.test(rn)) gl = null
    } catch (e) { gl = null }
    if (!gl) { dead = true; return false }
    cv.addEventListener('webglcontextlost', function (ev) { ev.preventDefault(); dead = true; gl = null })
    quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    return true
  }
  function prog (name, s) {
    if (progs[name] !== undefined) return progs[name]
    function sh (type, s2) { var o = gl.createShader(type); gl.shaderSource(o, s2); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { if (w.console) w.console.warn('blippi-gl ' + name + ': ' + gl.getShaderInfoLog(o)); return null } return o }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, s), p = null
    if (v && f) {
      p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { if (w.console) w.console.warn('blippi-gl ' + name + ': link ' + gl.getProgramInfoLog(p)); p = null }
    }
    progs[name] = p ? { p: p, u: {} } : null
    return progs[name]
  }
  function u (P, n) { if (!(n in P.u)) P.u[n] = gl.getUniformLocation(P.p, n); return P.u[n] }
  function run (name, s, pw, ph, set) {
    if (!init()) return null
    var P = prog(name, s)
    if (!P) return null
    if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph }
    gl.viewport(0, 0, pw, ph)
    gl.useProgram(P.p)
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    gl.uniform2f(u(P, 'uRes'), pw, ph)
    set(function (n) { return u(P, n) })
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    return gl.isContextLost() ? null : cv
  }
  function hex (h) { var n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255] }
  function v3 (L, a) { var c = hex(a); gl.uniform3f(L, c[0], c[1], c[2]) }
  // the render size: css px x a quality (detail on a big screen, cheap on a slow tablet); the 2D canvas scales it up
  function q (run_) { var k = (run_.dpr || 1) * (run_.scale || 1); return Math.max(1, Math.min(1.5, k * 0.7)) }   // never below css px: an upscaled sea read soft
  function qLand (run_) { var k = (run_.dpr || 1) * (run_.scale || 1); return Math.max(1, Math.min(2, k)) }   // a static strip: full detail

  // ---- the sea worlds (theme.world of AIR): water deep / shallow, the bed, sky, sun, foam; bed visibility, waves, caustics,
  // foam; the sun's screen position, specular, glitter; cloud shadow, choppiness, foam lace / trails, bed type ----
  var SEAW = {
    harbour: { deep: '#124A78', shal: '#3FA9C9', bed: '#B7A57A', sky: '#D4EEFF', sun: '#FFF4D6', foam: '#F4FBFF', k: [0.55, 1.2, 0.14, 0.14], l: [0.82, 0.04, 1.1, 0.6], m: [0.55, 4.0, 0.2, 0] },
    reef: { deep: '#0C6A98', shal: '#2FD0D6', bed: '#C9B98A', sky: '#DDF6FF', sun: '#FFFFF0', foam: '#FFFFFF', k: [0.9, 0.85, 0.22, 0.06], l: [0.75, 0.05, 1.0, 0.7], m: [0.45, 4.5, 0.12, 1] },
    arctic: { deep: '#123A5C', shal: '#2D78A0', bed: '#CFE6F2', sky: '#EEF8FF', sun: '#F4FAFF', foam: '#FFFFFF', k: [0.35, 0.9, 0.08, 0.16], l: [0.3, 0.06, 0.9, 0.5], m: [0.4, 4.0, 0.2, 3] },
    sunset: { deep: '#1B3A68', shal: '#3D6898', bed: '#7A5A44', sky: '#FFB487', sun: '#FFC77A', foam: '#FFE4C8', k: [0.1, 1.0, 0.0, 0.08], l: [0.5, 0.12, 1.7, 1.0], m: [0.3, 4.0, 0.15, 0] },
    lagoon: { deep: '#108CA6', shal: '#68E4D8', bed: '#D2C79E', sky: '#E2FAFF', sun: '#FFFFF2', foam: '#FFFFFF', k: [1.0, 0.75, 0.26, 0.03], l: [0.7, 0.05, 1.0, 0.7], m: [0.45, 5.0, 0.06, 2] },
    delta: { deep: '#3A5A40', shal: '#6E8C58', bed: '#8C7C52', sky: '#E4ECD0', sun: '#FFF6DA', foam: '#EEF2E0', k: [0.45, 0.6, 0.06, 0.04], l: [0.65, 0.08, 0.6, 0.3], m: [0.5, 5.0, 0.2, 2] },
    storm: { deep: '#18303A', shal: '#30505A', bed: '#3A4A50', sky: '#8C9AA8', sun: '#C8D4E0', foam: '#F2F6F8', k: [0.0, 1.8, 0.0, 0.6], l: [0.5, -0.2, 0.3, 0.0], m: [0.6, 2.8, 0.25, 0] },
    night: { deep: '#061A36', shal: '#0F3360', bed: '#1A3050', sky: '#30508C', sun: '#DCE6FF', foam: '#A8C4E8', k: [0.0, 0.9, 0.0, 0.05], l: [0.72, 0.12, 1.1, 0.8], m: [0.0, 4.0, 0.15, 0] }
  }
  // the ground worlds of UDARA (rich-sky ground kind) -> shader kind
  var LANDK = { bay: 0, candy: 1, lights: 2, valley: 3, desert: 4, city: 5 }
  var UNIT = 150   // css px per world unit: wave and terrain scale
  var BANDS = 6    // a new ground strip is built in this many bands, one per frame

  // render rows [y0, y1) of a land strip (pixel rows of the strip, top = 0) into the strip canvas
  function landBand (st, y0, y1) {
    var bh = y1 - y0, s = st.s
    var out = run('land', LAND, st.pw, bh, function (U) {
      gl.uniform1f(U('uS'), UNIT * 1.4 * s); gl.uniform2f(U('uOff'), (st.ox - st.padX) * s, (st.oy - st.pad) * s - y0); gl.uniform1f(U('uT'), 0)
      gl.uniform1f(U('uKind'), LANDK[st.kind]); gl.uniform3f(U('uHaze'), st.haze[0] / 255, st.haze[1] / 255, st.haze[2] / 255); gl.uniform1f(U('uHazeA'), st.hazeA)
      gl.uniform2f(U('uSun'), st.sun ? st.sun[0] : 0.7, st.sun ? st.sun[1] : 0.1)
    })
    if (!out) return false
    st.cv.getContext('2d').drawImage(out, 0, 0, st.pw, bh, 0, y0, st.pw, bh)   // keep the pixels: the shared WebGL canvas is redrawn next
    return true
  }
  function newStrip (run_, kind, haze, hazeA, sun, offX, offY, reuse) {
    var k = qLand(run_), W = run_.W, H = run_.H, pad = Math.round(H * 0.6), padX = 24
    var pw = Math.ceil((W + padX * 2) * k), ph = Math.ceil((H + pad * 2) * k)
    var c2 = reuse && reuse.width === pw && reuse.height === ph ? reuse : w.document.createElement('canvas')
    c2.width = pw; c2.height = ph
    return { id: W + 'x' + H + '@' + k + kind, cv: c2, pw: pw, ph: ph, s: pw / (W + padX * 2), oy: offY, ox: offX, pad: pad, padX: padX, kind: kind, haze: haze, hazeA: hazeA, sun: sun, row: 0, W: W, H: H }
  }

  T.gl = {
    ok: function () { return init() },
    seaWorld: function (k) { return SEAW[k] ? k : 'harbour' },
    // the sea surface for this frame; off = world scroll in css px (x, y); null = keep the 2D water
    sea: function (run_, world, offX, offY) {
      var C = SEAW[world] || SEAW.harbour, k = q(run_), lite = run_.scale < 0.75
      var pw = Math.ceil(run_.W * k * (lite ? 0.7 : 1)), ph = Math.ceil(run_.H * k * (lite ? 0.7 : 1)), s = pw / run_.W
      return run('sea', SEA, pw, ph, function (U) {
        gl.uniform1f(U('uS'), UNIT * s); gl.uniform2f(U('uOff'), offX * s, offY * s); gl.uniform1f(U('uT'), run_.t || 0)
        v3(U('uDeep'), C.deep); v3(U('uShal'), C.shal); v3(U('uBed'), C.bed); v3(U('uSky'), C.sky); v3(U('uSunC'), C.sun); v3(U('uFoamC'), C.foam)
        gl.uniform4f(U('uK'), C.k[0], C.k[1], C.k[2], C.k[3]); gl.uniform4f(U('uL'), C.l[0], C.l[1], C.l[2], C.l[3]); gl.uniform4f(U('uM'), C.m[0], C.m[1], C.m[2], C.m[3])
      })
    },
    // the ground strip: the shown strip covers screen y in [-pad, H + pad] at the offset it was drawn for. When the scroll
    // has used half of that margin, the next strip (at the offset of that moment) is built a band per frame and swapped in
    // when complete. Returns { cv, x, y, w, h } in css px, or null (the caller keeps its 2D ground).
    land: function (run_, S, kind, haze, hazeA, sun, offX, offY) {
      if (!(kind in LANDK) || !init()) return null
      var st = S.glLand, k = qLand(run_), id = run_.W + 'x' + run_.H + '@' + k + kind
      if (!st || st.id !== id) {   // first strip (or a resize): all of it now
        st = newStrip(run_, kind, haze, hazeA, sun, offX, offY, st && st.cv)
        if (!landBand(st, 0, st.ph)) return null
        S.glLand = st; S.glNext = null
      } else {
        var used = Math.max(Math.abs(offY - st.oy) / st.pad, Math.abs(offX - st.ox) / st.padX)
        if (used > 0.45 && !S.glNext) S.glNext = newStrip(run_, kind, haze, hazeA, sun, offX + (offX - st.ox) * 0.3, offY + (offY - st.oy) * 0.5, S.glSpare)
        var nx = S.glNext
        if (nx) {
          var y1 = Math.min(nx.ph, nx.row + Math.ceil(nx.ph / BANDS))
          if (!landBand(nx, nx.row, y1)) return null
          nx.row = y1
          if (nx.row >= nx.ph || used > 0.98) {
            if (nx.row < nx.ph && !landBand(nx, nx.row, nx.ph)) return null   // the scroll outran the bands: finish now
            S.glSpare = st.cv; S.glLand = st = nx; S.glNext = null
          }
        }
      }
      return { cv: st.cv, x: st.ox - offX - st.padX, y: -st.pad + (offY - st.oy), w: st.W + st.padX * 2, h: st.H + st.pad * 2 }
    }
  }
})(window)
