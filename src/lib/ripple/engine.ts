import { VERT, SIM_FRAG, SPLAT_FRAG, DISPLAY_FRAG, CLEAR_FRAG } from './shaders'
import type { Splat } from './pointer'
import type { ScreenAngle } from './orientation'

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s)
    gl.deleteShader(s)
    throw new Error(`Shader compile: ${log}`)
  }
  return s
}

function link(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader) {
  const p = gl.createProgram()!
  gl.attachShader(p, vs)
  gl.attachShader(p, fs)
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p)
    gl.deleteProgram(p)
    throw new Error(`Program link: ${log}`)
  }
  return p
}

function createFBO(
  gl: WebGL2RenderingContext,
  w: number,
  h: number,
  internalFormat: number,
  format: number,
  type: number,
) {
  const tex = gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, w, h, 0, format, type, null)
  const fbo = gl.createFramebuffer()!
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  return { tex, fbo, w, h }
}

type FBO = ReturnType<typeof createFBO>

export class RippleEngine {
  gl: WebGL2RenderingContext
  canvas: HTMLCanvasElement
  simW: number
  simH: number
  programs: {
    sim: WebGLProgram
    splat: WebGLProgram
    display: WebGLProgram
    clear: WebGLProgram
  }
  heightA: FBO
  heightB: FBO
  camTex: WebGLTexture | null = null
  camW = 0
  camH = 0
  cameraFacing: 'user' | 'environment' = 'user'
  cameraAngle: ScreenAngle = 0
  paletteIndex = 0
  cameraMix = 0.35
  micDrive = 0
  time = 0
  lastT = 0
  running = false
  raf = 0

  constructor(canvas: HTMLCanvasElement, simSize = 384) {
    this.canvas = canvas
    const gl = canvas.getContext('webgl2', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    })
    if (!gl) throw new Error('WebGL2 required')
    this.gl = gl

    // Prefer half-float for height field; fall back to 8-bit
    const ext = gl.getExtension('EXT_color_buffer_float')
    let internal: number, format: number, type: number
    if (ext) {
      internal = gl.RGBA16F
      format = gl.RGBA
      type = gl.HALF_FLOAT
    } else {
      internal = gl.RGBA
      format = gl.RGBA
      type = gl.UNSIGNED_BYTE
    }

    this.simW = simSize
    this.simH = simSize

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    this.programs = {
      sim: link(gl, vs, compile(gl, gl.FRAGMENT_SHADER, SIM_FRAG)),
      splat: link(gl, vs, compile(gl, gl.FRAGMENT_SHADER, SPLAT_FRAG)),
      display: link(gl, vs, compile(gl, gl.FRAGMENT_SHADER, DISPLAY_FRAG)),
      clear: link(gl, vs, compile(gl, gl.FRAGMENT_SHADER, CLEAR_FRAG)),
    }

    this.heightA = createFBO(gl, this.simW, this.simH, internal, format, type)
    this.heightB = createFBO(gl, this.simW, this.simH, internal, format, type)

    // Fullscreen quad
    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    for (const p of Object.values(this.programs)) {
      const loc = gl.getAttribLocation(p, 'a_pos')
      if (loc >= 0) {
        gl.enableVertexAttribArray(loc)
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
      }
    }

    this.clear()
  }

  resizeDisplay() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = Math.floor(this.canvas.clientWidth * dpr)
    const h = Math.floor(this.canvas.clientHeight * dpr)
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w
      this.canvas.height = h
    }
  }

  setPalette(index: number, cameraMix = 0.35) {
    this.paletteIndex = index
    this.cameraMix = cameraMix
  }

  setMicDrive(v: number) {
    this.micDrive = Math.max(0, Math.min(1, v))
  }

  setCameraOrientation(angle: ScreenAngle, facing: 'user' | 'environment') {
    this.cameraAngle = angle
    this.cameraFacing = facing
  }

  uploadCamera(video: HTMLVideoElement) {
    const gl = this.gl
    if (!video.videoWidth || video.readyState < 2) return
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
    if (this.camW !== video.videoWidth || this.camH !== video.videoHeight) {
      this.camW = video.videoWidth
      this.camH = video.videoHeight
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video)
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, video)
    }
  }

  clear() {
    const gl = this.gl
    gl.useProgram(this.programs.clear)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.heightA.fbo)
    gl.viewport(0, 0, this.simW, this.simH)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.heightB.fbo)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  splat(s: Splat) {
    const gl = this.gl
    const prog = this.programs.splat
    gl.useProgram(prog)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.heightA.fbo)
    gl.viewport(0, 0, this.simW, this.simH)
    gl.uniform2f(gl.getUniformLocation(prog, 'u_point'), s.x, s.y)
    gl.uniform1f(gl.getUniformLocation(prog, 'u_radius'), s.radius)
    gl.uniform1f(gl.getUniformLocation(prog, 'u_strength'), s.strength)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.heightB.tex)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_prev'), 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    // swap
    const tmp = this.heightA
    this.heightA = this.heightB
    this.heightB = tmp
  }

  step(dt: number) {
    const gl = this.gl
    const prog = this.programs.sim
    gl.useProgram(prog)
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.heightA.fbo)
    gl.viewport(0, 0, this.simW, this.simH)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.heightB.tex)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_prev'), 0)
    gl.uniform1f(gl.getUniformLocation(prog, 'u_dt'), Math.min(dt, 0.033))
    gl.uniform1f(gl.getUniformLocation(prog, 'u_damping'), 0.995)
    gl.uniform2f(gl.getUniformLocation(prog, 'u_texel'), 1 / this.simW, 1 / this.simH)
    gl.uniform1f(gl.getUniformLocation(prog, 'u_mic'), this.micDrive)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    const tmp = this.heightA
    this.heightA = this.heightB
    this.heightB = tmp
  }

  drawDisplay() {
    const gl = this.gl
    this.resizeDisplay()
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, this.canvas.width, this.canvas.height)
    const prog = this.programs.display
    gl.useProgram(prog)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.heightB.tex)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_height'), 0)
    gl.activeTexture(gl.TEXTURE1)
    if (this.camTex) {
      gl.bindTexture(gl.TEXTURE_2D, this.camTex)
    } else {
      gl.bindTexture(gl.TEXTURE_2D, this.heightB.tex)
    }
    gl.uniform1i(gl.getUniformLocation(prog, 'u_camera'), 1)
    gl.uniform1f(gl.getUniformLocation(prog, 'u_cameraMix'), this.camTex ? this.cameraMix : 0)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_palette'), this.paletteIndex)
    gl.uniform1f(gl.getUniformLocation(prog, 'u_time'), this.time)
    gl.uniform1f(gl.getUniformLocation(prog, 'u_aspect'), this.canvas.width / Math.max(1, this.canvas.height))
    // orientation: same direction as device tilt
    const angle = this.cameraAngle
    gl.uniform1f(gl.getUniformLocation(prog, 'u_camAngle'), angle)
    gl.uniform1i(gl.getUniformLocation(prog, 'u_camFacing'), this.cameraFacing === 'user' ? 1 : 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  frame = (t: number) => {
    if (!this.running) return
    const dt = this.lastT ? (t - this.lastT) / 1000 : 0.016
    this.lastT = t
    this.time += dt
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
    for (const p of Object.values(this.programs)) gl.deleteProgram(p)
    gl.deleteTexture(this.heightA.tex)
    gl.deleteTexture(this.heightB.tex)
    gl.deleteFramebuffer(this.heightA.fbo)
    gl.deleteFramebuffer(this.heightB.fbo)
    if (this.camTex) gl.deleteTexture(this.camTex)
  }
}
