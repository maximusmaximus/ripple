export type SensorsState = {
  cameraOn: boolean
  micOn: boolean
  facingMode: 'user' | 'environment'
  cameraStream: MediaStream | null
  micStream: MediaStream | null
  error: string | null
}

export const emptySensorsState: SensorsState = {
  cameraOn: false,
  micOn: false,
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
