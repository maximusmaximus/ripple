import type { SensorsState } from '../lib/ripple/media'

export function releaseSensors(sensors: SensorsState) {
  sensors.cameraStream?.getTracks().forEach((t) => t.stop())
  sensors.micStream?.getTracks().forEach((t) => t.stop())
}
