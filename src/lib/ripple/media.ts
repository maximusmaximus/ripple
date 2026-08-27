export type GyroMode = 'off' | 'on' | 'horizontal' | 'vertical'

export const GYRO_CYCLE: GyroMode[] = ['off', 'on', 'horizontal', 'vertical']

export function nextGyroMode(mode: GyroMode): GyroMode {
  const i = GYRO_CYCLE.indexOf(mode)
  return GYRO_CYCLE[(i + 1) % GYRO_CYCLE.length]!
}

export type SensorsState = {
  cameraOn: boolean
  micOn: boolean
  gyroOn: boolean
  gyroMode: GyroMode
  facingMode: 'user' | 'environment'
  cameraStream: MediaStream | null
  micStream: MediaStream | null
  error: string | null
}

export const emptySensorsState: SensorsState = {
  cameraOn: false,
  micOn: false,
  gyroOn: false,
  gyroMode: 'off',
  facingMode: 'user',
  cameraStream: null,
  micStream: null,
  error: null,
}

export function mediaErrorMessage(err: unknown): string {
  if (!err) return 'Unknown media error'
  if (typeof err === 'string') return err
  const e = err as { name?: string; message?: string }
  if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
    return 'Camera/mic permission denied — open in a new tab if blocked by the preview'
  }
  if (e.name === 'NotFoundError') return 'No camera or microphone found'
  if (e.name === 'NotReadableError') return 'Camera/mic is already in use'
  return e.message || e.name || 'Media error'
}

export type MicFrame = {
  /** Loudness 0–1 after noise floor. */
  level: number
  /** ~20–250 Hz */
  bass: number
  /** ~250–2 kHz */
  mid: number
  /** ~2 kHz+ */
  high: number
}

export const SILENT_MIC: MicFrame = { level: 0, bass: 0, mid: 0, high: 0 }

function bandAvg(freq: Uint8Array, a: number, b: number): number {
  const end = Math.min(b, freq.length)
  const start = Math.min(a, end)
  if (end <= start) return 0
  let s = 0
  for (let i = start; i < end; i++) s += freq[i]!
  return Math.min(1, Math.pow(s / ((end - start) * 255), 0.7))
}

/** Peak-weighted band so sibilance, claps, and treble still register. */
function bandPresence(freq: Uint8Array, a: number, b: number): number {
  const end = Math.min(b, freq.length)
  const start = Math.min(a, end)
  if (end <= start) return 0
  let s = 0
  let peak = 0
  for (let i = start; i < end; i++) {
    const v = freq[i]!
    s += v
    if (v > peak) peak = v
  }
  const avg = s / ((end - start) * 255)
  const pk = peak / 255
  return Math.min(1, Math.pow(avg, 0.48) * 0.4 + Math.pow(pk, 0.5) * 1.15)
}

/** Live loudness + spectral bands. Ignores the unmute spike and rides a noise floor. */
export function createMicMonitor(stream: MediaStream): {
  read: () => MicFrame
  stop: () => void
} {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  void ctx.resume()
  const src = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  analyser.smoothingTimeConstant = 0.42
  src.connect(analyser)
  const time = new Uint8Array(analyser.fftSize)
  const freq = new Uint8Array(analyser.frequencyBinCount)
  let frames = 0
  let floor = 0.03

  return {
    read() {
      if (ctx.state === 'suspended') void ctx.resume()
      analyser.getByteTimeDomainData(time)
      let sum = 0
      for (let i = 0; i < time.length; i++) {
        const d = (time[i]! - 128) / 128
        sum += d * d
      }
      const rms = Math.sqrt(sum / time.length)
      analyser.getByteFrequencyData(freq)

      frames++
      if (frames < 28) {
        floor = floor * 0.7 + rms * 0.3
        return SILENT_MIC
      }
      floor = Math.min(rms, floor * 0.997 + rms * 0.003)
      const gated = Math.max(0, rms - floor * 1.85)
      const level = Math.min(1, gated * 2.15)

      const bass = bandAvg(freq, 1, 16)
      const mid = bandAvg(freq, 16, 48)
      // ~1 kHz–6 kHz: speech presence, cymbals, sibilance — boosted, not crushed by bass
      const high = Math.min(1, Math.max(0, bandPresence(freq, 48, 280) * 1.85 - 0.05))
      return {
        level,
        bass: bass * level,
        mid: mid * level,
        high,
      }
    },
    stop() {
      try {
        src.disconnect()
      } catch {
        /* already torn down */
      }
      void ctx.close()
    },
  }
}

export function micFromRemote(level: number, bands?: number[] | null): MicFrame {
  const lv = Math.max(0, Math.min(1.2, level))
  if (bands && bands.length >= 3) {
    return {
      level: lv,
      bass: Math.max(0, Math.min(1.2, bands[0] ?? 0)),
      mid: Math.max(0, Math.min(1.2, bands[1] ?? 0)),
      high: Math.max(0, Math.min(1.2, bands[2] ?? 0)),
    }
  }
  return { level: lv, bass: lv * 0.4, mid: lv * 0.35, high: lv * 0.7 }
}

/** Slow attack so unmute / noise doesn't slam the surface. Sensitivity scales the result. */
export function tickMicEnvelope(env: MicFrame, raw: MicFrame, sensitivity: number): MicFrame {
  const sens = Math.max(0, Math.min(1.5, sensitivity))
  if (sens <= 0.001) {
    return {
      level: env.level * 0.82,
      bass: env.bass * 0.82,
      mid: env.mid * 0.82,
      high: env.high * 0.82,
    }
  }
  const scale = sens * 0.72
  const highScale = sens * 1.2
  const follow = (prev: number, next: number, attack: number, release: number, mul: number) => {
    const target = next * mul
    if (target > prev) return prev + (target - prev) * attack
    return prev * release
  }
  return {
    level: follow(env.level, raw.level, 0.16, 0.9, scale),
    bass: follow(env.bass, raw.bass, 0.12, 0.92, scale),
    mid: follow(env.mid, raw.mid, 0.14, 0.9, scale),
    high: follow(env.high, raw.high, 0.45, 0.82, highScale),
  }
}

export type CamFacing = "user" | "environment";

export function cameraDeviceId(stream: MediaStream | null): string | undefined {
  return stream?.getVideoTracks()[0]?.getSettings().deviceId;
}

export function readCameraFacing(stream: MediaStream | null): CamFacing {
  const track = stream?.getVideoTracks()[0];
  if (!track) return "user";
  const mode = track.getSettings().facingMode;
  if (mode === "environment" || mode === "user") return mode;
  const label = `${track.label} ${track.getSettings().deviceId ?? ""}`.toLowerCase();
  if (/back|rear|environment|world|ultra.?wide/.test(label)) return "environment";
  return "user";
}

export async function stopMediaStream(stream: MediaStream | null) {
  if (!stream) return;
  for (const t of stream.getTracks()) {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  }
  await new Promise((r) => window.setTimeout(r, 140));
}

async function videoInputs(): Promise<MediaDeviceInfo[]> {
  if (!navigator.mediaDevices?.enumerateDevices) return [];
  try {
    const all = await navigator.mediaDevices.enumerateDevices();
    return all.filter((d) => d.kind === "videoinput");
  } catch {
    return [];
  }
}

function facingFromLabel(label: string): CamFacing | null {
  const l = label.toLowerCase();
  if (/back|rear|environment|world|ultra.?wide/.test(l)) return "environment";
  if (/front|user|face|facetime|selfie/.test(l)) return "user";
  return null;
}

async function openWith(constraints: MediaTrackConstraints): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({ video: constraints, audio: false });
}

export async function openCamera(
  want: CamFacing,
  opts: { excludeDeviceId?: string } = {},
): Promise<{ stream: MediaStream; facing: CamFacing }> {
  const exclude = opts.excludeDeviceId;

  const attempts: MediaTrackConstraints[] = [
    { facingMode: { exact: want } },
    { facingMode: { ideal: want } },
    { facingMode: want },
  ];

  for (const video of attempts) {
    try {
      const stream = await openWith(video);
      const id = cameraDeviceId(stream);
      if (exclude && id && id === exclude) {
        await stopMediaStream(stream);
        continue;
      }
      const facing = readCameraFacing(stream);
      if (facing === want) return { stream, facing };
      await stopMediaStream(stream);
    } catch {
      /* try next */
    }
  }

  const devices = await videoInputs();
  const ranked = devices.filter((d) => d.deviceId && d.deviceId !== exclude);
  const named = ranked.find((d) => facingFromLabel(d.label) === want);
  const pick = named ?? (want === "user" ? ranked[0] : ranked[ranked.length - 1]);
  if (pick?.deviceId) {
    const stream = await openWith({ deviceId: { exact: pick.deviceId } });
    return { stream, facing: readCameraFacing(stream) };
  }

  const stream = await openWith({ facingMode: { ideal: want } });
  return { stream, facing: readCameraFacing(stream) };
}

export async function countVideoCameras(): Promise<number> {
  const list = await videoInputs();
  return list.length;
}
