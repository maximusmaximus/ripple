export const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/** Height-field step: read prev heights, write new height + velocity into RGBA. */
export const SIM_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_prev;
uniform vec2 u_texel;
uniform float u_damping;
uniform float u_speed;
uniform float u_dt;
uniform vec2 u_gravity;

void main() {
  vec4 c = texture(u_prev, v_uv);
  float h = c.r;
  float v = c.g;

  float n = texture(u_prev, v_uv + vec2(0.0,  u_texel.y)).r;
  float s = texture(u_prev, v_uv + vec2(0.0, -u_texel.y)).r;
  float e = texture(u_prev, v_uv + vec2( u_texel.x, 0.0)).r;
  float w = texture(u_prev, v_uv + vec2(-u_texel.x, 0.0)).r;

  float lap = (n + s + e + w) * 0.25 - h;
  v += lap * u_speed;
  v *= u_damping;
  h += v;

  // Gyro slosh: advect the surface downhill so paint distorts and pours.
  vec2 g = u_gravity;
  float glen = length(g);
  if (glen > 0.00012) {
    vec2 src = clamp(v_uv - g * 2.2, u_texel, vec2(1.0) - u_texel);
    vec4 adv = texture(u_prev, src);
    float amt = clamp(glen * 20.0, 0.0, 0.2);
    h = mix(h, adv.r, amt);
    v = mix(v, adv.g, amt * 0.6);
    v += (adv.r - c.r) * amt * 2.4;
  }

  // soft clamp to keep energy bounded
  h = clamp(h, -1.5, 1.5);
  v = clamp(v, -1.5, 1.5);

  fragColor = vec4(h, v, 0.0, 1.0);
}
`

/** Apply circular pressure splats in UV space (y=0 at bottom of texture). */
export const SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_prev;
uniform vec2 u_point;   // UV, y from bottom
uniform float u_force;
uniform float u_radius;

void main() {
  vec4 c = texture(u_prev, v_uv);
  vec2 d = v_uv - u_point;
  float dist = length(d);
  float influence = exp(-dist * dist / max(1e-6, u_radius * u_radius));
  c.r += u_force * influence;
  fragColor = c;
}
`

/** Lay color into the ink buffer, blending with the previous trail via Brush FX. */
export const INK_SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_prev;
uniform vec2 u_point;
uniform float u_force;
uniform float u_radius;
uniform vec3 u_color;
uniform float u_colorA;
uniform int u_brushFx;
uniform float u_fxOpacity;

float lum(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}
vec3 clipColor(vec3 c) {
  float l = lum(c);
  float n = min(min(c.r, c.g), c.b);
  float x = max(max(c.r, c.g), c.b);
  if (n < 0.0) c = l + (c - l) * l / max(l - n, 1e-5);
  if (x > 1.0) c = l + (c - l) * (1.0 - l) / max(x - l, 1e-5);
  return clamp(c, 0.0, 1.0);
}
vec3 setLum(vec3 c, float l) {
  return clipColor(c + (l - lum(c)));
}
float overlay1(float b, float s) {
  return b < 0.5 ? (2.0 * b * s) : (1.0 - 2.0 * (1.0 - b) * (1.0 - s));
}
vec3 applyBrushFx(vec3 bed, vec3 stroke, int mask) {
  if (mask == 0) return stroke;
  vec3 s = stroke;
  // Pigment first — rewrite the stroke, then tone it.
  if ((mask & 512) != 0) s = setLum(s, lum(bed)); // Color
  if ((mask & 32) != 0) {                         // Component
    s = clamp(vec3(
      mix(bed.r, bed.g, s.r),
      mix(bed.g, bed.b, s.g),
      mix(bed.b, bed.r, s.b)
    ), 0.0, 1.0);
  }
  vec3 r = s;
  if ((mask & 64) != 0) r = r * bed;                                    // Multiply
  if ((mask & 2) != 0) r = min(r, bed);                                 // Darken
  if ((mask & 128) != 0) r = 1.0 - (1.0 - r) * (1.0 - bed);             // Screen
  if ((mask & 4) != 0) r = max(r, bed);                                 // Lighten
  if ((mask & 256) != 0) {                                              // Overlay
    r = vec3(overlay1(bed.r, r.r), overlay1(bed.g, r.g), overlay1(bed.b, r.b));
  }
  if ((mask & 8) != 0) {                                                // Contrast
    r = vec3(overlay1(r.r, bed.r), overlay1(r.g, bed.g), overlay1(r.b, bed.b));
  }
  if ((mask & 16) != 0) r = abs(bed - r);                               // Inversion
  return r;
}

void main() {
  vec4 prev = texture(u_prev, v_uv);
  vec2 d = v_uv - u_point;
  float dist = length(d);
  float influence = exp(-dist * dist / max(1e-6, u_radius * u_radius));
  float m = clamp(influence * max(0.35, abs(u_force)) * 3.2, 0.0, 1.0);
  if (m < 0.004) {
    fragColor = prev;
    return;
  }
  vec3 src = u_color;
  float hasTrail = smoothstep(0.02, 0.16, prev.a);
  vec3 fx = applyBrushFx(prev.rgb, src, u_brushFx);
  vec3 over = mix(src, fx, clamp(u_fxOpacity, 0.0, 1.0));
  vec3 laid = mix(src, over, hasTrail);
  vec3 rgb = mix(prev.rgb, laid, m);
  float a = mix(prev.a, u_colorA, m);
  fragColor = vec4(rgb, clamp(a, 0.0, 1.0));
}
`

/**
 * Final composite: height → normal → palette color, optionally mixed with live camera.
 *
 * Camera UV is rotated by u_camAngle (0/90/180/270) so the feed turns with the device,
 * and optionally mirrored for front-facing cameras.
 */
export const DISPLAY_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_height;
uniform sampler2D u_cam;
uniform sampler2D u_ink;
uniform vec2 u_texel;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
uniform vec3 u_c5;
uniform int u_nStops;
uniform vec3 u_stopC[11];
uniform float u_stopT[11];
uniform float u_stopA[11];
uniform float u_rangeStart;
uniform float u_rangeEnd;
uniform float u_time;
uniform float u_camMix;     // 0 = palette only, 1 = camera layer live
uniform float u_camInteract; // 0 = flat underlay, 1 = strokes warp + pull camera
uniform float u_micPulse;   // volume envelope
uniform float u_micBass;
uniform float u_micMid;
uniform float u_micHigh;
uniform float u_camAngle;   // 0, 90, 180, 270 — camera vs viewport
uniform float u_camMirror;  // 1 = mirror X (front camera)
uniform vec2 u_camSize;     // camera texture pixels
uniform vec2 u_viewSize;    // canvas css pixels
uniform int u_brushFx;      // blend of stroke vs bed/camera
uniform float u_fxOpacity;  // 0 = no FX, 1 = full blend

vec4 sampleRamp4(float t) {
  t = clamp(t, 0.0, 1.0);
  int n = u_nStops;
  if (n <= 1) return vec4(u_stopC[0], u_stopA[0]);
  for (int i = 0; i < 10; i++) {
    if (i >= n - 1) break;
    float t0 = u_stopT[i];
    float t1 = u_stopT[i + 1];
    if (t <= t1 || i == n - 2) {
      float span = t1 - t0;
      float f = span > 1e-5 ? clamp((t - t0) / span, 0.0, 1.0) : 0.0;
      return mix(vec4(u_stopC[i], u_stopA[i]), vec4(u_stopC[i + 1], u_stopA[i + 1]), f);
    }
  }
  return vec4(u_stopC[0], u_stopA[0]);
}

vec3 sampleRamp(float t) {
  return sampleRamp4(t).rgb;
}

/** Rotate UV the same direction the viewport turns. */
vec2 orientCamUv(vec2 uv, float angleDeg) {
  vec2 p = uv;
  if (angleDeg > 45.0 && angleDeg < 135.0) {
    p = vec2(1.0 - uv.y, uv.x);
  } else if (angleDeg > 135.0 && angleDeg < 225.0) {
    p = vec2(1.0 - uv.x, 1.0 - uv.y);
  } else if (angleDeg > 225.0 && angleDeg < 315.0) {
    p = vec2(uv.y, 1.0 - uv.x);
  }
  return p;
}

/** object-fit: cover, then rotate so the camera's long axis matches the view. */
vec2 coverOrientCamUv(vec2 uv, float angleDeg) {
  float camAsp = max(u_camSize.x, 1.0) / max(u_camSize.y, 1.0);
  float viewAsp = max(u_viewSize.x, 1.0) / max(u_viewSize.y, 1.0);
  bool rot90 = (angleDeg > 45.0 && angleDeg < 135.0) || (angleDeg > 225.0 && angleDeg < 315.0);
  float dispAsp = rot90 ? (1.0 / camAsp) : camAsp;

  vec2 p = uv;
  if (viewAsp > dispAsp) {
    float sy = dispAsp / viewAsp;
    p.y = (p.y - 0.5) * sy + 0.5;
  } else {
    float sx = viewAsp / dispAsp;
    p.x = (p.x - 0.5) * sx + 0.5;
  }
  return orientCamUv(p, angleDeg);
}

float lum(vec3 c) {
  return dot(c, vec3(0.299, 0.587, 0.114));
}

vec3 clipColor(vec3 c) {
  float l = lum(c);
  float n = min(min(c.r, c.g), c.b);
  float x = max(max(c.r, c.g), c.b);
  if (n < 0.0) c = l + (c - l) * l / max(l - n, 1e-5);
  if (x > 1.0) c = l + (c - l) * (1.0 - l) / max(x - l, 1e-5);
  return clamp(c, 0.0, 1.0);
}

vec3 setLum(vec3 c, float l) {
  return clipColor(c + (l - lum(c)));
}

float overlay1(float b, float s) {
  return b < 0.5 ? (2.0 * b * s) : (1.0 - 2.0 * (1.0 - b) * (1.0 - s));
}

vec3 applyBrushFx(vec3 bed, vec3 stroke, int mask) {
  if (mask == 0) return stroke;
  vec3 s = stroke;
  if ((mask & 512) != 0) s = setLum(s, lum(bed));
  if ((mask & 32) != 0) {
    s = clamp(vec3(
      mix(bed.r, bed.g, s.r),
      mix(bed.g, bed.b, s.g),
      mix(bed.b, bed.r, s.b)
    ), 0.0, 1.0);
  }
  vec3 r = s;
  if ((mask & 64) != 0) r = r * bed;
  if ((mask & 2) != 0) r = min(r, bed);
  if ((mask & 128) != 0) r = 1.0 - (1.0 - r) * (1.0 - bed);
  if ((mask & 4) != 0) r = max(r, bed);
  if ((mask & 256) != 0) {
    r = vec3(overlay1(bed.r, r.r), overlay1(bed.g, r.g), overlay1(bed.b, r.b));
  }
  if ((mask & 8) != 0) {
    r = vec3(overlay1(r.r, bed.r), overlay1(r.g, bed.g), overlay1(r.b, bed.b));
  }
  if ((mask & 16) != 0) r = abs(bed - r);
  return r;
}

void main() {
  float h = texture(u_height, v_uv).r;
  float hx = texture(u_height, v_uv + vec2(u_texel.x, 0.0)).r
           - texture(u_height, v_uv - vec2(u_texel.x, 0.0)).r;
  float hy = texture(u_height, v_uv + vec2(0.0, u_texel.y)).r
           - texture(u_height, v_uv - vec2(0.0, u_texel.y)).r;

  vec3 n = normalize(vec3(-hx * 4.0, -hy * 4.0, 1.0));
  vec3 light = normalize(vec3(0.35, 0.5, 1.0));
  float diff = max(0.0, dot(n, light));
  float spec = pow(max(0.0, dot(reflect(-light, n), vec3(0.0, 0.0, 1.0))), 32.0);

  float drawn = smoothstep(0.008, 0.14, abs(h));
  float pulse = u_micPulse;
  float bass = u_micBass;
  float mid = u_micMid;
  float high = u_micHigh;
  float highAmt = clamp(high, 0.0, 1.0);

  // Paint amount walks the full range window so every stop — including
  // middle diamonds — shows up as the mark builds. Rest sits at range start.
  float amt = smoothstep(0.003, 0.38, abs(h));
  float t = mix(u_rangeStart, u_rangeEnd, amt);
  // Highs shove toward the end of the window; bass eases toward the start.
  t = clamp(t + highAmt * mix(0.12, 0.28, drawn) - bass * 0.08 * drawn, 0.0, 1.0);
  vec4 ramp = sampleRamp4(t);
  vec3 base = ramp.rgb;
  float paintA = ramp.a;
  base = mix(base, u_c0, bass * drawn * 0.2);
  base = mix(base, u_c3, mid * drawn * 0.14);
  vec3 keyCol = mix(u_c4, u_c5, 0.55);
  // Highs tint the whole surface a bit, and the marks a lot.
  base = mix(base, keyCol, highAmt * mix(0.28, 0.72, drawn));

  float shimmer = 0.65 + 0.35 * sin(u_time * (7.0 + highAmt * 14.0));
  float breathe = 1.0 + pulse * 0.07 * shimmer + highAmt * 0.12 * shimmer;
  spec += (pulse * 0.22 + highAmt * 0.55) * mix(0.15, 1.0, drawn) * shimmer;

  vec3 col = base * (0.45 + 0.55 * diff) * breathe + vec3(spec * 0.35);
  vec3 rest = sampleRamp(u_rangeStart) * (0.45 + 0.55 * diff) * breathe;

  vec4 ink = texture(u_ink, v_uv);
  float mark = smoothstep(0.03, 0.16, ink.a);
  vec3 inkLit = ink.rgb * (0.38 + 0.62 * diff) * breathe + vec3(spec * 0.4);
  vec3 paint = mix(col, inkLit, mark);

  vec3 camLit = rest;
  if (u_camMix > 0.001) {
    vec2 warp = vec2(hx, hy) * (0.12 + 3.2 * u_camInteract);
    vec2 cuv = coverOrientCamUv(v_uv + warp, u_camAngle);
    if (u_camMirror > 0.5) cuv.x = 1.0 - cuv.x;
    cuv = clamp(cuv, 0.0, 1.0);
    vec3 cam = texture(u_cam, cuv).rgb;
    camLit = cam * (0.52 + 0.48 * diff) + vec3(spec * 0.28);
  }

  // Empty canvas: fluid + camera. Brush FX only inside the mark.
  vec3 empty = mix(col, camLit, u_camMix);
  vec3 bed = mix(rest, camLit, u_camMix);
  vec3 fxed = applyBrushFx(bed, paint, u_brushFx);
  vec3 layered = mix(paint, fxed, clamp(u_fxOpacity, 0.0, 1.0));
  col = mix(empty, layered, mark * paintA);

  float vig = smoothstep(1.2, 0.3, length(v_uv - 0.5));
  col *= 0.75 + 0.25 * vig;

  fragColor = vec4(col, 1.0);
}
`

export const CLEAR_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() {
  fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`
