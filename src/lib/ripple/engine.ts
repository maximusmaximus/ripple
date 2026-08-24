import { VERT, SIM_FRAG, SPLAT_FRAG, INK_SPLAT_FRAG, DISPLAY_FRAG, CLEAR_FRAG } from "./shaders";
import type { Splat } from "./pointer";
import type { ScreenAngle } from "./orientation";
import { resolveCameraAngle } from "./orientation";
import type { MicFrame } from "./media";
import { SILENT_MIC } from "./media";

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
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

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`Program link: ${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace("#", "");
  const full = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function lerp3(
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

function sampleStopsRgb(
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

function sampleStopsA(alphas: number[], ts: number[], t: number): number {
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

function resampleRgb(
  colors: [number, number, number][],
  ts: number[],
  count: number,
): [number, number, number][] {
  if (count <= 1) return [sampleStopsRgb(colors, ts, 0.5)];
  return Array.from({ length: count }, (_, i) =>
    sampleStopsRgb(colors, ts, i / (count - 1)),
  );
}

type FBO = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number };

type SimU = {
  prev: WebGLUniformLocation | null;
  texel: WebGLUniformLocation | null;
  damping: WebGLUniformLocation | null;
  speed: WebGLUniformLocation | null;
  dt: WebGLUniformLocation | null;
  gravity: WebGLUniformLocation | null;
};

type SplatU = {
  prev: WebGLUniformLocation | null;
  point: WebGLUniformLocation | null;
  force: WebGLUniformLocation | null;
  radius: WebGLUniformLocation | null;
};

type InkU = {
  prev: WebGLUniformLocation | null;
  point: WebGLUniformLocation | null;
  force: WebGLUniformLocation | null;
  radius: WebGLUniformLocation | null;
  color: WebGLUniformLocation | null;
  colorA: WebGLUniformLocation | null;
  brushFx: WebGLUniformLocation | null;
  fxOpacity: WebGLUniformLocation | null;
};

type DispU = {
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
};

function mix01(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function isVideo(src: TexImageSource): src is HTMLVideoElement {
  return typeof HTMLVideoElement !== "undefined" && src instanceof HTMLVideoElement;
}

function sourceSize(src: TexImageSource | null): { w: number; h: number } {
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

export class RippleEngine {
  private gl: WebGL2RenderingContext;
  private canvas: HTMLCanvasElement;
  private simW = 384;
  private simH = 384;
  private ping!: FBO;
  private pong!: FBO;
  private inkPing!: FBO;
  private inkPong!: FBO;
  private simProg!: WebGLProgram;
  private splatProg!: WebGLProgram;
  private inkProg!: WebGLProgram;
  private displayProg!: WebGLProgram;
  private clearProg!: WebGLProgram;
  private vao!: WebGLVertexArrayObject;
  private quad!: WebGLBuffer;
  private simU!: SimU;
  private splatU!: SplatU;
  private inkU!: InkU;
  private dispU!: DispU;
  private damping = 0.985;
  private speed = 0.18;
  private rangeStart = 0;
  private rangeEnd = 1;
  private colors: [number, number, number][] = [
    [0, 0, 0],
    [0.1, 0.1, 0.2],
    [0.2, 0.3, 0.5],
    [0.4, 0.6, 0.8],
    [0.7, 0.9, 1],
    [1, 1, 1],
  ];
  private stopColors: [number, number, number][] = [
    [0, 0, 0],
    [0.1, 0.1, 0.2],
    [0.2, 0.3, 0.5],
    [0.4, 0.6, 0.8],
    [0.7, 0.9, 1],
    [1, 1, 1],
  ];
  private stopT: number[] = [0, 0.2, 0.4, 0.6, 0.8, 1];
  private stopA: number[] = [1, 1, 1, 1, 1, 1];
  private running = false;
  private raf = 0;
  private lastT = 0;
  private camTex: WebGLTexture | null = null;
  private camSource: TexImageSource | null = null;
  private camMix = 0;
  private camInteract = 0.65;
  private camAngle: ScreenAngle = 0;
  private camMirror = false;
  private camReady = false;
  private mic: MicFrame = { ...SILENT_MIC };
  private brushFx = 0;
  private fxOpacity = 1;
  private gx = 0;
  private gy = 0;
  private firstFrameCb: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });
    if (!gl) throw new Error("WebGL2 required");
    this.gl = gl;
    this.init();
  }

  private makeFBO(w: number, h: number): FBO {
    const gl = this.gl;
    const tryFmt = (internal: number, type: number): FBO | null => {
      const tex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const fbo = gl.createFramebuffer()!;
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
      const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (!ok) {
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
        return null;
      }
      return { tex, fbo, w, h };
    };

    gl.getExtension("EXT_color_buffer_float");
    gl.getExtension("EXT_color_buffer_half_float");
    const hi = tryFmt(gl.RGBA16F, gl.HALF_FLOAT);
    if (hi) return hi;
    const lo = tryFmt(gl.RGBA, gl.UNSIGNED_BYTE);
    if (lo) return lo;
    throw new Error("Could not allocate simulation buffer");
  }

  private deleteFBO(f: FBO | undefined) {
    if (!f) return;
    this.gl.deleteTexture(f.tex);
    this.gl.deleteFramebuffer(f.fbo);
  }

  private allocSim(cssW: number, cssH: number) {
    const max = 448;
    const aspect = Math.max(0.3, Math.min(3.2, cssW / Math.max(1, cssH)));
    let w: number;
    let h: number;
    if (aspect >= 1) {
      w = max;
      h = Math.max(160, Math.round(max / aspect));
    } else {
      h = max;
      w = Math.max(160, Math.round(max * aspect));
    }
    w = (w + 7) & ~7;
    h = (h + 7) & ~7;
    if (this.ping && this.simW === w && this.simH === h) return;
    this.deleteFBO(this.ping);
    this.deleteFBO(this.pong);
    this.deleteFBO(this.inkPing);
    this.deleteFBO(this.inkPong);
    this.simW = w;
    this.simH = h;
    this.ping = this.makeFBO(w, h);
    this.pong = this.makeFBO(w, h);
    this.inkPing = this.makeFBO(w, h);
    this.inkPong = this.makeFBO(w, h);
    this.clear();
  }

  private init() {
    const gl = this.gl;
    this.simProg = program(gl, VERT, SIM_FRAG);
    this.splatProg = program(gl, VERT, SPLAT_FRAG);
    this.inkProg = program(gl, VERT, INK_SPLAT_FRAG);
    this.displayProg = program(gl, VERT, DISPLAY_FRAG);
    this.clearProg = program(gl, VERT, CLEAR_FRAG);

    this.simU = {
      prev: gl.getUniformLocation(this.simProg, "u_prev"),
      texel: gl.getUniformLocation(this.simProg, "u_texel"),
      damping: gl.getUniformLocation(this.simProg, "u_damping"),
      speed: gl.getUniformLocation(this.simProg, "u_speed"),
      dt: gl.getUniformLocation(this.simProg, "u_dt"),
      gravity: gl.getUniformLocation(this.simProg, "u_gravity"),
    };
    this.splatU = {
      prev: gl.getUniformLocation(this.splatProg, "u_prev"),
      point: gl.getUniformLocation(this.splatProg, "u_point"),
      force: gl.getUniformLocation(this.splatProg, "u_force"),
      radius: gl.getUniformLocation(this.splatProg, "u_radius"),
    };
    this.inkU = {
      prev: gl.getUniformLocation(this.inkProg, "u_prev"),
      point: gl.getUniformLocation(this.inkProg, "u_point"),
      force: gl.getUniformLocation(this.inkProg, "u_force"),
      radius: gl.getUniformLocation(this.inkProg, "u_radius"),
      color: gl.getUniformLocation(this.inkProg, "u_color"),
      colorA: gl.getUniformLocation(this.inkProg, "u_colorA"),
      brushFx: gl.getUniformLocation(this.inkProg, "u_brushFx"),
      fxOpacity: gl.getUniformLocation(this.inkProg, "u_fxOpacity"),
    };
    this.dispU = {
      height: gl.getUniformLocation(this.displayProg, "u_height"),
      cam: gl.getUniformLocation(this.displayProg, "u_cam"),
      ink: gl.getUniformLocation(this.displayProg, "u_ink"),
      texel: gl.getUniformLocation(this.displayProg, "u_texel"),
      c: [0, 1, 2, 3, 4, 5].map((i) => gl.getUniformLocation(this.displayProg, `u_c${i}`)),
      nStops: gl.getUniformLocation(this.displayProg, "u_nStops"),
      stopC: Array.from({ length: 11 }, (_, i) =>
        gl.getUniformLocation(this.displayProg, `u_stopC[${i}]`),
      ),
      stopT: Array.from({ length: 11 }, (_, i) =>
        gl.getUniformLocation(this.displayProg, `u_stopT[${i}]`),
      ),
      stopA: Array.from({ length: 11 }, (_, i) =>
        gl.getUniformLocation(this.displayProg, `u_stopA[${i}]`),
      ),
      rangeStart: gl.getUniformLocation(this.displayProg, "u_rangeStart"),
      rangeEnd: gl.getUniformLocation(this.displayProg, "u_rangeEnd"),
      time: gl.getUniformLocation(this.displayProg, "u_time"),
      camMix: gl.getUniformLocation(this.displayProg, "u_camMix"),
      camInteract: gl.getUniformLocation(this.displayProg, "u_camInteract"),
      camAngle: gl.getUniformLocation(this.displayProg, "u_camAngle"),
      camMirror: gl.getUniformLocation(this.displayProg, "u_camMirror"),
      camSize: gl.getUniformLocation(this.displayProg, "u_camSize"),
      viewSize: gl.getUniformLocation(this.displayProg, "u_viewSize"),
      micPulse: gl.getUniformLocation(this.displayProg, "u_micPulse"),
      micBass: gl.getUniformLocation(this.displayProg, "u_micBass"),
      micMid: gl.getUniformLocation(this.displayProg, "u_micMid"),
      micHigh: gl.getUniformLocation(this.displayProg, "u_micHigh"),
      brushFx: gl.getUniformLocation(this.displayProg, "u_brushFx"),
      fxOpacity: gl.getUniformLocation(this.displayProg, "u_fxOpacity"),
    };

    this.quad = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.vao = gl.createVertexArray()!;
    gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const cssW = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const cssH = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.allocSim(cssW, cssH);

    document.addEventListener("visibilitychange", this.onVis);
  }

  private onVis = () => {
    if (!this.running) return;
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.lastT = 0;
    } else {
      this.lastT = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  };

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(Math.max(1, this.canvas.clientWidth) * dpr);
    const h = Math.floor(Math.max(1, this.canvas.clientHeight) * dpr);
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.allocSim(this.canvas.clientWidth, this.canvas.clientHeight);
    }
  }

  setParams(opts: {
    viscosity?: number;
    waveStrength?: number;
    colors?: string[];
    stops?: { t: number; color: string; alpha?: number }[];
    rangeStart?: number;
    rangeEnd?: number;
    cameraMix?: number;
    cameraInteract?: number;
    brushFx?: number;
    fxOpacity?: number;
  }) {
    if (opts.viscosity != null) this.damping = 0.996 - (1 - opts.viscosity) * 0.078;
    if (opts.waveStrength != null) this.speed = Math.max(0.05, Math.min(0.35, opts.waveStrength * 0.22));
    if (opts.stops && opts.stops.length >= 2) {
      const sorted = [...opts.stops]
        .sort((a, b) => a.t - b.t)
        .slice(0, 11);
      this.stopColors = sorted.map((s) => hexToRgb(s.color));
      this.stopT = sorted.map((s) => Math.max(0, Math.min(1, s.t)));
      this.stopA = sorted.map((s) => Math.max(0, Math.min(1, s.alpha ?? 1)));
      this.colors = resampleRgb(this.stopColors, this.stopT, 6);
    } else if (opts.colors) {
      const cols = opts.colors.slice(0, 6);
      while (cols.length < 6) cols.push(cols[cols.length - 1] ?? "#ffffff");
      this.colors = cols.map(hexToRgb);
      this.stopColors = this.colors;
      this.stopT = this.colors.map((_, i) =>
        this.colors.length <= 1 ? 0 : i / (this.colors.length - 1),
      );
      this.stopA = this.colors.map(() => 1);
    }
    if (opts.rangeStart != null) this.rangeStart = opts.rangeStart;
    if (opts.rangeEnd != null) this.rangeEnd = opts.rangeEnd;
    if (opts.cameraMix != null) this.camMix = Math.max(0, Math.min(1, opts.cameraMix));
    if (opts.cameraInteract != null) this.camInteract = Math.max(0, Math.min(1, opts.cameraInteract));
    if (opts.brushFx != null) this.brushFx = opts.brushFx | 0;
    if (opts.fxOpacity != null) this.fxOpacity = Math.max(0, Math.min(1, opts.fxOpacity));
  }

  setGravity(x: number, y: number) {
    this.gx = Math.max(-0.08, Math.min(0.08, x));
    this.gy = Math.max(-0.08, Math.min(0.08, y));
  }

  setMicPulse(frame: MicFrame | number) {
    if (typeof frame === "number") {
      const n = Math.max(0, Math.min(1.5, frame));
      this.mic = n <= 0.001 ? { ...SILENT_MIC } : { level: n, bass: n * 0.4, mid: n * 0.35, high: n * 0.25 };
      return;
    }
    this.mic = {
      level: Math.max(0, Math.min(1.5, frame.level)),
      bass: Math.max(0, Math.min(1.5, frame.bass)),
      mid: Math.max(0, Math.min(1.5, frame.mid)),
      high: Math.max(0, Math.min(1.5, frame.high)),
    };
  }

  setCamera(
    source: TexImageSource | null,
    opts?: { angle?: ScreenAngle; mirror?: boolean; mix?: number },
  ) {
    this.camSource = source;
    if (opts?.angle != null) this.camAngle = opts.angle;
    if (opts?.mirror != null) this.camMirror = opts.mirror;
    if (opts?.mix != null) this.camMix = Math.max(0, Math.min(1, opts.mix));
    if (!source) {
      this.camReady = false;
      this.camMix = 0;
    }
  }

  setCameraOrientation(angle: ScreenAngle) {
    this.camAngle = angle;
  }

  applySplats(splats: Splat[]) {
    if (!splats.length) return;
    const gl = this.gl;
    gl.useProgram(this.splatProg);
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, this.simW, this.simH);
    for (const s of splats) {
      const ux = s.x;
      const uy = 1 - s.y;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pong.fbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.ping.tex);
      gl.uniform1i(this.splatU.prev, 0);
      gl.uniform2f(this.splatU.point, ux, uy);
      gl.uniform1f(this.splatU.force, s.force);
      gl.uniform1f(this.splatU.radius, Math.max(0.004, s.radius));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const tmp = this.ping;
      this.ping = this.pong;
      this.pong = tmp;

      gl.useProgram(this.inkProg);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.inkPong.fbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.inkPing.tex);
      gl.uniform1i(this.inkU.prev, 0);
      gl.uniform2f(this.inkU.point, ux, uy);
      gl.uniform1f(this.inkU.force, s.force);
      gl.uniform1f(this.inkU.radius, Math.max(0.004, s.radius));
      const rgb = this.strokeRgb(s.force);
      gl.uniform3f(this.inkU.color, rgb[0], rgb[1], rgb[2]);
      gl.uniform1f(this.inkU.colorA, this.strokeAlpha(s.force));
      gl.uniform1i(this.inkU.brushFx, this.brushFx);
      gl.uniform1f(this.inkU.fxOpacity, this.fxOpacity);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const inkTmp = this.inkPing;
      this.inkPing = this.inkPong;
      this.inkPong = inkTmp;
      gl.useProgram(this.splatProg);
    }
  }

  private strokeRgb(force: number): [number, number, number] {
    const t = mix01(this.rangeStart, this.rangeEnd, Math.max(0, Math.min(1, Math.abs(force))));
    return sampleStopsRgb(this.stopColors, this.stopT, t);
  }

  private strokeAlpha(force: number): number {
    const t = mix01(this.rangeStart, this.rangeEnd, Math.max(0, Math.min(1, Math.abs(force))));
    return sampleStopsA(this.stopA, this.stopT, t);
  }

  clear() {
    const gl = this.gl;
    gl.useProgram(this.clearProg);
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, this.simW, this.simH);
    for (const f of [this.ping, this.pong, this.inkPing, this.inkPong]) {
      if (!f) continue;
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  private step(dt: number) {
    const gl = this.gl;
    gl.useProgram(this.simProg);
    gl.bindVertexArray(this.vao);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pong.fbo);
    gl.viewport(0, 0, this.simW, this.simH);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.ping.tex);
    gl.uniform1i(this.simU.prev, 0);
    gl.uniform2f(this.simU.texel, 1 / this.simW, 1 / this.simH);
    gl.uniform1f(this.simU.damping, this.damping);
    gl.uniform1f(this.simU.speed, this.speed);
    gl.uniform1f(this.simU.dt, Math.min(dt, 0.033));
    gl.uniform2f(this.simU.gravity, this.gx, this.gy);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const tmp = this.ping;
    this.ping = this.pong;
    this.pong = tmp;
  }

  private uploadCam() {
    const gl = this.gl;
    const src = this.camSource;
    if (!src) return;
    if (isVideo(src) && (!src.videoWidth || src.readyState < 2)) return;

    if (!this.camTex) {
      this.camTex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, this.camTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.camTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    this.camReady = true;
  }

  private drawDisplay() {
    const gl = this.gl;
    this.resize();
    if (this.camSource) this.uploadCam();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.displayProg);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.ping.tex);
    gl.uniform1i(this.dispU.height, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.camReady && this.camTex ? this.camTex : this.ping.tex);
    gl.uniform1i(this.dispU.cam, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, this.inkPing.tex);
    gl.uniform1i(this.dispU.ink, 2);
    gl.uniform2f(this.dispU.texel, 1 / this.simW, 1 / this.simH);
    for (let i = 0; i < 6; i++) {
      const c = this.colors[i] ?? [1, 1, 1];
      gl.uniform3f(this.dispU.c[i] ?? null, c[0], c[1], c[2]);
    }
    const nStops = Math.max(2, Math.min(11, this.stopColors.length));
    gl.uniform1i(this.dispU.nStops, nStops);
    for (let i = 0; i < 11; i++) {
      const c = this.stopColors[Math.min(i, nStops - 1)] ?? [1, 1, 1];
      const t = this.stopT[Math.min(i, nStops - 1)] ?? 1;
      const a = this.stopA[Math.min(i, nStops - 1)] ?? 1;
      gl.uniform3f(this.dispU.stopC[i] ?? null, c[0], c[1], c[2]);
      gl.uniform1f(this.dispU.stopT[i] ?? null, t);
      gl.uniform1f(this.dispU.stopA[i] ?? null, a);
    }
    gl.uniform1f(this.dispU.rangeStart, this.rangeStart);
    gl.uniform1f(this.dispU.rangeEnd, this.rangeEnd);
    gl.uniform1f(this.dispU.time, this.lastT / 1000);
    gl.uniform1f(this.dispU.camMix, this.camReady ? this.camMix : 0);
    gl.uniform1f(this.dispU.camInteract, this.camInteract);
    gl.uniform1f(this.dispU.micPulse, this.mic.level);
    gl.uniform1f(this.dispU.micBass, this.mic.bass);
    gl.uniform1f(this.dispU.micMid, this.mic.mid);
    gl.uniform1f(this.dispU.micHigh, this.mic.high);
    gl.uniform1i(this.dispU.brushFx, this.brushFx);
    gl.uniform1f(this.dispU.fxOpacity, this.fxOpacity);
    const viewW = Math.max(1, this.canvas.clientWidth || this.canvas.width);
    const viewH = Math.max(1, this.canvas.clientHeight || this.canvas.height);
    const cam = sourceSize(this.camSource);
    const camAngle = resolveCameraAngle(cam.w, cam.h, viewW, viewH, this.camAngle);
    gl.uniform1f(this.dispU.camAngle, camAngle);
    gl.uniform1f(this.dispU.camMirror, this.camMirror ? 1 : 0);
    gl.uniform2f(this.dispU.camSize, Math.max(1, cam.w), Math.max(1, cam.h));
    gl.uniform2f(this.dispU.viewSize, viewW, viewH);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  private frame = (t: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden) return;
    const dt = this.lastT ? (t - this.lastT) / 1000 : 0.016;
    this.lastT = t;
    this.step(dt);
    this.drawDisplay();
    if (this.firstFrameCb) {
      const cb = this.firstFrameCb;
      this.firstFrameCb = null;
      cb();
    }
  };

  /** Fires once after the first visible frame is drawn. */
  onFirstFrame(cb: () => void) {
    this.firstFrameCb = cb;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastT = 0;
    this.applySplats([
      { x: 0.5, y: 0.46, force: 0.62, radius: 0.055 },
      { x: 0.4, y: 0.58, force: 0.28, radius: 0.04 },
    ]);
    this.raf = requestAnimationFrame(this.frame);
    if (this.firstFrameCb) {
      const cb = this.firstFrameCb;
      this.firstFrameCb = null;
      queueMicrotask(cb);
    }
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose() {
    this.stop();
    document.removeEventListener("visibilitychange", this.onVis);
    const gl = this.gl;
    gl.deleteProgram(this.simProg);
    gl.deleteProgram(this.splatProg);
    gl.deleteProgram(this.inkProg);
    gl.deleteProgram(this.displayProg);
    gl.deleteProgram(this.clearProg);
    this.deleteFBO(this.ping);
    this.deleteFBO(this.pong);
    this.deleteFBO(this.inkPing);
    this.deleteFBO(this.inkPong);
    if (this.camTex) gl.deleteTexture(this.camTex);
    gl.deleteBuffer(this.quad);
    gl.deleteVertexArray(this.vao);
    this.camSource = null;
  }
}
