import { VERT, SIM_FRAG, SPLAT_FRAG, INK_SPLAT_FRAG, INK_FLOW_FRAG, DISPLAY_FRAG, CLEAR_FRAG } from "./shaders";
import type { ScreenAngle } from "./orientation";
import type { MicFrame } from "./media";
import { SILENT_MIC } from "./media";
import {
  program,
  hexToRgb,
  sampleStopsRgb,
  sampleStopsA,
  resampleRgb,
  mix01,
  type FBO,
  type SimU,
  type SplatU,
  type InkU,
  type DispU,
} from "./engine-utils";

export class RippleEngineBase {
  protected gl: WebGL2RenderingContext;
  protected canvas: HTMLCanvasElement;
  protected simW = 384;
  protected simH = 384;
  protected ping!: FBO;
  protected pong!: FBO;
  protected inkPing!: FBO;
  protected inkPong!: FBO;
  protected simProg!: WebGLProgram;
  protected splatProg!: WebGLProgram;
  protected inkProg!: WebGLProgram;
  protected inkFlowProg!: WebGLProgram;
  protected displayProg!: WebGLProgram;
  protected clearProg!: WebGLProgram;
  protected vao!: WebGLVertexArrayObject;
  protected quad!: WebGLBuffer;
  protected simU!: SimU;
  protected splatU!: SplatU;
  protected inkU!: InkU;
  protected inkFlowU!: {
    prev: WebGLUniformLocation | null;
    height: WebGLUniformLocation | null;
    texel: WebGLUniformLocation | null;
    gravity: WebGLUniformLocation | null;
    mic: WebGLUniformLocation | null;
    dt: WebGLUniformLocation | null;
  };
  protected dispU!: DispU;
  protected damping = 0.985;
  protected speed = 0.18;
  protected rangeStart = 0;
  protected rangeEnd = 1;
  protected colors: [number, number, number][] = [
    [0, 0, 0],
    [0.1, 0.1, 0.2],
    [0.2, 0.3, 0.5],
    [0.4, 0.6, 0.8],
    [0.7, 0.9, 1],
    [1, 1, 1],
  ];
  protected stopColors: [number, number, number][] = [
    [0, 0, 0],
    [0.1, 0.1, 0.2],
    [0.2, 0.3, 0.5],
    [0.4, 0.6, 0.8],
    [0.7, 0.9, 1],
    [1, 1, 1],
  ];
  protected stopT: number[] = [0, 0.2, 0.4, 0.6, 0.8, 1];
  protected stopA: number[] = [1, 1, 1, 1, 1, 1];
  protected running = false;
  protected raf = 0;
  protected lastT = 0;
  protected camTex: WebGLTexture | null = null;
  protected camSource: TexImageSource | null = null;
  protected camMix = 0;
  protected camInteract = 0.65;
  protected camAngle: ScreenAngle = 0;
  protected camMirror = false;
  protected camReady = false;
  protected mic: MicFrame = { ...SILENT_MIC };
  protected brushFx = 0;
  protected fxOpacity = 1;
  protected gx = 0;
  protected gy = 0;
  protected shadowOn = 0;
  protected shadowColor: [number, number, number] = [0.05, 0.04, 0.06];
  protected shadowAngle = 135;
  protected shadowOpacity = 0.45;
  protected shadowDist = 0.016;
  protected firstFrameCb: (() => void) | null = null;

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

  protected makeFBO(w: number, h: number): FBO {
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

  protected deleteFBO(f: FBO | undefined) {
    if (!f) return;
    this.gl.deleteTexture(f.tex);
    this.gl.deleteFramebuffer(f.fbo);
  }

  protected allocSim(cssW: number, cssH: number) {
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

  protected init() {
    const gl = this.gl;
    this.simProg = program(gl, VERT, SIM_FRAG);
    this.splatProg = program(gl, VERT, SPLAT_FRAG);
    this.inkProg = program(gl, VERT, INK_SPLAT_FRAG);
    this.inkFlowProg = program(gl, VERT, INK_FLOW_FRAG);
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
      t: gl.getUniformLocation(this.inkProg, "u_t"),
      colorA: gl.getUniformLocation(this.inkProg, "u_colorA"),
    };
    this.inkFlowU = {
      prev: gl.getUniformLocation(this.inkFlowProg, "u_prev"),
      height: gl.getUniformLocation(this.inkFlowProg, "u_height"),
      texel: gl.getUniformLocation(this.inkFlowProg, "u_texel"),
      gravity: gl.getUniformLocation(this.inkFlowProg, "u_gravity"),
      mic: gl.getUniformLocation(this.inkFlowProg, "u_mic"),
      dt: gl.getUniformLocation(this.inkFlowProg, "u_dt"),
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
      gravity: gl.getUniformLocation(this.displayProg, "u_gravity"),
      shadowOn: gl.getUniformLocation(this.displayProg, "u_shadowOn"),
      shadowColor: gl.getUniformLocation(this.displayProg, "u_shadowColor"),
      shadowAngle: gl.getUniformLocation(this.displayProg, "u_shadowAngle"),
      shadowOpacity: gl.getUniformLocation(this.displayProg, "u_shadowOpacity"),
      shadowDist: gl.getUniformLocation(this.displayProg, "u_shadowDist"),
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

  protected onVis = () => {
    if (!this.running) return;
    if (document.hidden) {
      cancelAnimationFrame(this.raf);
      this.lastT = 0;
    } else {
      this.lastT = 0;
      this.raf = requestAnimationFrame(this.frame as any);
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
    shadowOn?: boolean;
    shadowColor?: string;
    shadowAngle?: number;
    shadowOpacity?: number;
    shadowDist?: number;
  }) {
    if (opts.viscosity != null) this.damping = 0.996 - (1 - opts.viscosity) * 0.078;
    if (opts.waveStrength != null) this.speed = Math.max(0.05, Math.min(0.35, opts.waveStrength * 0.22));
    if (opts.stops && opts.stops.length >= 2) {
      const sorted = [...opts.stops].sort((a, b) => a.t - b.t).slice(0, 11);
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
    if (opts.shadowOn != null) this.shadowOn = opts.shadowOn ? 1 : 0;
    if (opts.shadowColor) this.shadowColor = hexToRgb(opts.shadowColor);
    if (opts.shadowAngle != null) this.shadowAngle = ((opts.shadowAngle % 360) + 360) % 360;
    if (opts.shadowOpacity != null) this.shadowOpacity = Math.max(0, Math.min(1, opts.shadowOpacity));
    if (opts.shadowDist != null) this.shadowDist = Math.max(0.002, Math.min(0.08, opts.shadowDist));
  }

  setGravity(x: number, y: number) {
    this.gx = Math.max(-0.14, Math.min(0.14, x));
    this.gy = Math.max(-0.14, Math.min(0.14, y));
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
    } else if (opts?.mix == null && this.camMix < 0.5) {
      this.camMix = 1;
    }
  }

  setCameraOrientation(angle: ScreenAngle) {
    this.camAngle = angle;
  }

  // Subclass implements clear, step, frame
  clear() {}
  protected step(_dt: number) {}
  protected frame = (_t: number) => {};
}
