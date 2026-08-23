import { useMemo } from "react";
import { encode } from "uqr";

export function QrMark({
  value,
  size = 360,
  className = "",
  dark = "#0a0a0f",
  light = "#f4f4f8",
}: {
  value: string;
  size?: number;
  className?: string;
  dark?: string;
  light?: string;
}) {
  const { data, n } = useMemo(() => {
    const result = encode(value, { ecc: "M", border: 2 });
    return { data: result.data, n: result.size };
  }, [value]);
  const cell = size / n;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      role="img"
      aria-label="Scan to pair this display"
    >
      <rect width={size} height={size} fill={light} rx={12} />
      {data.map((row, y) =>
        row.map((on, x) =>
          on ? (
            <rect
              key={`${x}-${y}`}
              x={x * cell}
              y={y * cell}
              width={cell}
              height={cell}
              fill={dark}
            />
          ) : null,
        ),
      )}
    </svg>
  );
}
