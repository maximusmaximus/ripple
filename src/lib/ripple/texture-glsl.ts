/** Shared GLSL. Texture domain rides height, velocity, gravity, mic — then `mediaField` shades it. */
export const TEXTURE_GLSL = `
float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm2(vec2 p) {
  return vnoise(p) * 0.55 + vnoise(p * 2.07) * 0.28 + vnoise(p * 4.13) * 0.17;
}

vec2 fluidDomain(vec2 uv, float h, float vel, vec2 slope, vec2 g, float pulse, vec2 extra) {
  vec2 p = uv - 0.5;
  p *= 1.0 / max(0.62, 1.0 + h * 0.38);
  p += 0.5;
  p += g * 18.0;
  p += -slope * (0.16 + abs(h) * 0.75 + abs(vel) * 0.55);
  p += vec2(-slope.y, slope.x) * vel * 0.32;
  p += vec2(sin(h * 16.0 + uv.y * 9.0), cos(vel * 12.0 - uv.x * 8.0)) * pulse * 0.08;
  p += extra;
  return p;
}

vec4 mediaField(int id, vec2 p, float time, float h, float vel) {
  if (id <= 0) return vec4(0.5, 0.0, 0.0, 0.0);
  float t = time;
  float stretch = 1.0 + abs(h) * 0.35 + abs(vel) * 0.2;
  if (id == 1) {
    float n = fbm2(p * 42.0 * stretch);
    float s = vnoise(p * 160.0 * stretch);
    vec2 w = vec2(vnoise(p * 18.0) - 0.5, vnoise(p * 18.0 + 4.2) - 0.5);
    return vec4(0.42 + n * 0.45 + s * 0.12, w * (0.8 + abs(h)), s);
  }
  if (id == 2) {
    float band = 0.5 + 0.5 * sin(p.y * 38.0 * stretch + fbm2(p * 6.0) * 2.0);
    float slip = 0.5 + 0.5 * sin(p.x * 4.0 + vel * 3.0);
    float sheen = 0.5 + 0.5 * sin(p.y * 12.0 + t * 1.8 + h * 4.0);
    vec2 w = vec2(0.4 * sin(p.y * 20.0 + vel), 0.18 * cos(p.x * 8.0));
    return vec4(mix(0.35, 0.9, band * slip), w, band * sheen * 0.35);
  }
  if (id == 3) {
    float wx = sin(p.x * 70.0 * stretch);
    float wy = sin(p.y * 70.0 * stretch);
    float weave = 0.5 + 0.5 * wx * wy;
    vec2 w = vec2(wy, wx) * 0.25;
    return vec4(0.4 + weave * 0.5, w, abs(wx * wy) * 0.25);
  }
  if (id == 4) {
    float g1 = hash21(floor(p * 220.0) + floor(t * 2.0 + abs(h) * 8.0));
    float g2 = hash21(p * 90.0 + vel * 4.0);
    vec2 w = vec2(g1 - 0.5, g2 - 0.5) * 0.8;
    return vec4(0.35 + g1 * 0.5, w, g1 * g2);
  }
  if (id == 5) {
    vec2 q = p * 4.5 * stretch + vec2(fbm2(p * 3.0) * 1.4);
    float v = fbm2(q);
    float vein = smoothstep(0.42, 0.58, v) * (1.0 - smoothstep(0.58, 0.72, v));
    vec2 w = vec2(vnoise(q) - 0.5, vnoise(q + 9.0) - 0.5) * (0.6 + vein);
    return vec4(0.3 + v * 0.55, w, vein);
  }
  if (id == 6) {
    float a = abs(sin(p.x * 48.0 * stretch));
    float b = abs(sin(p.y * 48.0 * stretch));
    float basket = mix(a, b, step(0.5, fract((p.x + p.y) * 8.0)));
    vec2 w = vec2(b - 0.5, a - 0.5) * 0.45;
    return vec4(0.35 + basket * 0.55, w, basket * 0.2);
  }
  if (id == 7) {
    float c = sin(p.x * 28.0 + t * 1.5 + h * 8.0) * sin(p.y * 22.0 - t * 1.1 + vel * 6.0);
    c += 0.55 * sin((p.x + p.y) * 18.0 + t * 0.9 + h * 6.0);
    c = 0.5 + 0.5 * c;
    vec2 w = vec2(cos(p.y * 22.0 - t), sin(p.x * 28.0 + t)) * c;
    return vec4(c, w * 0.45, pow(max(c, 0.0), 3.0));
  }
  if (id == 8) {
    vec2 gv = abs(fract(p * 14.0 * stretch) - 0.5);
    float line = 1.0 - smoothstep(0.03, 0.08, min(gv.x, gv.y));
    float pulse = 0.5 + 0.5 * sin(h * 10.0 + p.x * 6.0 + vel * 8.0);
    vec2 w = (gv - 0.25) * line;
    return vec4(0.28 + line * 0.6 * pulse, w, line * pulse);
  }
  if (id == 9) {
    float d1 = abs(sin((p.x + p.y) * 42.0 * stretch));
    float d2 = abs(sin((p.x - p.y) * 28.0 * stretch));
    float hat = 0.5 * d1 + 0.5 * d2;
    vec2 w = vec2(d2 - 0.5, d1 - 0.5) * 0.35;
    return vec4(0.32 + hat * 0.55, w, (1.0 - hat) * 0.2);
  }
  if (id == 10) {
    vec2 cell = p * 16.0 * stretch;
    vec2 i = floor(cell);
    vec2 f = fract(cell);
    float md = 1.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 off = vec2(float(x), float(y));
        vec2 n = vec2(hash21(i + off), hash21(i + off + 7.1));
        vec2 o = 0.5 + 0.5 * sin(t * 0.9 + h * 5.0 + 6.2831 * n);
        md = min(md, length(f - off - o));
      }
    }
    float foam = 1.0 - smoothstep(0.12, 0.48 + abs(h) * 0.25 + abs(vel) * 0.15, md);
    vec2 w = (f - 0.5) * foam;
    return vec4(0.25 + foam * 0.7, w, foam * foam);
  }
  float lines = 0.55 + 0.45 * sin(p.y * 380.0 + h * 12.0);
  float roll = 0.5 + 0.5 * sin(p.y * 8.0 - t * 1.6 + vel * 4.0);
  float snow = hash21(vec2(p.x * 90.0, floor(p.y * 90.0 + t * 12.0)));
  vec2 w = vec2((snow - 0.5) * 0.4, 0.2 * sin(vel * 6.0));
  return vec4(mix(0.25, 0.9, lines * roll), w, snow * 0.45);
}
`;
