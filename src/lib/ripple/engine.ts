import { VERT, SIM_FRAG, SPLAT_FRAG, DISPLAY_FRAG, CLEAR_FRAG } from './shaders'
import type { Splat } from './pointer'
import type { ScreenAngle } from './orientation'

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error(`Shader compile: ${log}`)
  }
  return sh
}

function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`Program link: ${gl.getProgramInfoLog(p)}`)
  }
  return p
}

function hexToRgb(hex: string): [number, number, number] {
  const s = hex.replace('#', '')
  const full = s.length === 3 ? s.split('').map((c) => c + c).join('') : s
  const n = parseInt(full, 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

type FBO = { tex: WebGLTexture; fbo: WebGLFramebuffer; w: number; h: number }

export class RippleEngine {
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private simW = 384
  private simH = 384
  private ping!: FBO
  private pong!: FBO
  private simProg!: WebGLProgram
  private splatProg!: WebGLProgram
  private displayProg!: WebGLProgram
  private clearProg!: WebGLProgram
  private vao!: WebGLVertexArrayObject
  private damping = 0.985
  private speed = 0.18
  private rangeStart = 0
  private rangeEnd = 1
  private colors: [number, number, number][] = [
    [0, 0, 0], [0.1, 0.1, 0.2], [0.2, 0.3, 0.5], [0.4, 0.6, 0.8], [0.7, 0.9, 1], [1, 1, 1],
  ]
  private running = false
  private raf = 0
  private lastT = 0
  private camTex: WebGLTexture | null = null
  private camVideo: HTMLVideoElement | null = null
  private camMix = 0
  private camAngle: ScreenAngle = 0
  private camMirror = false
  private camReady = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', {
      alpha: false, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: false,
    })
    if (!gl) throw new Error('WebGL2 required')
    this.gl = gl
    this.init()
  }

  private makeFBO(w: number, h: number): FBO {
    const gl = this.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    let internal: number = gl.RGBA16F
    let type: number = gl.HALF_FLOAT
    const ext = gl.getExtension('EXT_color_buffer_float')
    if (!ext) { internal = gl.RGBA; type = gl.UNSIGNED_BYTE }
    gl.texImage2D(gl.TEXTURE_2D, 0, internal, w, h, 0, gl.RGBA, type, null)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    const fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    return { tex, fbo, w, h }
  }

  private init() {
    const gl = this.gl
    this.simProg = program(gl, VERT, SIM_FRAG)
    this.splatProg = program(gl, VERT, SPLAT_FRAG)
    this.displayProg = program(gl, VERT, DISPLAY_FRAG)
    this.clearProg = program(gl, VERT, CLEAR_FRAG)
    this.ping = this.makeFBO(this.simW, this.simH)
    this.pong = this.makeFBO(this.simW, this.simH)
    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    this.vao = gl.createVertexArray()!
    gl.bindVertexArray(this.vao)
    for (const p of [this.simProg, this.splatProg, this.displayProg, this.clearProg]) {
      const loc = gl.getAttribLocation(p, 'a_pos')
      if (loc >= 0) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0) }
    }
    this.clear()
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.floor(this.canvas.clientWidth * dpr)
    const h = Math.floor(this.canvas.clientHeight * dpr)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  setParams(opts: {
    viscosity?: number; waveStrength?: number; colors?: string[]
    rangeStart?: number; rangeEnd?: number; cameraMix?: number
  }) {
    if (opts.viscosity != null) this.damping = 0.996 - (1 - opts.viscosity) * 0.078
    if (opts.waveStrength != null) this.speed = Math.max(0.05, Math.min(0.35, opts.waveStrength * 0.22))
    if (opts.colors) {
      const cols = opts.colors.slice(0, 6)
      while (cols.length < 6) cols.push(cols[cols.length - 1] ?? '#ffffff')
      this.colors = cols.map(hexToRgb)
    }
    if (opts.rangeStart != null) this.rangeStart = opts.rangeStart
    if (opts.rangeEnd != null) this.rangeEnd = opts.rangeEnd
    if (opts.cameraMix != null) this.camMix = Math.max(0, Math.min(1, opts.cameraMix))
  }

  setCamera(video: HTMLVideoElement | null, opts?: { angle?: ScreenAngle; mirror?: boolean; mix?: number }) {
    this.camVideo = video
    if (opts?.angle != null) this.camAngle = opts.angle
    if (opts?.mirror != null) this.camMirror = opts.mirror
    if (opts?.mix != null) this.camMix = Math.max(0, Math.min(1, opts.mix))
    if (!video) { this.camReady = false; this.camMix = 0 }
  }

  setCameraOrientation(angle: ScreenAngle) { this.camAngle = angle }

  applySplats(splats: Splat[]) {
    if (!splats.length) return
    const gl = this.gl
    gl.useProgram(this.splatProg)
    gl.bindVertexArray(this.vao)
    gl.viewport(0, 0, this.simW, this.simH)
    const uPrev = gl.getUniformLocation(this.splatProg, 'u_prev')
    const uPoint = gl.getUniformLocation(this.splatProg, 'u_point')
    const uForce = gl.getUniformLocation(this.splatProg, 'u_force')
    const uRadius = gl.getUniformLocation(this.splatProg, 'u_radius')
    for (const s of splats) {
      const ux = s.x
      const uy = 1 - s.y
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pong.fbo)
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, this.ping.tex)
      gl.uniform1i(uPrev, 0)
      gl.uniform2f(uPoint, ux, uy)
      gl.uniform1f(uForce, s.force)
      gl.uniform1f(uRadius, Math.max(0.004, s.radius))
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      const tmp = this.ping; this.ping = this.pong; this.pong = tmp
    }
  }

  clear() {
    const gl = this.gl
    gl.useProgram(this.clearProg)
    gl.bindVertexArray(this.vao)
    gl.viewport(0, 0, this.simW, this.simH)
    for (const f of [this.ping, this.pong]) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f.fbo)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  private step(dt: number) {
    const gl = this.gl
    gl.useProgram(this.simProg)
    gl.bindVertexArray(this.vao)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pong.fbo)
    gl.viewport(0, 0, this.simW, this.simH)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.ping.tex)
    gl.uniform1i(gl.getUniformLocation(this.simProg, 'u_prev'), 0)
    gl.uniform2f(gl.getUniformLocation(this.simProg, 'u_texel'), 1 / this.simW, 1 / this.simH)
    gl.uniform1f(gl.getUniformLocation(this.simProg, 'u_damping'), this.damping)
    gl.uniform1f(gl.getUniformLocation(this.simProg, 'u_speed'), this.speed)
    gl.uniform1f(gl.getUniformLocation(this.simProg, 'u_dt'), Math.min(dt, 0.033))
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    const tmp = this.ping; this.ping = this.pong; this.pong = tmp
  }

  private uploadCam() {
    const gl = this.gl
    const video = this.camVideo
    if (!video || !video.videoWidth || video.readyState < 2) return
    if (!this.camTex) {
      this.camTex = gl.createTexture()!
      gl.bindTexture(gl.TEXTURE_2D, this.camTex)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1)
    }
    gl.bindTexture(gl.TEXTURE_2D, this.camTex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    this.camReady = true
  }

  private drawDisplay() {
    const gl = this.gl
    this.resize()
    if (this.camVideo) this.uploadCam()
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    gl.useProgram(this.displayProg)
    gl.bindVertexArray(this.vao)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.ping.tex)
    gl.uniform1i(gl.getUniformLocation(this.displayProg, 'u_height'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.camReady && this.camTex ? this.camTex : this.ping.tex)
    gl.uniform1i(gl.getUniformLocation(this.displayProg, 'u_cam'), 1)
    gl.uniform2f(gl.getUniformLocation(this.displayProg, 'u_texel'), 1 / this.simW, 1 / this.simH)
    for (let i = 0; i < 6; i++) {
      const c = this.colors[i] ?? [1, 1, 1]
      gl.uniform3f(gl.getUniformLocation(this.displayProg, `u_c${i}`), c[0], c[1], c[2])
    }
    gl.uniform1f(gl.getUniformLocation(this.displayProg, 'u_rangeStart'), this.rangeStart)
    gl.uniform1f(gl.getUniformLocation(this.displayProg, 'u_rangeEnd'), this.rangeEnd)
    gl.uniform1f(gl.getUniformLocation(this.displayProg, 'u_time'), this.lastT / 1000)
    gl.uniform1f(gl.getUniformLocation(this.displayProg, 'u_camMix'), this.camReady ? this.camMix : 0)
    gl.uniform1f(gl.getUniformLocation(this.displayProg, 'u_camAngle'), this.camAngle)
    gl.uniform1f(gl.getUniformLocation(this.displayProg, 'u_camMirror'), this.camMirror ? 1 : 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  private frame = (t: number) => {
    if (!this.running) return
    const dt = this.lastT ? (t - this.lastT) / 1000 : 0.016
    this.lastT = t
    this.step(dt)
    this.drawDisplay()
    this.raf = requestAnimationFrame(this.frame)
  }

  start() {
    if (this.running) return
    this.running = true
    this.lastT = 0
    this.raf = requestAnimationFrame(this.frame)
  }

  stop() {
    this.running = false
    cancelAnimationFrame(this.raf)
  }

  dispose() {
    this.stop()
    const gl = this.gl
    gl.deleteProgram(this.simProg)
    gl.deleteProgram(this.splatProg)
    gl.deleteProgram(this.displayProg)
    gl.deleteProgram(this.clearProg)
    gl.deleteTexture(this.ping.tex)
    gl.deleteTexture(this.pong.tex)
    gl.deleteFramebuffer(this.ping.fbo)
    gl.deleteFramebuffer(this.pong.fbo)
    if (this.camTex) gl.deleteTexture(this.camTex)
    gl.deleteVertexArray(this.vao)
    this.camVideo = null
  }
}
