/**
 * Wall host — QR pair, pure remote stream when pad connects, QR on disconnect.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  decodeCamFrame,
  makeCastCode,
  parseCastMsg,
  roomIdFor,
  type CastMsg,
} from '../lib/ripple/cast'
import { makePeerId, postSignal, subscribeSignal, type SignalMsg } from '../lib/multiplayer/signaling'

export type HostConnectionState = 'idle' | 'waiting' | 'connected' | 'reconnecting'
export type RemoteFrame = { jpeg: ArrayBuffer; receivedAt: number }
export type RemoteInput = {
  ptr?: { x: number; y: number; down: boolean }
  gyro?: { alpha: number; beta: number; gamma: number }
  mic?: { level: number; bands?: number[] }
  worldId?: string
}

export type UseCastHostOptions = {
  preferredCode?: string | null
  onCamFrame?: (frame: RemoteFrame) => void
  onRemoteInput?: (input: RemoteInput) => void
  iceServers?: RTCIceServer[]
}

export function useCastHost(opts: UseCastHostOptions = {}) {
  const [code, setCode] = useState(() => (opts.preferredCode || makeCastCode()).toUpperCase())
  const [state, setState] = useState<HostConnectionState>('idle')
  const [pairUrl, setPairUrl] = useState('')
  const [lastError, setLastError] = useState<string | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const peerIdRef = useRef(makePeerId())
  const unsubRef = useRef<(() => void) | null>(null)
  const remotePeerRef = useRef<string | null>(null)
  const optsRef = useRef(opts)
  optsRef.current = opts

  useEffect(() => {
    if (typeof window === 'undefined') return
    const u = new URL(window.location.href)
    u.searchParams.set('c', code)
    u.searchParams.set('pad', '1')
    u.searchParams.delete('wall')
    setPairUrl(u.toString())
  }, [code])

  const cleanupPeer = useCallback(() => {
    try { dcRef.current?.close() } catch {}
    try { pcRef.current?.close() } catch {}
    dcRef.current = null
    pcRef.current = null
    remotePeerRef.current = null
  }, [])

  const goIdle = useCallback(() => {
    cleanupPeer()
    setState('idle')
  }, [cleanupPeer])

  const handleRemoteDisconnect = useCallback(() => {
    setState('reconnecting')
    cleanupPeer()
    setTimeout(() => setState('idle'), 800)
  }, [cleanupPeer])

  const wireDataChannel = useCallback((dc: RTCDataChannel) => {
    dcRef.current = dc
    dc.binaryType = 'arraybuffer'
    dc.onopen = () => {
      setState('connected')
      setLastError(null)
    }
    dc.onclose = () => handleRemoteDisconnect()
    dc.onerror = () => handleRemoteDisconnect()
    dc.onmessage = (ev) => {
      if (typeof ev.data === 'string') {
        const msg = parseCastMsg(ev.data)
        if (!msg) return
        if (msg.t === 'bye') { handleRemoteDisconnect(); return }
        const input: RemoteInput = {}
        if (msg.t === 'ptr') input.ptr = { x: msg.x, y: msg.y, down: msg.down }
        if (msg.t === 'gyro') input.gyro = { alpha: msg.alpha, beta: msg.beta, gamma: msg.gamma }
        if (msg.t === 'mic') input.mic = { level: msg.level, bands: msg.bands }
        if (msg.t === 'world') input.worldId = msg.id
        if (Object.keys(input).length) optsRef.current.onRemoteInput?.(input)
      } else if (ev.data instanceof ArrayBuffer) {
        const jpeg = decodeCamFrame(ev.data)
        if (jpeg) optsRef.current.onCamFrame?.({ jpeg, receivedAt: Date.now() })
      }
    }
  }, [handleRemoteDisconnect])

  const ensurePC = useCallback(() => {
    if (pcRef.current) return pcRef.current
    const pc = new RTCPeerConnection({ iceServers: opts.iceServers ?? [] })
    pcRef.current = pc
    pc.onicecandidate = (e) => {
      if (!e.candidate || !remotePeerRef.current) return
      postSignal({
        room: roomIdFor(code),
        from: peerIdRef.current,
        to: remotePeerRef.current,
        type: 'candidate',
        candidate: e.candidate.toJSON(),
      })
    }
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState
      if (s === 'failed' || s === 'disconnected' || s === 'closed') handleRemoteDisconnect()
    }
    pc.ondatachannel = (e) => wireDataChannel(e.channel)
    return pc
  }, [code, handleRemoteDisconnect, opts.iceServers, wireDataChannel])

  useEffect(() => {
    const room = roomIdFor(code)
    const peerId = peerIdRef.current
    unsubRef.current?.()
    unsubRef.current = subscribeSignal(room, peerId, async (msg: SignalMsg) => {
      if (msg.type === 'offer' && msg.sdp) {
        setState('waiting')
        remotePeerRef.current = msg.from
        const pc = ensurePC()
        try {
          await pc.setRemoteDescription(msg.sdp)
          const answer = await pc.createAnswer()
          await pc.setLocalDescription(answer)
          postSignal({
            room,
            from: peerId,
            to: msg.from,
            type: 'answer',
            sdp: pc.localDescription!.toJSON(),
          })
        } catch (err) {
          setLastError(String(err))
          goIdle()
        }
      } else if (msg.type === 'candidate' && msg.candidate && msg.from === remotePeerRef.current) {
        try { await pcRef.current?.addIceCandidate(msg.candidate) } catch {}
      } else if (msg.type === 'leave') {
        handleRemoteDisconnect()
      }
    })
    postSignal({ room, from: peerId, type: 'hello' })
    return () => {
      unsubRef.current?.()
      if (remotePeerRef.current) {
        postSignal({ room, from: peerId, to: remotePeerRef.current, type: 'leave' })
      }
      cleanupPeer()
    }
  }, [code, ensurePC, goIdle, handleRemoteDisconnect, cleanupPeer])

  const regenerateCode = useCallback(() => {
    goIdle()
    setCode(makeCastCode())
  }, [goIdle])

  const disconnect = useCallback(() => {
    try { dcRef.current?.send(JSON.stringify({ t: 'bye' } satisfies CastMsg)) } catch {}
    if (remotePeerRef.current) {
      postSignal({ room: roomIdFor(code), from: peerIdRef.current, to: remotePeerRef.current, type: 'leave' })
    }
    goIdle()
  }, [code, goIdle])

  return {
    code,
    pairUrl,
    state,
    isLive: state === 'connected',
    showPairUI: state === 'idle' || state === 'reconnecting' || state === 'waiting',
    lastError,
    regenerateCode,
    disconnect,
  }
}
