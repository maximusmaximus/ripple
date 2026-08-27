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
uniform sampler2D u_stamp;
uniform float u_useStamp;
uniform float u_angle;
uniform float u_aspect;
uniform float u_width;

float stampMask() {
  vec2 d = v_uv - u_point;
  d.x *= max(0.2, u_aspect);
  float c = cos(u_angle);
  float s = sin(u_angle);
  vec2 p = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);
  p.x /= max(0.18, u_width);
  float sR = max(1e-5, u_radius * 2.2);
  vec2 suv = p / sR + 0.5;
  if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) return 0.0;
  return clamp(texture(u_stamp, suv).a, 0.0, 1.0);
}

void main() {
  vec4 c = texture(u_prev, v_uv);
  float influence;
  if (u_useStamp > 0.5) {
    influence = stampMask();
  } else {
    vec2 d = v_uv - u_point;
    float cA = cos(u_angle);
    float sA = sin(u_angle);
    vec2 p = vec2(cA * d.x + sA * d.y, -sA * d.x + cA * d.y);
    p.x /= max(0.18, u_width);
    float dist = length(p);
    influence = exp(-dist * dist / max(1e-6, u_radius * u_radius));
  }
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
uniform float u_t;
uniform float u_colorA;
uniform float u_along;
uniform sampler2D u_stamp;
uniform float u_useStamp;
uniform float u_angle;
uniform float u_aspect;
uniform float u_width;

float stampMask() {
  vec2 d = v_uv - u_point;
  d.x *= max(0.2, u_aspect);
  float c = cos(u_angle);
  float s = sin(u_angle);
  vec2 p = vec2(c * d.x + s * d.y, -s * d.x + c * d.y);
  p.x /= max(0.18, u_width);
  float sR = max(1e-5, u_radius * 2.2);
  vec2 suv = p / sR + 0.5;
  if (suv.x < 0.0 || suv.x > 1.0 || suv.y < 0.0 || suv.y > 1.0) return 0.0;
  return clamp(texture(u_stamp, suv).a, 0.0, 1.0);
}

void main() {
  vec4 prev = texture(u_prev, v_uv);
  float influence;
  if (u_useStamp > 0.5) {
    influence = stampMask();
  } else {
    vec2 d = v_uv - u_point;
    float cA = cos(u_angle);
    float sA = sin(u_angle);
    vec2 p = vec2(cA * d.x + sA * d.y, -sA * d.x + cA * d.y);
    p.x /= max(0.18, u_width);
    float dist = length(p);
    influence = exp(-dist * dist / max(1e-6, u_radius * u_radius));
  }
  float gain = u_useStamp > 0.5 ? 1.8 : 3.2;
  float m = clamp(influence * max(0.35, abs(u_force)) * gain, 0.0, 1.0);
  if (m < 0.004) { fragColor = prev; return; }
  float a = clamp(max(prev.a, m * max(0.2, u_colorA)), 0.0, 1.0);
  float t = prev.a > 0.04 ? mix(prev.r, u_t, m) : u_t;
  float along = prev.a > 0.04 ? mix(prev.g, clamp(u_along, 0.0, 1.0), m) : clamp(u_along, 0.0, 1.0);
  fragColor = vec4(clamp(t, 0.0, 1.0), along, 1.0, a);
}
`

export const CLEAR_FRAG = `#version 300 es
precision highp float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0, 0.0, 0.0, 0.0); }
`
