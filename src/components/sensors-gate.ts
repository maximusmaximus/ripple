import type { SensorsState } from '../lib/ripple/media'

/** Tear down camera / mic tracks when leaving a session */
export function releaseSensors(sensors: SensorsState) {
  try {
    sensors.cameraStream?.getTracks().forEach((t) => t.stop())
  } catch {}
  try {
    sensors.micStream?.getTracks().forEach((t) => t.stop())
  } catch {}
}
