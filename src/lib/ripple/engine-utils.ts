export function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error(`Shader compile: ${log}`);
  }
  return sh;
}

export function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`Program link: ${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

export function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace("#", "");
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function lerp3(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function sampleStopsRgb(
  colors: [number, number, number][],
  ts: number[],
  t: number,
): [number, number, number] {
  if (colors.length === 0) return [0, 0, 0];
  if (colors.length === 1) return colors[0]!;
  const x = Math.max(0, Math.min(1, t));
  if (x <= ts[0]!) return colors[0]!;
  const last = colors.length - 1;
  if (x >= ts[last]!) return colors[last]!;
  for (let i = 0; i < last; i++) {
    const t0 = ts[i]!;
    const t1 = ts[i + 1]!;
    if (x >= t0 && x <= t1) {
      const f = t1 > t0 ? (x - t0) / (t1 - t0) : 0;
      return lerp3(colors[i]!, colors[i + 1]!, f);
    }
  }
  return colors[last]!;
}

export function sampleStopsA(alphas: number[], ts: number[], t: number): number {
  if (alphas.length === 0) return 1;
  if (alphas.length === 1) return alphas[0] ?? 1;
  const x = Math.max(0, Math.min(1, t));
  if (x <= ts[0]!) return alphas[0] ?? 1;
  const last = alphas.length - 1;
  if (x >= ts[last]!) return alphas[last] ?? 1;
  for (let i = 0; i < last; i++) {
    const t0 = ts[i]!;
    const t1 = ts[i + 1]!;
    if (x >= t0 && x <= t1) {
      const f = t1 > t0 ? (x - t0) / (t1 - t0) : 0;
      const a = alphas[i] ?? 1;
      const b = alphas[i + 1] ?? 1;
      return a + (b - a) * f;
    }
  }
  return alphas[last] ?? 1;
}

export function resampleRgb(
  colors: [number, number, number][],
  ts: number[],
  count: number,
): [number, number, number][] {
  if (count <= 1) return [sampleStopsRgb(colors, ts, 0.5)];
  return Array.from({ length: count }, (_, i) =>
    sampleStopsRgb(colors, ts, i / (count - 1)),
  );
}

export type FBO = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };

export type SimU = {
  prev: WebGLUniformLocation | null;
  texel: WebGLUniformLocation | null;
  damping: WebGLUniformLocation | null;
  speed: WebGLUniformLocation | null;
  dt: WebGLUniformLocation | null;
  gravity: WebGLUniformLocation | null;
};

export type SplatU = {
  prev: WebGLUniformLocation | null;
  point: WebGLUniformLocation | null;
  force: WebGLUniformLocation | null;
  radius: WebGLUniformLocation | null;
  stamp: WebGLUniformLocation | null;
  useStamp: WebGLUniformLocation | null;
  angle: WebGLUniformLocation | null;
  aspect: WebGLUniformLocation | null;
};

export type InkU = {
  prev: WebGLUniformLocation | null;
  point: WebGLUniformLocation | null;
  force: WebGLUniformLocation | null;
  radius: WebGLUniformLocation | null;
  t: WebGLUniformLocation | null;
  colorA: WebGLUniformLocation | null;
  stamp: WebGLUniformLocation | null;
  useStamp: WebGLUniformLocation | null;
  angle: WebGLUniformLocation | null;
  aspect: WebGLUniformLocation | null;
};

export type DispU = {
  height: WebGLUniformLocation | null;
  cam: WebGLUniformLocation | null;
  ink: WebGLUniformLocation | null;
  texel: WebGLUniformLocation | null;
  c: (WebGLUniformLocation | null)[];
  nStops: WebGLUniformLocation | null;
  stopC: (WebGLUniformLocation | null)[];
  stopT: (WebGLUniformLocation | null)[];
  stopA: (WebGLUniformLocation | null)[];
  rangeStart: WebGLUniformLocation | null;
  rangeEnd: WebGLUniformLocation | null;
  time: WebGLUniformLocation | null;
  camMix: WebGLUniformLocation | null;
  camInteract: WebGLUniformLocation | null;
  camAngle: WebGLUniformLocation | null;
  camMirror: WebGLUniformLocation | null;
  camSize: WebGLUniformLocation | null;
  viewSize: WebGLUniformLocation | null;
  micPulse: WebGLUniformLocation | null;
  micBass: WebGLUniformLocation | null;
  micMid: WebGLUniformLocation | null;
  micHigh: WebGLUniformLocation | null;
  brushFx: WebGLUniformLocation | null;
  fxOpacity: WebGLUniformLocation | null;
  fxLayers: WebGLUniformLocation | null;
  gravity: WebGLUniformLocation | null;
  shadowOn: WebGLUniformLocation | null;
  shadowColor: WebGLUniformLocation | null;
  shadowAngle: WebGLUniformLocation | null;
  shadowOpacity: WebGLUniformLocation | null;
  shadowDist: WebGLUniformLocation | null;
  texId: WebGLUniformLocation | null;
  texMap: WebGLUniformLocation | null;
  texHasMap: WebGLUniformLocation | null;
  texFit: WebGLUniformLocation | null;
  texSize: WebGLUniformLocation | null;
  texLevels: WebGLUniformLocation | null;
  texInvert: WebGLUniformLocation | null;
  viewZoom: WebGLUniformLocation | null;
  micZoom: WebGLUniformLocation | null;
  gyroZoom: WebGLUniformLocation | null;
};

export function mix01(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function isVideo(src: TexImageSource): src is HTMLVideoElement {
  return typeof HTMLVideoElement !== "undefined" && src instanceof HTMLVideoElement;
}

export function sourceSize(src: TexImageSource | null): { w: number; h: number } {
  if (!src) return { w: 0, h: 0 };
  if (typeof HTMLVideoElement !== "undefined" && src instanceof HTMLVideoElement) {
    return { w: src.videoWidth, h: src.videoHeight };
  }
  if (typeof HTMLCanvasElement !== "undefined" && src instanceof HTMLCanvasElement) {
    return { w: src.width, h: src.height };
  }
  if (typeof ImageBitmap !== "undefined" && src instanceof ImageBitmap) {
    return { w: src.width, h: src.height };
  }
  if (typeof OffscreenCanvas !== "undefined" && src instanceof OffscreenCanvas) {
    return { w: src.width, h: src.height };
  }
  if (typeof HTMLImageElement !== "undefined" && src instanceof HTMLImageElement) {
    return { w: src.naturalWidth, h: src.naturalHeight };
  }
  return { w: 0, h: 0 };
}

export function computePunchView(opts: {
  pulse: number;
  bass: number;
  high: number;
  micZoom: number;
  gx: number;
  gy: number;
  gyroZoom: number;
  time: number;
}): { zoom: number; sloshX: number; sloshY: number } {
  const mz = Math.max(0, Math.min(1.5, opts.micZoom));
  const gz = Math.max(0, Math.min(1.5, opts.gyroZoom));
  const punch = Math.pow(
    Math.max(0, Math.min(1.6, opts.pulse * 0.78 + opts.bass * 0.42)),
    0.68,
  );
  const micGain = mz * 1.1;
  const wobble = Math.sin(opts.time * 8.5) * opts.high * 0.05 * mz;
  const tilt = Math.min(0.85, Math.hypot(opts.gx, opts.gy) * 5.5 * gz);
  const zoom = Math.min(2.35, Math.max(1, 1 + punch * micGain + tilt + wobble));
  return {
    zoom,
    sloshX: opts.gx * 12,
    sloshY: opts.gy * 12,
  };
}
