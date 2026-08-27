import { TEXTURE_GLSL } from "./texture-glsl";

export const DISPLAY_FRAG =
  `#version 300 es
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
uniform float u_camMix;
uniform float u_camInteract;
uniform float u_micPulse;
uniform float u_micBass;
uniform float u_micMid;
uniform float u_micHigh;
uniform float u_camAngle;
uniform float u_camMirror;
uniform vec2 u_camSize;
uniform vec2 u_viewSize;
uniform int u_brushFx;
uniform float u_fxOpacity;
uniform int u_fxLayers;
uniform vec2 u_gravity;
uniform float u_shadowOn;
uniform vec3 u_shadowColor;
uniform float u_shadowAngle;
uniform float u_shadowOpacity;
uniform float u_shadowDist;
uniform int u_texId;
uniform sampler2D u_texMap;
uniform float u_texHasMap;
uniform float u_texFit;
uniform vec2 u_texSize;
uniform float u_texLevels;
uniform float u_texInvert;
uniform float u_viewZoom;
uniform float u_micZoom;
uniform float u_gyroZoom;
` +
  TEXTURE_GLSL +
  `
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

vec3 sampleRamp(float t) { return sampleRamp4(t).rgb; }

vec2 orientCamUv(vec2 uv, float angleDeg) {
  vec2 p = uv;
  if (angleDeg > 45.0 && angleDeg < 135.0) p = vec2(1.0 - uv.y, uv.x);
  else if (angleDeg > 135.0 && angleDeg < 225.0) p = vec2(1.0 - uv.x, 1.0 - uv.y);
  else if (angleDeg > 225.0 && angleDeg < 315.0) p = vec2(uv.y, 1.0 - uv.x);
  return p;
}

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

float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 clipColor(vec3 c) {
  float l = lum(c);
  float n = min(min(c.r, c.g), c.b);
  float x = max(max(c.r, c.g), c.b);
  if (n < 0.0) c = l + (c - l) * l / max(l - n, 1e-5);
  if (x > 1.0) c = l + (c - l) * (1.0 - l) / max(x - l, 1e-5);
  return clamp(c, 0.0, 1.0);
}
vec3 setLum(vec3 c, float l) { return clipColor(c + (l - lum(c))); }
float overlay1(float b, float s) {
  return b < 0.5 ? (2.0 * b * s) : (1.0 - 2.0 * (1.0 - b) * (1.0 - s));
}
vec3 applyBrushFx(vec3 bed, vec3 stroke, int mask) {
  if (mask == 0) return stroke;
  vec3 s = stroke;
  if ((mask & 512) != 0) s = setLum(s, lum(bed));
  if ((mask & 32) != 0) {
    s = clamp(vec3(mix(bed.r, bed.g, s.r), mix(bed.g, bed.b, s.g), mix(bed.b, bed.r, s.b)), 0.0, 1.0);
  }
  vec3 r = s;
  if ((mask & 64) != 0) r = r * bed;
  if ((mask & 2) != 0) r = min(r, bed);
  if ((mask & 128) != 0) r = 1.0 - (1.0 - r) * (1.0 - bed);
  if ((mask & 4) != 0) r = max(r, bed);
  if ((mask & 256) != 0) r = vec3(overlay1(bed.r, r.r), overlay1(bed.g, r.g), overlay1(bed.b, r.b));
  if ((mask & 8) != 0) r = vec3(overlay1(r.r, bed.r), overlay1(r.g, bed.g), overlay1(r.b, bed.b));
  if ((mask & 16) != 0) r = abs(bed - r);
  return r;
}

void main() {
  float zoom = clamp(u_viewZoom, 1.0, 2.4);
  vec2 slosh = u_gravity * 12.0;
  vec2 uv = clamp((v_uv - 0.5) / zoom + 0.5 + slosh, 0.0, 1.0);
  float h = texture(u_height, uv).r;
  float vel = texture(u_height, uv).g;
  float hx = texture(u_height, uv + vec2(u_texel.x, 0.0)).r - texture(u_height, uv - vec2(u_texel.x, 0.0)).r;
  float hy = texture(u_height, uv + vec2(0.0, u_texel.y)).r - texture(u_height, uv - vec2(0.0, u_texel.y)).r;
  vec2 slope = vec2(hx, hy);
  float pulse = u_micPulse;
  vec2 inkFlow = -slope * (1.2 + abs(vel) * 3.5);
  inkFlow += vec2(-hy, hx) * vel * 2.0;
  inkFlow += u_gravity * 6.0;
  inkFlow += vec2(sin(u_time * 3.4 + uv.y * 14.0 + h * 6.0), cos(u_time * 2.9 + uv.x * 12.0 - h * 5.0)) * (0.35 + pulse * 1.4);
  float drawnEarly = smoothstep(0.008, 0.14, abs(h));
  vec2 texP = fluidDomain(uv, h, vel, slope, u_gravity, pulse, inkFlow * 0.014 * (0.45 + drawnEarly * 1.4));
  vec4 tf = mediaField(u_texId, texP, u_time, h, vel);
  if (u_texId > 0) {
    uv = clamp(uv + tf.yz * 0.01 + inkFlow * 0.004, 0.0, 1.0);
    h = texture(u_height, uv).r;
    vel = texture(u_height, uv).g;
    hx = texture(u_height, uv + vec2(u_texel.x, 0.0)).r - texture(u_height, uv - vec2(u_texel.x, 0.0)).r;
    hy = texture(u_height, uv + vec2(0.0, u_texel.y)).r - texture(u_height, uv - vec2(0.0, u_texel.y)).r;
    slope = vec2(hx, hy);
  }
  vec3 n = normalize(vec3(-hx * 4.0, -hy * 4.0, 1.0));
  vec3 light = normalize(vec3(0.35, 0.5, 1.0));
  float diff = max(0.0, dot(n, light));
  float spec = pow(max(0.0, dot(reflect(-light, n), vec3(0.0, 0.0, 1.0))), 32.0);
  float drawn = smoothstep(0.008, 0.14, abs(h));
  float bass = u_micBass;
  float mid = u_micMid;
  float high = u_micHigh;
  float highAmt = clamp(high, 0.0, 1.0);
  float amt = smoothstep(0.003, 0.38, abs(h));
  float t = mix(u_rangeStart, u_rangeEnd, amt);
  t = clamp(t + highAmt * mix(0.12, 0.28, drawn) - bass * 0.08 * drawn, 0.0, 1.0);
  vec4 ramp = sampleRamp4(t);
  vec3 base = ramp.rgb;
  float paintA = ramp.a;
  base = mix(base, u_c0, bass * drawn * 0.2);
  base = mix(base, u_c3, mid * drawn * 0.14);
  vec3 keyCol = mix(u_c4, u_c5, 0.55);
  base = mix(base, keyCol, highAmt * mix(0.28, 0.72, drawn));
  float shimmer = 0.65 + 0.35 * sin(u_time * (7.0 + highAmt * 14.0));
  float breathe = 1.0 + pulse * 0.1 * shimmer + highAmt * 0.14 * shimmer;
  spec += (pulse * 0.28 + highAmt * 0.55) * mix(0.15, 1.0, drawn) * shimmer;
  vec3 col = base * (0.45 + 0.55 * diff) * breathe + vec3(spec * 0.35);
  vec3 rest = sampleRamp(u_rangeStart) * (0.45 + 0.55 * diff) * breathe;
  inkFlow = -slope * (1.2 + abs(vel) * 3.5);
  inkFlow += vec2(-hy, hx) * vel * 2.0;
  inkFlow += u_gravity * 6.0;
  inkFlow += vec2(sin(u_time * 3.4 + uv.y * 14.0 + h * 6.0), cos(u_time * 2.9 + uv.x * 12.0 - h * 5.0)) * (0.35 + pulse * 1.4);
  if (u_texId > 0) inkFlow += tf.yz * (1.2 + abs(h) * 2.0);
  vec2 inkUv = clamp(uv + inkFlow * 0.012 * (0.4 + drawn * 1.6), 0.0, 1.0);
  if (u_texId > 0) {
    texP = fluidDomain(uv, h, vel, slope, u_gravity, pulse, inkFlow * 0.016 * (0.5 + drawn * 1.5));
    tf = mediaField(u_texId, texP, u_time, h, vel);
  }
  vec4 ink = texture(u_ink, inkUv);
  float inkMark = smoothstep(0.02, 0.14, ink.a);
  float wave = smoothstep(0.01, 0.22, abs(h) + abs(vel) * 1.2);
  float coverage = max(inkMark, wave * mix(0.45, 0.95, inkMark));
  vec4 liveInk = sampleRamp4(clamp(ink.r, 0.0, 1.0));
  vec3 pigment = liveInk.rgb;
  paintA = mix(paintA, liveInk.a, inkMark);
  vec3 inkLit = pigment * (0.4 + 0.6 * diff) * breathe + vec3(spec * 0.45);
  inkLit = mix(inkLit, keyCol, highAmt * inkMark * 0.35);
  inkLit = mix(inkLit, u_c0, bass * inkMark * 0.2);
  vec3 dye = mix(col, inkLit, max(inkMark, wave * 0.4));
  float fxAmt = clamp(u_fxOpacity, 0.0, 1.0);
  float wet = smoothstep(0.012, 0.2, abs(h) + abs(vel) * 1.25);
  float dryInk = inkMark * (1.0 - wet);
  float dryA = dryInk * max(0.4, paintA) * mix(0.58, 0.92, inkMark);
  vec3 preDry = mix(mix(rest, col, 0.35), dye, clamp(dryA, 0.0, 1.0));
  vec3 camLit = rest;
  if (u_camMix > 0.001) {
    float interact = max(0.75, u_camInteract);
    vec2 warp = vec2(hx, hy) * (0.5 + 5.0 * interact) + inkFlow * 0.008 + slosh * 0.5;
    vec2 cuv = coverOrientCamUv(uv + warp, u_camAngle);
    if (u_camMirror > 0.5) cuv.x = 1.0 - cuv.x;
    cuv = clamp(cuv, 0.0, 1.0);
    vec3 cam = texture(u_cam, cuv).rgb;
    camLit = cam * (0.78 + 0.22 * diff) + vec3(spec * 0.2);
    if ((u_fxLayers & 1) != 0) {
      vec3 camFx = applyBrushFx(preDry, camLit, u_brushFx);
      camLit = mix(camLit, camFx, fxAmt);
    }
  }
  vec3 surface = mix(mix(rest, col, 0.35), camLit, u_camMix);
  if ((u_fxLayers & 2) != 0) {
    vec3 micCol = mix(u_c0, keyCol, highAmt);
    micCol = mix(micCol, u_c3, mid);
    float micW = clamp(pulse * 0.7 + highAmt * 0.5 + bass * 0.3, 0.0, 1.0) * wet;
    dye = mix(dye, applyBrushFx(preDry, micCol, u_brushFx), fxAmt * micW);
    col = mix(col, applyBrushFx(preDry, micCol, u_brushFx), fxAmt * micW * 0.65);
  }
  vec3 dry = mix(surface, dye, clamp(dryA, 0.0, 1.0));
  vec3 incoming = mix(col, inkLit, max(inkMark, wave * 0.4));
  vec3 stroked = incoming;
  if ((u_fxLayers & 4) != 0) {
    vec3 fxed = applyBrushFx(dry, incoming, u_brushFx);
    stroked = mix(incoming, fxed, fxAmt);
  }
  float liveA = coverage * max(0.4, paintA) * mix(0.58, 0.92, inkMark);
  liveA *= 1.0 + pulse * 0.12 * inkMark;
  col = mix(dry, mix(surface, stroked, clamp(liveA, 0.0, 1.0)), wet);
  if (u_texId > 0) {
    float texAmt = mix(0.35, 0.85, max(drawn, inkMark));
    vec3 grained = col;
    grained *= mix(1.0, 0.58 + tf.x * 0.72, texAmt);
    grained += vec3(tf.w * 0.16 * texAmt);
    grained = mix(grained, grained * grained * (0.7 + tf.x), texAmt * 0.22);
    if ((u_fxLayers & 8) != 0) {
      vec3 grain = mix(vec3(tf.x), pigment, 0.28) + vec3(tf.w * 0.22);
      vec3 texFx = applyBrushFx(dry, grain, u_brushFx);
      col = mix(grained, mix(grained, texFx, texAmt * fxAmt), wet);
    } else {
      col = grained;
    }
  }
  if (u_shadowOn > 0.5 && u_shadowOpacity > 0.001) {
    float ang = radians(u_shadowAngle);
    vec2 shDir = vec2(cos(ang), -sin(ang)) * max(0.004, u_shadowDist);
    vec2 shUv = clamp(uv - shDir, 0.0, 1.0);
    vec2 shUv2 = clamp(uv - shDir * 1.65, 0.0, 1.0);
    float hCast = abs(texture(u_height, shUv).r) + 0.55 * abs(texture(u_height, shUv2).r);
    float inkCast = texture(u_ink, clamp(inkUv - shDir, 0.0, 1.0)).a;
    inkCast = max(inkCast, 0.5 * texture(u_ink, clamp(inkUv - shDir * 1.65, 0.0, 1.0)).a);
    float live = smoothstep(0.012, 0.16, hCast);
    float rim = smoothstep(0.02, 0.22, inkCast);
    float self = smoothstep(0.08, 0.55, inkMark);
    float sh = max(live, rim * (1.0 - self * 0.35));
    float shW = clamp(sh * u_shadowOpacity, 0.0, 0.92);
    vec3 shCol = u_shadowColor;
    if ((u_fxLayers & 16) != 0) {
      vec3 shFx = applyBrushFx(col, u_shadowColor, u_brushFx);
      shCol = mix(u_shadowColor, shFx, clamp(u_fxOpacity, 0.0, 1.0));
    }
    col = mix(col, shCol, shW * (1.0 - self * 0.22));
  }
  float vig = smoothstep(1.25, 0.28, length(v_uv - 0.5));
  float vigAmt = mix(0.28, 0.12, u_camMix);
  col *= (1.0 - vigAmt) + vigAmt * vig;
  fragColor = vec4(col, 1.0);
}
`;
