export const VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/** Height-field step with optional gyro gravity advection (slosh). */
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
uniform vec2 u_point;
uniform float u_force;
uniform float u_radius;

void main() {
  vec4 c = texture(u_prev, v_uv);
  float d = distance(v_uv, u_point);
  float influence = exp(- (d * d) / (u_radius * u_radius));
  c.r += u_force * influence;
  fragColor = c;
}
`

/**
 * Final composite: palette + mic color shift + camera refraction through strokes.
 */
export const DISPLAY_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_height;
uniform sampler2D u_cam;
uniform vec2 u_texel;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_c4;
uniform vec3 u_c5;
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

vec3 sampleRamp(float t) {
  t = clamp(t, 0.0, 1.0);
  float s = t * 5.0;
  float i = floor(s);
  float f = fract(s);
  vec3 a = u_c0;
  vec3 b = u_c1;
  if (i < 0.5) { a = u_c0; b = u_c1; }
  else if (i < 1.5) { a = u_c1; b = u_c2; }
  else if (i < 2.5) { a = u_c2; b = u_c3; }
  else if (i < 3.5) { a = u_c3; b = u_c4; }
  else { a = u_c4; b = u_c5; }
  return mix(a, b, f);
}

vec2 orientCamUv(vec2 uv, float angleDeg) {
  float a = angleDeg;
  vec2 p = uv - 0.5;
  if (abs(a - 90.0) < 0.5) {
    p = vec2(p.y, -p.x);
  } else if (abs(a - 270.0) < 0.5) {
    p = vec2(-p.y, p.x);
  } else if (abs(a - 180.0) < 0.5) {
    p = vec2(-p.x, -p.y);
  }
  return p + 0.5;
}

vec2 coverOrientCamUv(vec2 uv, float angleDeg) {
  vec2 p = uv;
  float viewAsp = max(u_viewSize.x, 1.0) / max(u_viewSize.y, 1.0);
  float camAsp = max(u_camSize.x, 1.0) / max(u_camSize.y, 1.0);
  float dispAsp = camAsp;
  if (abs(angleDeg - 90.0) < 0.5 || abs(angleDeg - 270.0) < 0.5) {
    dispAsp = 1.0 / max(camAsp, 0.0001);
  }
  if (viewAsp > dispAsp) {
    float sy = dispAsp / viewAsp;
    p.y = (p.y - 0.5) * sy + 0.5;
  } else {
    float sx = viewAsp / dispAsp;
    p.x = (p.x - 0.5) * sx + 0.5;
  }
  return orientCamUv(p, angleDeg);
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

  float t = (h * 0.5 + 0.5);
  t = mix(u_rangeStart, u_rangeEnd, clamp(t, 0.0, 1.0));
  t = clamp(t + highAmt * mix(0.22, 0.48, drawn) - bass * 0.1 * drawn, 0.0, 1.0);
  vec3 base = sampleRamp(t);
  base = mix(base, u_c0, bass * drawn * 0.2);
  base = mix(base, u_c3, mid * drawn * 0.14);
  vec3 keyCol = mix(u_c4, u_c5, 0.55);
  base = mix(base, keyCol, highAmt * mix(0.28, 0.72, drawn));

  float shimmer = 0.65 + 0.35 * sin(u_time * (7.0 + highAmt * 14.0));
  float breathe = 1.0 + pulse * 0.07 * shimmer + highAmt * 0.12 * shimmer;
  spec += (pulse * 0.22 + highAmt * 0.55) * mix(0.15, 1.0, drawn) * shimmer;

  vec3 col = base * (0.45 + 0.55 * diff) * breathe + vec3(spec * 0.35);

  if (u_camMix > 0.001) {
    vec2 warp = vec2(hx, hy) * (0.12 + 3.2 * u_camInteract);
    vec2 cuv = coverOrientCamUv(v_uv + warp, u_camAngle);
    if (u_camMirror > 0.5) cuv.x = 1.0 - cuv.x;
    cuv = clamp(cuv, 0.0, 1.0);
    vec3 cam = texture(u_cam, cuv).rgb;
    vec3 camLit = cam * (0.52 + 0.48 * diff) + vec3(spec * 0.28);

    float stroke = smoothstep(0.008, 0.22, abs(h));
    float mixAmt = u_camMix * mix(0.42, mix(0.28, 1.0, u_camInteract), stroke);
    col = mix(col, camLit, mixAmt);
  }

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
