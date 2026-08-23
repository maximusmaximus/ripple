import type { ScreenAngle } from "./orientation";

export type GyroMode = "off" | "on" | "horizontal" | "vertical";

export type SensorsState = {
  cameraOn: boolean;
  micOn: boolean;
  gyroOn: boolean;
  gyroMode: GyroMode;
  facingMode: "user" | "environment";
  cameraStream: MediaStream | null;
  micStream: MediaStream | null;
  error: string | null;
};

export const emptySensorsState: SensorsState = {
  cameraOn: false,
  micOn: false,
  gyroOn: false,
  gyroMode: "off",
  facingMode: "user",
  cameraStream: null,
  micStream: null,
  error: null,
};

export const GYRO_CYCLE: GyroMode[] = ["off", "on", "horizontal", "vertical"];

export function nextGyroMode(mode: GyroMode): GyroMode {
  const i = GYRO_CYCLE.indexOf(mode);
  return GYRO_CYCLE[(i + 1) % GYRO_CYCLE.length]!;
}

export function mediaErrorMessage(err: unknown): string {
  if (!err) return "Unknown media error";
  if (typeof err === "string") return err;
  const t = err as { name?: string; message?: string };
  if (t.name === "NotAllowedError" || t.name === "PermissionDeniedError") {
    return "Camera/mic permission denied — open in a new tab if blocked by the preview";
  }
  if (t.name === "NotFoundError") return "No camera or microphone found";
  if (t.name === "NotReadableError") return "Camera/mic is already in use";
  return t.message || t.name || "Media error";
}

export type MicFrame = {
  level: number;
  bass: number;
  mid: number;
  high: number;
};

export const EMPTY_MIC: MicFrame = { level: 0, bass: 0, mid: 0, high: 0 };

/** Average band energy (gamma-compressed). */
function bandEnergy(data: Uint8Array, from: number, to: number): number {
  const end = Math.min(to, data.length);
  const start = Math.min(from, end);
  if (end <= start) return 0;
  let sum = 0;
  for (let i = start; i < end; i++) sum += data[i]!;
  return Math.min(1, (sum / ((end - start) * 255)) ** 0.7);
}

/** High-band energy with peak emphasis so highs shift color visibly. */
function highBandEnergy(data: Uint8Array, from: number, to: number): number {
  const end = Math.min(to, data.length);
  const start = Math.min(from, end);
  if (end <= start) return 0;
  let sum = 0;
  let peak = 0;
  for (let i = start; i < end; i++) {
    const v = data[i]!;
    sum += v;
    if (v > peak) peak = v;
  }
  const avg = sum / ((end - start) * 255);
  const pk = peak / 255;
  return Math.min(1, avg ** 0.48 * 0.4 + pk ** 0.5 * 1.15);
}

/**
 * Mic monitor: RMS + spectrum bands with noise-floor tracking.
 * No sim energy injection — visual only via setMicPulse.
 */
export function createMicMonitor(stream: MediaStream): {
  read: () => MicFrame;
  stop: () => void;
} {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  void ctx.resume();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.42;
  src.connect(analyser);
  const time = new Uint8Array(analyser.fftSize);
  const freq = new Uint8Array(analyser.frequencyBinCount);
  let frames = 0;
  let floor = 0.03;

  return {
    read() {
      if (ctx.state === "suspended") void ctx.resume();
      analyser.getByteTimeDomainData(time);
      let sum = 0;
      for (let i = 0; i < time.length; i++) {
        const n = (time[i]! - 128) / 128;
        sum += n * n;
      }
      const rms = Math.sqrt(sum / time.length);
      analyser.getByteFrequencyData(freq);
      frames++;
      if (frames < 28) {
        floor = floor * 0.7 + rms * 0.3;
        return EMPTY_MIC;
      }
      floor = Math.min(rms, floor * 0.997 + rms * 0.003);
      const above = Math.max(0, rms - floor * 1.85);
      const level = Math.min(1, above * 2.15);
      const bass = bandEnergy(freq, 1, 16);
      const mid = bandEnergy(freq, 16, 48);
      const high = Math.min(1, Math.max(0, highBandEnergy(freq, 48, 280) * 1.85 - 0.05));
      return {
        level,
        bass: bass * level,
        mid: mid * level,
        high,
      };
    },
    stop() {
      try {
        src.disconnect();
      } catch {
        /* ignore */
      }
      void ctx.close();
    },
  };
}

/** Envelope follower — slower attack overall, snappier on highs. */
export function tickMicEnvelope(
  prev: MicFrame,
  next: MicFrame,
  sensitivity: number,
): MicFrame {
  const sens = Math.max(0, Math.min(1.5, sensitivity));
  if (sens <= 0.001) {
    return {
      level: prev.level * 0.82,
      bass: prev.bass * 0.82,
      mid: prev.mid * 0.82,
      high: prev.high * 0.82,
    };
  }
  const scale = sens * 0.72;
  const highScale = sens * 1.2;
  const step = (cur: number, target: number, attack: number, release: number, s: number) => {
    const t = target * s;
    return t > cur ? cur + (t - cur) * attack : cur * release;
  };
  return {
    level: step(prev.level, next.level, 0.16, 0.9, scale),
    bass: step(prev.bass, next.bass, 0.12, 0.92, scale),
    mid: step(prev.mid, next.mid, 0.14, 0.9, scale),
    high: step(prev.high, next.high, 0.45, 0.82, highScale),
  };
}

export function micFromRemote(
  level: number,
  bands?: [number, number, number] | null,
): MicFrame {
  const n = Math.max(0, Math.min(1.2, level));
  if (bands && bands.length >= 3) {
    return {
      level: n,
      bass: Math.max(0, Math.min(1.2, bands[0] ?? 0)),
      mid: Math.max(0, Math.min(1.2, bands[1] ?? 0)),
      high: Math.max(0, Math.min(1.2, bands[2] ?? 0)),
    };
  }
  return { level: n, bass: n * 0.4, mid: n * 0.35, high: n * 0.7 };
}

/** Map device tilt to sim gravity, respecting mode + sensitivity + viewport angle. */
export function tiltToGravity(
  beta: number,
  gamma: number,
  mode: GyroMode,
  sensitivity: number,
  viewAngle: ScreenAngle = 0,
): { gx: number; gy: number } {
  let b = beta;
  let g = gamma;
  if (mode === "horizontal") b = 0;
  if (mode === "vertical") g = 0;
  if (mode === "off") return { gx: 0, gy: 0 };

  // Re-map axes so "down" stays down after the canvas rotates.
  let x = g;
  let y = b;
  if (viewAngle === 90) {
    x = b;
    y = -g;
  } else if (viewAngle === 270) {
    x = -b;
    y = g;
  } else if (viewAngle === 180) {
    x = -g;
    y = -b;
  }

  const sens = Math.max(0, Math.min(1.5, sensitivity));
  // Higher sensitivity → smaller divisor → stronger response. Starts very sensitive.
  const div = Math.max(5.5, 26 - sens * 16);
  let nx = Math.max(-1, Math.min(1, y / div));
  let ny = Math.max(-1, Math.min(1, x / div));
  const dead = 0.025;
  if (Math.abs(nx) < dead) nx = 0;
  if (Math.abs(ny) < dead) ny = 0;
  const scale = 0.007 + sens * 0.016;
  return { gx: nx * scale, gy: ny * scale };
}
