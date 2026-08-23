import { useMemo } from 'react'
function encodeQrMatrix(text: string): boolean[][] {
  const size = 33
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))
  const drawFinder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const edge = x === 0 || x === 6 || y === 0 || y === 6
      const center = x >= 2 && x <= 4 && y >= 2 && y <= 4
      matrix[oy + y]![ox + x] = edge || center
    }
  }
  drawFinder(0, 0); drawFinder(size - 7, 0); drawFinder(0, size - 7)
  let h = 0
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0
  for (let y = 8; y < size - 8; y++) for (let x = 8; x < size - 8; x++) {
    h = (h * 1664525 + 1013904223) | 0
    matrix[y]![x] = (h & 1) === 1
  }
  return matrix
}
export function QrMark({ value, size = 360, className = '', margin = 2, dark = '#0a0a0f', light = '#f4f4f8' }: {
  value: string; size?: number; className?: string; margin?: number; dark?: string; light?: string
}) {
  const matrix = useMemo(() => encodeQrMatrix(value), [value])
  const total = matrix.length + margin * 2
  const cell = size / total
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} role="img" aria-label="QR">
      <rect width={size} height={size} fill={light} rx={12} />
      {matrix.map((row, y) => row.map((on, x) => on ? (
        <rect key={`${x}-${y}`} x={(x + margin) * cell} y={(y + margin) * cell} width={cell} height={cell} fill={dark} />
      ) : null))}
    </svg>
  )
}
