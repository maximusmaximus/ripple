export function WallViewport({ preferredCode }: { preferredCode?: string | null }) {
  return (
    <div className="flex h-dvh w-dvw items-center justify-center bg-black text-white/70">
      <div className="text-center">
        <p className="text-lg font-medium text-white/90">Wall display</p>
        <p className="mt-2 text-sm">
          Pairing code: <span className="font-mono text-white">{preferredCode ?? '—'}</span>
        </p>
        <p className="mt-4 max-w-xs text-xs text-white/50">
          Open the main app and scan the QR to stream the surface here.
        </p>
      </div>
    </div>
  )
}
