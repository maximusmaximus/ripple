import type { Splat } from "./pointer";
import { resolveCameraAngle } from "./orientation";
import { sampleStopsA, mix01, isVideo, sourceSize } from "./engine-utils";
import { RippleEngineBase } from "./engine-base";

export class RippleEngine extends RippleEngineBase {
  applySplats(splats: Splat[]) {
    if (!splats.length) return;
    const gl = this.gl;
    gl.useProgram(this.splatProg);
    gl.bindVertexArray(this.vao);
    gl.viewport(0, 0, this.simW, this.simH);
    for (const s of splats) {
      const ux = s.x;
      const uy = 1 - s.y;
      const useStamp = Boolean(s.stamp);
      const ang = s.angle ?? 0;
      const width = s.width ?? 1;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.pong.fbo);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.ping.tex);
      gl.uniform1i(this.splatU.prev, 0);
      gl.uniform2f(this.splatU.point, ux, uy);
      gl.uniform1f(this.splatU.force, s.force);
      gl.uniform1f(this.splatU.radius, Math.max(0.004, s.radius));
      this.bindStamp(this.splatU.stamp, this.splatU.useStamp, this.splatU.angle, this.splatU.aspect, useStamp, ang, this.splatU.width, width);
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
      gl.uniform1f(this.inkU.t, this.strokeT(s.force));
      gl.uniform1f(this.inkU.colorA, this.strokeAlpha(s.force));
      this.bindStamp(this.inkU.stamp, this.inkU.useStamp, this.inkU.angle, this.inkU.aspect, useStamp, ang, this.inkU.width, width);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      const inkTmp = this.inkPing;
      this.inkPing = this.inkPong;
      this.inkPong = inkTmp;
      gl.useProgram(this.splatProg);
    }
  }

  private strokeT(force: number): number {
    return mix01(this.rangeStart, this.rangeEnd, Math.max(0, Math.min(1, Math.abs(force))));
  }

  private strokeAlpha(force: number): number {
    const t = this.strokeT(force);
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

  protected step(dt: number) {
    const gl = this.gl;
    const clampedDt = Math.min(dt, 0.033);
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
    gl.uniform1f(this.simU.dt, clampedDt);
    gl.uniform2f(this.simU.gravity, this.gx, this.gy);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const tmp = this.ping;
    this.ping = this.pong;
    this.pong = tmp;

    gl.useProgram(this.inkFlowProg);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.inkPong.fbo);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.inkPing.tex);
    gl.uniform1i(this.inkFlowU.prev, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.ping.tex);
    gl.uniform1i(this.inkFlowU.height, 1);
    gl.uniform2f(this.inkFlowU.texel, 1 / this.simW, 1 / this.simH);
    gl.uniform2f(this.inkFlowU.gravity, this.gx, this.gy);
    gl.uniform1f(this.inkFlowU.mic, this.mic.level);
    gl.uniform1f(this.inkFlowU.dt, clampedDt);
    gl.uniform1i(this.inkFlowU.texId, this.texId);
    gl.uniform1f(this.inkFlowU.time, this.lastT / 1000);
    this.bindCustomMap(
      2,
      this.inkFlowU.texMap,
      this.inkFlowU.texHasMap,
      this.inkFlowU.texFit,
      this.inkFlowU.texSize,
      this.inkFlowU.viewSize,
      this.inkFlowU.texLevels,
      this.inkFlowU.texInvert,
    );
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const inkTmp = this.inkPing;
    this.inkPing = this.inkPong;
    this.inkPong = inkTmp;
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

  private uploadCustom() {
    const gl = this.gl;
    const src = this.customSource;
    if (!src) return;
    if (isVideo(src) && (!src.videoWidth || src.readyState < 2)) return;
    if (!this.customTex) {
      this.customTex = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, this.customTex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    }
    gl.bindTexture(gl.TEXTURE_2D, this.customTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    const sz = sourceSize(src);
    if (sz.w > 0 && sz.h > 0) this.customSize = [sz.w, sz.h];
    this.customReady = true;
  }

  private bindCustomMap(
    unit: number,
    map: WebGLUniformLocation | null,
    has: WebGLUniformLocation | null,
    fit: WebGLUniformLocation | null,
    size: WebGLUniformLocation | null,
    view: WebGLUniformLocation | null,
    levels: WebGLUniformLocation | null,
    invert: WebGLUniformLocation | null,
  ) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, this.customReady && this.customTex ? this.customTex : this.ping.tex);
    gl.uniform1i(map, unit);
    gl.uniform1f(has, this.customReady && this.texId === 12 ? 1 : 0);
    gl.uniform1f(fit, this.texFit);
    gl.uniform2f(size, this.customSize[0], this.customSize[1]);
    const viewW = Math.max(1, this.canvas.clientWidth || this.canvas.width);
    const viewH = Math.max(1, this.canvas.clientHeight || this.canvas.height);
    gl.uniform2f(view, viewW, viewH);
    gl.uniform1f(levels, this.texLevels);
    gl.uniform1f(invert, this.texInvert);
  }

  private drawDisplay() {
    const gl = this.gl;
    this.resize();
    if (this.camSource) this.uploadCam();
    if (this.customSource) this.uploadCustom();
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
    gl.uniform1i(this.dispU.fxLayers, this.fxLayers);
    gl.uniform2f(this.dispU.gravity, this.gx, this.gy);
    gl.uniform1f(this.dispU.shadowOn, this.shadowOn);
    gl.uniform3f(this.dispU.shadowColor, this.shadowColor[0], this.shadowColor[1], this.shadowColor[2]);
    gl.uniform1f(this.dispU.shadowAngle, this.shadowAngle);
    gl.uniform1f(this.dispU.shadowOpacity, this.shadowOpacity);
    gl.uniform1f(this.dispU.shadowDist, this.shadowDist);
    gl.uniform1i(this.dispU.texId, this.texId);
    this.bindCustomMap(
      3,
      this.dispU.texMap,
      this.dispU.texHasMap,
      this.dispU.texFit,
      this.dispU.texSize,
      this.dispU.viewSize,
      this.dispU.texLevels,
      this.dispU.texInvert,
    );
    const viewW = Math.max(1, this.canvas.clientWidth || this.canvas.width);
    const viewH = Math.max(1, this.canvas.clientHeight || this.canvas.height);
    const cam = sourceSize(this.camSource);
    const camAngle = resolveCameraAngle(cam.w, cam.h, viewW, viewH, this.camAngle);
    gl.uniform1f(this.dispU.camAngle, camAngle);
    gl.uniform1f(this.dispU.camMirror, this.camMirror ? 1 : 0);
    gl.uniform2f(this.dispU.camSize, Math.max(1, cam.w), Math.max(1, cam.h));
    gl.uniform2f(this.dispU.viewSize, viewW, viewH);
    gl.uniform1f(this.dispU.viewZoom, this.viewZoom);
    gl.uniform1f(this.dispU.micZoom, this.micZoom);
    gl.uniform1f(this.dispU.gyroZoom, this.gyroZoom);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  protected frame = (t: number) => {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    if (document.hidden) return;
    const dt = this.lastT ? (t - this.lastT) / 1000 : 0.016;
    this.lastT = t;
    this.tickZoomEnv();
    this.step(dt);
    this.drawDisplay();
    if (this.firstFrameCb) {
      const cb = this.firstFrameCb;
      this.firstFrameCb = null;
      cb();
    }
  };

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
    gl.deleteProgram(this.inkFlowProg);
    gl.deleteProgram(this.displayProg);
    gl.deleteProgram(this.clearProg);
    this.deleteFBO(this.ping);
    this.deleteFBO(this.pong);
    this.deleteFBO(this.inkPing);
    this.deleteFBO(this.inkPong);
    if (this.camTex) gl.deleteTexture(this.camTex);
    if (this.customTex) gl.deleteTexture(this.customTex);
    if (this.stampTex) gl.deleteTexture(this.stampTex);
    if (this.stampDummy) gl.deleteTexture(this.stampDummy);
    gl.deleteBuffer(this.quad);
    gl.deleteVertexArray(this.vao);
    this.camSource = null;
  }
}
