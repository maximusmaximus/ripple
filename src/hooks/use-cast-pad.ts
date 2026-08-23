/**
 * Phone pad — streams camera JPEG + pointer/gyro/mic to wall host.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  encodeCamFrame,
  parseCastMsg,
  roomIdFor,
  type CastMsg,
} from '../lib/ripple/cast'
import { makePeerId, postSignal, subscribeSignal, type SignalMsg } from '../lib/multiplayer/signaling'

export type PadConnectionState = 'idle' | 'connecting' | 'connected' | 'error'

export type UseCastPadOptions = {
  code: string
  frameWidth?: number
  frameHeight?: number
  jpegQuality?: number
  fps?: number
  iceServers?: RTCIceServer[]
}

export function useCastPad(opts: UseCastPadOptions) {
  const { code, frameWidth = 176, frameHeight = 132, jpegQuality = 0.38, fps = 12, iceServers } = opts
  const [state, setState] = useState<PadConnectionState>('idle')
  const [error, setError] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const peerIdRef = useRef(makePeerId())
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const rafRef = useRef(0)
  const lastFrameAt = useRef(0)
  const hostPeerRef = useRef<string | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)

  const sendJson = useCallback((msg: CastMsg) => {
    const dc = dcRef.current
    if (dc?.readyState === 'open') {
      try { dc.send(JSON.stringify(msg)) } catch {}
    }
  }, [])

  const stopMedia = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const cleanup = useCallback(() => {
    stopMedia()
    try { dcRef.current?.close() } catch {}
    try { pcRef.current?.close() } catch {}
    dcRef.current = null
    pcRef.current = null
    hostPeerRef.current = null
  }, [stopMedia])

  const startCameraLoop = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: frameWidth }, height: { ideal: frameHeight }, facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      const video = document.createElement('video')
      video.playsInline = true
      video.muted = true
      video.srcObject = stream
      await video.play()
      videoRef.current = video
      const canvas = document.createElement('canvas')
      canvas.width = frameWidth
      canvas.height = frameHeight
      const ctx = canvas.getContext('2d')!
      const interval = 1000 / fps
      const tick = () => {
        rafRef.current = requestAnimationFrame(tick)
        const now = performance.now()
        if (now - lastFrameAt.current < interval) return
        lastFrameAt.current = now
        if (!dcRef.current || dcRef.current.readyState !== 'open') return
        ctx.drawImage(video, 0, 0, frameWidth, frameHeight)
        canvas.toBlob(
          async (blob) => {
            if (!blob || !dcRef.current || dcRef.current.readyState !== 'open') return
            const buf = await blob.arrayBuffer()
            try { dcRef.current.send(encodeCamFrame(buf)) } catch {}
          },
          'image/jpeg',
          jpegQuality,
        )
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      setError(String(err))
      setState('error')
    }
  }, [frameHeight, frameWidth, fps, jpegQuality])

  const connect = useCallback(async () => {
    setState('connecting')
    setError(null)
    cleanup()
    const room = roomIdFor(code)
    const peerId = peerIdRef.current
    const pc = new RTCPeerConnection({ iceServers: iceServers ?? [] })
    pcRef.current = pc
    const dc = pc.createDataChannel('ripple-cast', { ordered: true })
    dc.binaryType = 'arraybuffer'
    dcRef.current = dc
    dc.onopen = () => {
      setState('connected')
      startCameraLoop()
    }
    dc.onclose = () => { cleanup(); setState('idle') }
    dc.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        const msg = parseCastMsg(ev.data)
        if (msg?.t === 'bye') { cleanup(); setState('idle') }
      }
    }
    pc.onicecandidate = (e) => {
      if (!e.candidate || !hostPeerRef.current) return
      postSignal({
        room, from: peerId, to: hostPeerRef.current,
        type: 'candidate', candidate: e.candidate.toJSON(),
      })
    }
    unsubRef.current?.()
    unsubRef.current = subscribeSignal(room, peerId, async (msg: SignalMsg) => {
      if (msg.type === 'hello' && !hostPeerRef.current) {
        hostPeerRef.current = msg.from
        try {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          postSignal({ room, from: peerId, to: msg.from, type: 'offer', sdp: pc.localDescription!.toJSON() })
        } catch (err) {
          setError(String(err))
          setState('error')
        }
      } else if (msg.type === 'answer' && msg.sdp) {
        try { await pc.setRemoteDescription(msg.sdp) } catch {}
      } else if (msg.type === 'candidate' && msg.candidate) {
        try { await pc.addIceCandidate(msg.candidate) } catch {}
      } else if (msg.type === 'leave') {
        cleanup()
        setState('idle')
      }
    })
    postSignal({ room, from: peerId, type: 'hello' })
  }, [cleanup, code, iceServers, startCameraLoop])

  const sendPointer = useCallback((x: number, y: number, down: boolean) => {
    sendJson({ t: 'ptr', x, y, down })
  }, [sendJson])
  const sendGyro = useCallback((alpha: number, beta: number, gamma: number) => {
    sendJson({ t: 'gyro', alpha, beta, gamma })
  }, [sendJson])
  const sendMic = useCallback((level: number, bands?: number[]) => {
    sendJson({ t: 'mic', level, bands })
  }, [sendJson])
  const sendWorld = useCallback((id: string) => {
    sendJson({ t: 'world', id })
  }, [sendJson])

  const disconnect = useCallback(() => {
    sendJson({ t: 'bye' })
    if (hostPeerRef.current) {
      postSignal({ room: roomIdFor(code), from: peerIdRef.current, to: hostPeerRef.current, type: 'leave' })
    }
    unsubRef.current?.()
    cleanup()
    setState('idle')
  }, [cleanup, code, sendJson])

  useEffect(() => () => { unsubRef.current?.(); cleanup() }, [cleanup])

  return {
    state, error, isLive: state === 'connected',
    connect, disconnect, sendPointer, sendGyro, sendMic, sendWorld,
  }
}
