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
 * Final composite: height → normal → palette, with live camera as the medium.
 *
 * Strokes refract and pull the feed (faces/objects warp under the brush).
 * Camera UV is rotated by u_camAngle and optionally mirrored for front cameras.
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
uniform float u_camMix;      // overall camera presence
uniform float u_camAngle;    // 0, 90, 180, 270 — screen orientation
uniform float u_camMirror;   // 1 = mirror X (front camera)
uniform float u_camInteract; // 0 = flat bed, 1 = strokes fully warp the feed

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

/** Rotate UV the same direction the device turns (screen.orientation.angle). */
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

void main() {
  float h = texture(u_height, v_uv).r;
  float hx = texture(u_height, v_uv + vec2(u_texel.x, 0.0)).r
           - texture(u_height, v_uv - vec2(u_texel.x, 0.0)).r;
  float hy = texture(u_height, v_uv + vec2(0.0, u_texel.y)).r
           - texture(u_height, v_uv - vec2(0.0, u_texel.y)).r;

  vec3 n = normalize(vec3(-hx * 4.0, -hy * 4.0, 1.0));
  vec3 light = normalize(vec3(0.35, 0.5, 1.0));
  float diff = max(0.0, dot(n, light));
  float spec = pow(max(0.0, dot(reflect(-light, n), vec3(0.0, 0.0, 1.0))), 28.0);

  float drawn = smoothstep(0.008, 0.16, abs(h));
  float edge = length(vec2(hx, hy));
  float ridge = smoothstep(0.012, 0.14, edge);

  float t = (h * 0.5 + 0.5);
  t = mix(u_rangeStart, u_rangeEnd, clamp(t, 0.0, 1.0));
  vec3 base = sampleRamp(t);

  vec3 col = base * (0.45 + 0.55 * diff) + vec3(spec * 0.35);

  // Camera is the medium: strokes refract faces/objects in frame, not hide them.
  if (u_camMix > 0.001) {
    float interact = clamp(u_camInteract, 0.0, 1.0);
    // Height gradient bends the sample — strongest on marks and ridges
    float warpGain = (0.18 + 2.6 * interact) * (0.35 + drawn * 0.9 + ridge * 0.75);
    vec2 warp = vec2(hx, hy) * warpGain;
    // Slight radial pull toward stroke centers so features "melt" into the mark
    warp += n.xy * drawn * interact * 0.04;

    vec2 cuv = orientCamUv(v_uv + warp, u_camAngle);
    if (u_camMirror > 0.5) cuv.x = 1.0 - cuv.x;
    cuv = clamp(cuv, 0.002, 0.998);

    // Cheap chromatic spread on hard ridges so warped faces look liquid
    float chroma = ridge * interact * 0.012;
    vec3 cam;
    cam.r = texture(u_cam, clamp(cuv + vec2(chroma, 0.0), 0.0, 1.0)).r;
    cam.g = texture(u_cam, cuv).g;
    cam.b = texture(u_cam, clamp(cuv - vec2(chroma, 0.0), 0.0, 1.0)).b;

    vec3 litCam = cam * (0.42 + 0.58 * diff) + vec3(spec * 0.45);
    // Palette tints the feed; strokes tint harder so marks "own" the subject
    float tintAmt = 0.22 + drawn * 0.48;
    vec3 tinted = mix(litCam, litCam * (0.55 + 0.9 * base), tintAmt);

    // Show MORE camera on drawn areas so key in-frame elements ride the stroke
    float showCam = u_camMix * mix(0.62, 1.0, drawn * 0.75 + ridge * 0.35);
    col = mix(col, tinted, clamp(showCam, 0.0, 1.0));

    // Extra highlight along stroke edges over the warped feed
    col += vec3(spec * ridge * interact * 0.22);
  }

  float vig = smoothstep(1.2, 0.3, length(v_uv - 0.5));
  col *= 0.78 + 0.22 * vig;

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
