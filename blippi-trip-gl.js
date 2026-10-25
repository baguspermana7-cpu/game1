/* G32 Blippi -- GPU worlds for AIR and UDARA (owner 2026-10-26: "blippi udara, laut itu jelek, masih kurang detail dan
 * kurang immersive. Shader terrain or langitnya laut sangat kurang detail"). Two full-screen fragment shaders on ONE small
 * offscreen WebGL canvas that the 2D renderers blit like any other layer:
 *   sea   the water surface seen from above, every frame: four travelling wave trains + fine ripples give a real normal,
 *         lit by the world's sun (specular, glitter) and sky (slope reflection); a seabed at half parallax shows through the
 *         shallows (refracted by the waves) with caustic light lines; whitecap foam on the crests
 *   land  the ground far below the plane: a height field per world (coast + towns, mountain valley with rivers and snow,
 *         dunes and mesas, a candy patchwork, city blocks, a night city's lights) hill-shaded by the sun, hazed by the air.
 *         It scrolls slowly (parallax 0.12), so it is rendered ONCE into a tall strip and only re-rendered when the strip runs
 *         out; every frame is one drawImage.
 * No WebGL, a lost context or a compile failure -> null, and the caller keeps its 2D scenery. */
;(function (w) {
  'use strict'
  var T = w.BlippiTrip
  if (!T) return
  var cv = null, gl = null, dead = false, quad = null, progs = {}

  var HEAD = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\n' +
    'uniform vec2 uRes; uniform float uS; uniform vec2 uOff; uniform float uT;\n' +
    'float hsh(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }\n' +
    'float nz(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);\n' +
    '  return mix(mix(hsh(i), hsh(i + vec2(1.0, 0.0)), u.x), mix(hsh(i + vec2(0.0, 1.0)), hsh(i + vec2(1.0, 1.0)), u.x), u.y); }\n' +
    'const mat2 RT = mat2(1.6, 1.2, -1.2, 1.6);\n' +
    'float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 6; i++) { s += a * nz(p); p = RT * p; a *= 0.5; } return s; }\n' +
    'float fbm3(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 3; i++) { s += a * nz(p); p = RT * p; a *= 0.5; } return s / 0.875; }\n'

  // ---- the sea surface ----
  var SEA = HEAD +
    'uniform vec3 uDeep, uShal, uBed, uSky, uSunC, uFoamC; uniform vec4 uK; uniform vec4 uL;\n' +
    // uK: bed visibility, wave strength, caustics, foam   uL: sun screen x, y (0..1), specular, glitter
    'void main(){\n' +
    '  vec2 sc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);\n' +
    '  vec2 p = (sc + vec2(uOff.x, -uOff.y)) / uS;\n' +
    '  float t = uT, h = 0.0; vec2 g = vec2(0.0);\n' +
    '  vec2 d; float k, ph, a;\n' +
    '  d = normalize(vec2(0.3, 1.0)); k = 1.3; a = 0.16; ph = dot(d, p) * k + t * 1.1; h += a * sin(ph); g += a * k * cos(ph) * d;\n' +
    '  d = normalize(vec2(-0.8, 0.6)); k = 2.4; a = 0.08; ph = dot(d, p) * k + t * 1.6; h += a * sin(ph); g += a * k * cos(ph) * d;\n' +
    '  d = normalize(vec2(0.9, 0.4)); k = 4.1; a = 0.045; ph = dot(d, p) * k + t * 2.2; h += a * sin(ph); g += a * k * cos(ph) * d;\n' +
    '  d = normalize(vec2(-0.2, -1.0)); k = 6.7; a = 0.022; ph = dot(d, p) * k + t * 2.9; h += a * sin(ph); g += a * k * cos(ph) * d;\n' +
    '  vec2 q = p * 3.2 + vec2(t * 0.35, -t * 0.5); float e = 0.035;\n' +
    '  float n0 = fbm3(q), nx = fbm3(q + vec2(e, 0.0)), ny = fbm3(q + vec2(0.0, e));\n' +
    '  g += vec2(nx - n0, ny - n0) / e * 0.06;\n' +
    '  vec2 q2 = p * 11.0 + vec2(-t * 0.9, -t * 1.3); float m0 = nz(q2), mx = nz(q2 + vec2(0.05, 0.0)), my = nz(q2 + vec2(0.0, 0.05));\n' +
    '  g += vec2(mx - m0, my - m0) / 0.05 * 0.03;\n' +
    '  vec3 N = normalize(vec3(-g * uK.y, 1.0));\n' +
    // the bed at half parallax, refracted by the surface slope
    '  vec2 bp = (sc + vec2(uOff.x * 0.5, -uOff.y * 0.5)) / uS * 0.8 + N.xy * 0.35;\n' +
    '  float bed = fbm(bp * 0.45 + 7.0);\n' +
    '  float sh = smoothstep(0.38, 0.72, bed) * uK.x;\n' +
    '  vec3 col = mix(uDeep, uShal, clamp(sh + (1.0 - uK.x) * 0.3 + h * 0.4, 0.0, 1.0));\n' +
    '  float bt = fbm3(bp * 3.0), rocks = smoothstep(0.62, 0.7, fbm3(bp * 1.4 + 3.1));\n' +
    '  vec3 bedc = uBed * (0.78 + 0.45 * bt) * (1.0 - rocks * 0.35);\n' +
    '  vec2 cp = bp * 2.6; float c1 = nz(cp + vec2(t * 0.45, t * 0.3)), c2 = nz(cp * 1.27 - vec2(t * 0.38, -t * 0.27));\n' +
    '  float ca = pow(1.0 - abs(c1 - c2), 22.0) + 0.5 * pow(1.0 - abs(nz(cp * 2.1 + t * 0.5) - nz(cp * 2.3 - t * 0.4)), 28.0);\n' +
    '  bedc += vec3(1.0, 1.0, 0.92) * ca * uK.z;\n' +
    '  col = mix(col, min(bedc, vec3(1.0)), sh * 0.55);\n' +
    // slope reflection of the sky; the sun's specular and its glitter
    '  float fr = clamp((1.0 - N.z) * 5.0, 0.0, 1.0);\n' +
    '  col = mix(col, uSky, fr * 0.42);\n' +
    '  vec2 toS = (uL.xy * uRes - sc) / uRes.y;\n' +
    '  vec3 L = normalize(vec3(toS, 0.75)); vec3 Hh = normalize(L + vec3(0.0, 0.0, 1.0));\n' +
    '  float sp = pow(max(dot(N, Hh), 0.0), 160.0) * uL.z;\n' +
    '  float near = smoothstep(0.9, 0.0, length(toS));\n' +
    '  float gli = smoothstep(0.88, 1.0, nz(p * 26.0 + vec2(t * 2.3, -t * 1.7)) * (0.6 + 0.4 * fr)) * near * uL.w;\n' +
    '  col += uSunC * (sp * (0.25 + 0.6 * near) + gli * 1.1);\n' +
    '  col *= 0.9 + 0.18 * (N.x * 0.5 - N.y * 0.8);\n' +
    '  float fo = smoothstep(0.58, 0.82, (h / 0.3) * 0.5 + 0.5 + (fbm3(p * 2.4 + t * 0.15) - 0.5) * 0.9);\n' +
    '  float fl = smoothstep(0.42, 0.72, fbm3(vec2(p.x * 4.0, p.y * 1.6) + vec2(t * 0.3, -t * 0.6)));\n' +
    '  col = mix(col, uFoamC, fo * fl * uK.w);\n' +
    '  gl_FragColor = vec4(col, 1.0);\n' +
    '}\n'

  // ---- the ground far below ----
  var LAND = HEAD +
    'uniform float uKind; uniform vec3 uHaze; uniform float uHazeA; uniform vec2 uSun;\n' +
    'float terr(vec2 p){ vec2 q = vec2(fbm3(p * 0.22), fbm3(p * 0.22 + vec2(5.2, 1.3))); return fbm(p * 0.3 + q * 1.6); }\n' +
    'float ridge(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * (1.0 - abs(nz(p) * 2.0 - 1.0)); p = RT * p; a *= 0.5; } return s; }\n' +
    'float detail(vec2 p){ return (fbm3(p * 2.6) - 0.5) * 0.06 + (nz(p * 9.0) - 0.5) * 0.006; }\n' +
    'float height(vec2 p){\n' +
    '  if (uKind < 0.5) return terr(p) + detail(p) * 0.6;\n' +                                    // bay
    '  if (uKind < 1.5) return terr(p * 0.8) * 0.6;\n' +                         // candy
    '  if (uKind < 2.5) return terr(p) * 0.7;\n' +                               // lights
    '  if (uKind < 3.5) { float r = ridge(p * 0.42 + vec2(fbm3(p * 0.2) * 1.5)); return pow(r, 2.6) + detail(p) * 0.7; }\n' +   // valley
    '  if (uKind < 4.5) { float w = fbm3(p * 0.18); float du = sin(p.x * 5.2 + p.y * 1.6 + w * 9.0); du = pow(0.5 + 0.5 * du, 2.5); float rp = sin(p.x * 26.0 + p.y * 9.0 + w * 20.0) * 0.012;\n' +
    '    return du * 0.16 + rp + detail(p) * 0.4 + smoothstep(0.66, 0.7, terr(p * 0.6)) * 0.5; }\n' +   // desert: dunes + mesas
    '  return 0.0;\n' +                                                          // city: flat
    '}\n' +
    'float trees(vec2 p){ vec2 g = p * 12.0, c = floor(g), f = fract(g) - 0.5 - (vec2(hsh(c), hsh(c + 3.1)) - 0.5) * 0.5; return smoothstep(0.46, 0.2, length(f)) * (0.7 + 0.3 * hsh(c + 1.7)); }\n' +
    'vec3 fields(vec2 p, vec3 a, vec3 b){ vec2 c = floor(p * 1.1 + vec2(fbm3(p * 0.4)) * 1.4); float r = hsh(c); return mix(a, b, r) * (0.92 + 0.12 * nz(p * 9.0)); }\n' +
    'void main(){\n' +
    '  vec2 sc = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);\n' +
    '  vec2 p = (sc + vec2(uOff.x, -uOff.y)) / uS;\n' +
    '  float e = 0.04, h = height(p), hx = height(p + vec2(e, 0.0)), hy = height(p + vec2(0.0, e));\n' +
    '  vec3 N = normalize(vec3(-(hx - h) / e * 2.4, -(hy - h) / e * 2.4, 1.0));\n' +
    '  vec3 L = normalize(vec3(uSun - vec2(0.5, 0.5), 0.55));\n' +
    '  float dif = clamp(dot(N, L), 0.0, 1.0), sh = 0.55 + 0.6 * dif;\n' +
    '  float riv = 1.0 - smoothstep(0.0, 0.022, abs(fbm3(p * 0.16 + 3.7) - 0.5));\n' +
    '  vec3 col; float fine = nz(p * 14.0), fine2 = nz(p * 38.0);\n' +
    '  if (uKind < 0.5) {\n' +                                                   // bay: sea, beaches, fields, woods, towns
    '    float sea = 0.41;\n' +
    '    if (h < sea) { float dd = smoothstep(sea, sea - 0.12, h); col = mix(vec3(0.36, 0.78, 0.84), vec3(0.1, 0.42, 0.66), dd);\n' +
    '      float wv = nz(vec2(p.x * 6.0, p.y * 18.0) + fbm3(p) * 4.0), wv2 = nz(vec2(p.x * 14.0, p.y * 40.0) + fbm3(p * 2.0) * 6.0); col *= 0.88 + 0.16 * wv + 0.1 * wv2; col = mix(col, vec3(0.96), smoothstep(0.012, 0.0, sea - h) * 0.8); sh = 1.0; }\n' +
    '    else if (h < sea + 0.02) col = vec3(0.93, 0.86, 0.66);\n' +
    '    else { col = fields(p, vec3(0.5, 0.74, 0.32), vec3(0.72, 0.8, 0.4));\n' +
    '      float wood = smoothstep(0.52, 0.6, fbm3(p * 0.9 + 9.0)); col = mix(col, mix(vec3(0.12, 0.3, 0.14), vec3(0.26, 0.52, 0.24) * (0.85 + 0.3 * fine2), trees(p)), wood);\n' +
    '      vec2 tc = floor(p * 3.0); float town = step(0.86, hsh(tc)) * step(h, sea + 0.09) * step(0.55, fract(p.x * 3.0)) * step(0.55, fract(p.y * 3.0));\n' +
    '      col = mix(col, mix(vec3(0.85, 0.3, 0.22), vec3(0.97, 0.95, 0.9), hsh(tc + 3.0)), town);\n' +
    '      col = mix(col, vec3(0.62, 0.6, 0.55), smoothstep(0.66, 0.74, h)); }\n' +
    '  } else if (uKind < 1.5) {\n' +                                            // candy patchwork + a chocolate river
    '    col = fields(p * 0.8, vec3(1.0, 0.72, 0.84), vec3(0.66, 0.92, 0.82));\n' +
    '    float c3 = hsh(floor(p * 0.9 + 4.0)); col = mix(col, vec3(1.0, 0.93, 0.6), step(0.7, c3)); col = mix(col, vec3(0.8, 0.72, 1.0), step(0.85, c3));\n' +
    '    float dot_ = step(0.82, fine2) * step(0.6, nz(p * 2.0)); col = mix(col, vec3(1.0, 0.45, 0.6), dot_);\n' +
    '    col = mix(col, vec3(0.48, 0.28, 0.18) * (0.9 + 0.2 * fine), riv);\n' +
    '  } else if (uKind < 2.5) {\n' +                                            // night: dark land, rivers, city lights
    '    col = mix(vec3(0.05, 0.08, 0.16), vec3(0.09, 0.14, 0.22), h); sh = 0.7 + 0.4 * dif;\n' +
    '    col = mix(col, vec3(0.08, 0.16, 0.3), riv);\n' +
    '    float city = smoothstep(0.42, 0.56, fbm3(p * 0.35 + 2.0));\n' +
    '    vec2 g2 = p * 6.0; vec2 cel = floor(g2), f2 = fract(g2) - 0.5 - (vec2(hsh(cel), hsh(cel + 7.0)) - 0.5) * 0.6;\n' +
    '    float lt = (smoothstep(0.12, 0.0, length(f2)) + 0.35 * smoothstep(0.4, 0.0, length(f2))) * step(0.25, hsh(cel + 2.0)) * city;\n' +
    '    float road = (1.0 - smoothstep(0.0, 0.03, abs(fract(p.x * 0.7 + fbm3(p * 0.3)) - 0.5))) * city;\n' +
    '    col += vec3(1.0, 0.8, 0.45) * (lt * 1.6 + road * 0.5) + vec3(1.0, 0.6, 0.3) * city * 0.12;\n' +
    '  } else if (uKind < 3.5) {\n' +                                            // valley: meadows, woods, rivers, rock, snow
    '    col = fields(p, vec3(0.46, 0.72, 0.3), vec3(0.62, 0.78, 0.36));\n' +
    '    float wood = smoothstep(0.08, 0.3, h) * smoothstep(0.62, 0.5, h); col = mix(col, mix(vec3(0.1, 0.26, 0.13), vec3(0.22, 0.48, 0.22) * (0.85 + 0.3 * fine2), trees(p)), wood * smoothstep(0.4, 0.6, fbm3(p * 1.2)));\n' +
    '    float strata = 0.85 + 0.15 * sin(h * 90.0 + fine * 3.0);\n' +
    '    col = mix(col, vec3(0.55, 0.5, 0.44) * (0.8 + 0.3 * fine) * strata, smoothstep(0.5, 0.66, h + (1.0 - N.z) * 0.2));\n' +
    '    col = mix(col, vec3(0.93, 0.95, 0.98) * (0.94 + 0.08 * fine2), smoothstep(0.74, 0.8, h + fine * 0.05));\n' +
    '    col = mix(col, vec3(0.3, 0.6, 0.85), riv * smoothstep(0.3, 0.1, h));\n' +
    '  } else if (uKind < 4.5) {\n' +                                            // desert: dunes, mesas, an oasis now and then
    '    col = mix(vec3(0.86, 0.62, 0.38), vec3(0.98, 0.84, 0.6), clamp(h * 5.0, 0.0, 1.0)) * (0.95 + 0.08 * fine2); sh = 0.45 + 0.75 * dif;\n' +
    '    float mesa = smoothstep(0.66, 0.7, terr(p * 0.6)); col = mix(col, vec3(0.74, 0.42, 0.28) * (0.85 + 0.3 * fine), mesa);\n' +
    '    float oa = smoothstep(0.78, 0.82, fbm3(p * 0.5 + 11.0)); col = mix(col, vec3(0.25, 0.6, 0.3), oa); col = mix(col, vec3(0.2, 0.6, 0.75), smoothstep(0.84, 0.87, fbm3(p * 0.5 + 11.0)));\n' +
    '  } else {\n' +                                                             // city: blocks, avenues every fourth street, buildings with their shadows, parks, a river
    '    vec2 b = p * 2.4; vec2 cel = floor(b), f2 = fract(b);\n' +
    '    float av = step(mod(cel.x, 4.0), 0.5) * step(f2.x, 0.16) + step(mod(cel.y, 4.0), 0.5) * step(f2.y, 0.16);\n' +
    '    float st = 1.0 - step(0.08, f2.x) * step(0.08, f2.y);\n' +
    '    vec2 lot = floor(f2 * 2.0), lf = fract(f2 * 2.0); float r = hsh(cel * 3.0 + lot), ht = 0.3 + 0.7 * hsh(cel * 7.0 + lot);\n' +
    '    vec3 roof = mix(vec3(0.8, 0.5, 0.4), vec3(0.88, 0.86, 0.82), step(0.45, r)); roof = mix(roof, vec3(0.42, 0.55, 0.7), step(0.82, r));\n' +
    '    float m = 0.1 + 0.12 * (1.0 - ht);\n' +
    '    float bld = step(m, lf.x) * step(m, lf.y) * step(lf.x, 1.0 - m) * step(lf.y, 1.0 - m);\n' +
    '    vec2 so = lf - vec2(0.09, 0.09) * ht;\n' +                              // the shadow, cast away from the sun (up-right)
    '    float shw = step(m, so.x) * step(m, so.y) * step(so.x, 1.0 - m) * step(so.y, 1.0 - m) * (1.0 - bld);\n' +
    '    float edgeL = smoothstep(0.0, 0.05, min(min(lf.x - m, lf.y - m), min(1.0 - m - lf.x, 1.0 - m - lf.y)));\n' +
    '    col = vec3(0.6, 0.62, 0.62) * (0.95 + 0.08 * fine2);\n' +
    '    col *= 1.0 - 0.45 * shw;\n' +
    '    col = mix(col, roof * (0.8 + 0.25 * ht) * (0.88 + 0.12 * edgeL) * (0.94 + 0.08 * fine2), bld);\n' +
    '    vec2 rq = fract(lf * 3.0 + hsh(cel + lot) * 2.0); float unit = step(0.35, hsh(floor(lf * 3.0) + cel * 9.0 + lot)) * step(0.25, rq.x) * step(rq.x, 0.75) * step(0.25, rq.y) * step(rq.y, 0.75) * step(0.12, edgeL);\n' +
    '    col = mix(col, vec3(0.86, 0.87, 0.88), unit * bld * 0.8); col *= 1.0 - 0.25 * step(0.75, rq.y) * step(rq.y, 0.85) * unit * bld;\n' +
    '    float park = step(0.88, hsh(cel + 5.0)); col = mix(col, mix(vec3(0.36, 0.62, 0.3), vec3(0.2, 0.44, 0.2), trees(p) * 0.8), park * (1.0 - st));\n' +
    '    col = mix(col, vec3(0.45, 0.47, 0.5), clamp(st + av, 0.0, 1.0));\n' +
    '    col = mix(col, vec3(0.32, 0.6, 0.78) * (0.9 + 0.15 * fine), riv); sh = 1.0;\n' +
    '  }\n' +
    '  col *= sh;\n' +
    '  col = mix(col, uHaze, uHazeA);\n' +
    '  gl_FragColor = vec4(col, 1.0);\n' +
    '}\n'

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
  function prog (name, src) {
    if (progs[name] !== undefined) return progs[name]
    function sh (type, s) { var o = gl.createShader(type); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) { if (w.console) w.console.warn('blippi-gl ' + name + ': ' + gl.getShaderInfoLog(o)); return null } return o }
    var v = sh(gl.VERTEX_SHADER, VS), f = sh(gl.FRAGMENT_SHADER, src), p = null
    if (v && f) {
      p = gl.createProgram(); gl.attachShader(p, v); gl.attachShader(p, f); gl.bindAttribLocation(p, 0, 'a'); gl.linkProgram(p)
      if (!gl.getProgramParameter(p, gl.LINK_STATUS)) p = null
    }
    progs[name] = p ? { p: p, u: {} } : null
    return progs[name]
  }
  function u (P, n) { if (!(n in P.u)) P.u[n] = gl.getUniformLocation(P.p, n); return P.u[n] }
  function run (name, src, pw, ph, set) {
    if (!init()) return null
    var P = prog(name, src)
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
  function qLand (run_) { var k = (run_.dpr || 1) * (run_.scale || 1); return Math.max(0.75, Math.min(1.5, k)) }   // a static strip: full detail

  // ---- the sea worlds (theme.world of AIR): water deep / shallow, the bed, sky, sun, foam; bed visibility, waves, caustics,
  // foam; the sun's screen position, specular, glitter ----
  var SEAW = {
    harbour: { deep: '#124A78', shal: '#3FA9C9', bed: '#B7A57A', sky: '#D4EEFF', sun: '#FFF4D6', foam: '#F4FBFF', k: [0.55, 1.25, 0.12, 0.12], l: [0.82, 0.04, 1.1, 0.6] },
    reef: { deep: '#0C6A98', shal: '#2FD0D6', bed: '#C9B98A', sky: '#DDF6FF', sun: '#FFFFF0', foam: '#FFFFFF', k: [0.9, 0.85, 0.2, 0.06], l: [0.75, 0.05, 1.0, 0.7] },
    arctic: { deep: '#123A5C', shal: '#2D78A0', bed: '#CFE6F2', sky: '#EEF8FF', sun: '#F4FAFF', foam: '#FFFFFF', k: [0.35, 0.9, 0.08, 0.16], l: [0.3, 0.06, 0.9, 0.5] },
    sunset: { deep: '#1B3A68', shal: '#3D6898', bed: '#7A5A44', sky: '#FFB487', sun: '#FFC77A', foam: '#FFE4C8', k: [0.1, 1.0, 0.0, 0.08], l: [0.5, 0.12, 1.7, 1.0] },
    lagoon: { deep: '#108CA6', shal: '#68E4D8', bed: '#D2C79E', sky: '#E2FAFF', sun: '#FFFFF2', foam: '#FFFFFF', k: [1.0, 0.75, 0.24, 0.03], l: [0.7, 0.05, 1.0, 0.7] },
    delta: { deep: '#3A5A40', shal: '#6E8C58', bed: '#8C7C52', sky: '#E4ECD0', sun: '#FFF6DA', foam: '#EEF2E0', k: [0.45, 0.6, 0.06, 0.04], l: [0.65, 0.08, 0.6, 0.3] },
    storm: { deep: '#18303A', shal: '#30505A', bed: '#3A4A50', sky: '#8C9AA8', sun: '#C8D4E0', foam: '#F2F6F8', k: [0.0, 1.9, 0.0, 0.6], l: [0.5, -0.2, 0.3, 0.0] },
    night: { deep: '#061A36', shal: '#0F3360', bed: '#1A3050', sky: '#30508C', sun: '#DCE6FF', foam: '#A8C4E8', k: [0.0, 0.9, 0.0, 0.05], l: [0.72, 0.12, 1.1, 0.8] }
  }
  // the ground worlds of UDARA (rich-sky ground kind) -> shader kind
  var LANDK = { bay: 0, candy: 1, lights: 2, valley: 3, desert: 4, city: 5 }
  var UNIT = 150   // css px per world unit: wave and terrain scale

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
        gl.uniform4f(U('uK'), C.k[0], C.k[1], C.k[2], C.k[3]); gl.uniform4f(U('uL'), C.l[0], C.l[1], C.l[2], C.l[3])
      })
    },
    // the ground strip: rendered once for a window of scroll offsets, then blitted; returns { cv, y } (draw cv at y css px)
    land: function (run_, S, kind, haze, hazeA, sun, offX, offY) {
      if (!(kind in LANDK)) return null
      var k = qLand(run_), W = run_.W, H = run_.H, pad = Math.round(H * 0.6)
      var st = S.glLand
      var id = W + 'x' + H + '@' + k + kind
      // strip covers screen y in [-pad, H + pad] at the offset it was drawn for; re-render when the scroll leaves it
      if (!st || st.id !== id || Math.abs(offY - st.oy) > pad * 0.9 || Math.abs(offX - st.ox) > 40) {
        var pw = Math.ceil(W * k), ph = Math.ceil((H + pad * 2) * k), s = pw / W
        var out = run('land', LAND, pw, ph, function (U) {
          gl.uniform1f(U('uS'), UNIT * 1.4 * s); gl.uniform2f(U('uOff'), offX * s, (offY - pad) * s); gl.uniform1f(U('uT'), 0)
          gl.uniform1f(U('uKind'), LANDK[kind]); gl.uniform3f(U('uHaze'), haze[0] / 255, haze[1] / 255, haze[2] / 255); gl.uniform1f(U('uHazeA'), hazeA)
          gl.uniform2f(U('uSun'), sun ? sun[0] : 0.7, sun ? sun[1] : 0.1)
        })
        if (!out) return null
        // keep the pixels: the shared WebGL canvas is redrawn by the sea or the next strip
        var keep = st && st.cv && st.cv.width === pw && st.cv.height === ph ? st.cv : w.document.createElement('canvas')
        keep.width = pw; keep.height = ph
        keep.getContext('2d').drawImage(out, 0, 0)
        st = S.glLand = { id: id, cv: keep, oy: offY, ox: offX, pad: pad }
      }
      return { cv: st.cv, y: -st.pad + (offY - st.oy), x: st.ox - offX }
    }
  }
})(window)
