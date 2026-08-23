import type { ReactNode } from 'react'

export function PadGate({ code, children }: { code: string; children: ReactNode }) {
  return (
    <div className="relative h-dvh w-dvw overflow-hidden bg-black" data-pad-code={code}>
      {children}
    </div>
  )
}
