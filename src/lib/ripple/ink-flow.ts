import { TEXTURE_GLSL } from "./texture-glsl";

export const INK_FLOW_FRAG =
  `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_prev;
uniform sampler2D u_height;
uniform vec2 u_texel;
uniform vec2 u_gravity;
uniform float u_mic;
uniform float u_dt;
uniform int u_texId;
uniform float u_time;
uniform sampler2D u_texMap;
uniform float u_texHasMap;
uniform float u_texFit;
uniform vec2 u_texSize;
uniform vec2 u_viewSize;
uniform float u_texLevels;
uniform float u_texInvert;
` +
  TEXTURE_GLSL +
  `
void main() {
  vec4 htex = texture(u_height, v_uv);
  float h = htex.r;
  float vel = htex.g;

  float hx = texture(u_height, v_uv + vec2(u_texel.x, 0.0)).r
           - texture(u_height, v_uv - vec2(u_texel.x, 0.0)).r;
  float hy = texture(u_height, v_uv + vec2(0.0, u_texel.y)).r
           - texture(u_height, v_uv - vec2(0.0, u_texel.y)).r;
  vec2 slope = vec2(hx, hy);

  vec2 flow = -slope * (2.4 + abs(vel) * 5.5);
  flow += vec2(-hy, hx) * vel * 3.2;
  flow += u_gravity * 7.0;
  float mic = clamp(u_mic, 0.0, 1.5);
  flow += vec2(sin(h * 18.0 + vel * 9.0), cos(h * 14.0 - vel * 11.0)) * mic * 0.9;

  vec2 texP = fluidDomain(v_uv, h, vel, slope, u_gravity, mic, flow * 0.016);
  vec4 tf = mediaField(u_texId, texP, u_time, h, vel);
  if (u_texId > 0) {
    flow *= mix(1.0, 0.78 + tf.x * 0.3, 0.55);
  }

  float energy = abs(h) * 1.4 + abs(vel) * 2.2 + mic * 0.35 + length(u_gravity) * 12.0;
  energy += (u_texId > 0 ? abs(tf.x - 0.5) * 0.6 : 0.0);
  float strength = clamp(energy * 1.8, 0.05, 1.0);
  float dtScale = clamp(u_dt, 0.008, 0.04) * 55.0;

  vec2 src = clamp(v_uv - flow * strength * dtScale * 0.018, u_texel, vec2(1.0) - u_texel);
  vec4 c = texture(u_prev, v_uv);
  vec4 adv = texture(u_prev, src);

  float mixAmt = clamp(0.12 + strength * 0.55, 0.12, 0.72);
  vec3 rgb = mix(c.rgb, adv.rgb, mixAmt * step(0.01, adv.a + c.a));
  float a = mix(c.a, max(c.a, adv.a), mixAmt);

  vec4 n0 = texture(u_prev, v_uv + vec2(0.0, u_texel.y));
  vec4 n1 = texture(u_prev, v_uv + vec2(0.0, -u_texel.y));
  vec4 n2 = texture(u_prev, v_uv + vec2(u_texel.x, 0.0));
  vec4 n3 = texture(u_prev, v_uv + vec2(-u_texel.x, 0.0));
  float aBest = c.a;
  vec3 rgbBest = c.rgb;
  if (n0.a > aBest) { aBest = n0.a; rgbBest = n0.rgb; }
  if (n1.a > aBest) { aBest = n1.a; rgbBest = n1.rgb; }
  if (n2.a > aBest) { aBest = n2.a; rgbBest = n2.rgb; }
  if (n3.a > aBest) { aBest = n3.a; rgbBest = n3.rgb; }

  float wave = smoothstep(0.008, 0.2, abs(h) + abs(vel) * 1.5);
  float thin = 1.0 - smoothstep(0.04, 0.3, c.a);
  float dilate = wave * thin * 0.58;
  if (u_texId > 0) dilate *= mix(0.7, 1.25, tf.x);
  rgb = mix(rgb, rgbBest, dilate);
  a = mix(a, max(a, aBest * 0.92), dilate);

  fragColor = vec4(rgb, clamp(a, 0.0, 1.0));
}
`;
