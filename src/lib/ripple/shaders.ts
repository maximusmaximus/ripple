export { INK_FLOW_FRAG } from "./ink-flow";
export { DISPLAY_FRAG } from "./display-frag";
export const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

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
  vec2 g = u_gravity;
  float glen = length(g);
  if (glen > 0.00008) {
    vec2 src = clamp(v_uv - g * 4.0, u_texel, vec2(1.0) - u_texel);
    vec4 adv = texture(u_prev, src);
    float amt = clamp(glen * 40.0, 0.0, 0.55);
    h = mix(h, adv.r, amt);
    v = mix(v, adv.g, amt * 0.75);
    v += (adv.r - c.r) * amt * 3.0;
    vec2 side = vec2(-g.y, g.x) * 1.8;
    vec4 shear = texture(u_prev, clamp(v_uv - side, u_texel, vec2(1.0) - u_texel));
    h = mix(h, shear.r, amt * 0.35);
  }
  h = clamp(h, -1.5, 1.5);
  v = clamp(v, -1.5, 1.5);
  fragColor = vec4(h, v, 0.0, 1.0);
}
`

export const SPLAT_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_prev;
uniform vec2 u_point;
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
  vec4 prev = texture(u_prev, v_uv);
  vec2 d = v_uv - u_point;
  float dist = length(d);
  float influence = exp(-dist * dist / max(1e-6, u_radius * u_radius));
  float m = clamp(influence * max(0.35, abs(u_force)) * 3.2, 0.0, 1.0);
  if (m < 0.004) { fragColor = prev; return; }
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

export const CLEAR_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0, 0.0, 0.0, 1.0); }
`
