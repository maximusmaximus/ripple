import { useLayoutEffect, useRef } from "react";

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
  const ref = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas || !value) return;
    let cancelled = false;
    void import("uqr").then(({ encode }) => {
      if (cancelled || !ref.current) return;
      const result = encode(value, { ecc: "M", border: 2 });
      const n = result.size;
      const scale = 4;
      canvas.width = n * scale;
      canvas.height = n * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = dark;
      for (let y = 0; y < n; y++) {
        const row = result.data[y]!;
        for (let x = 0; x < n; x++) {
          if (row[x]) ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [value, dark, light]);

  return (
    <canvas
      ref={ref}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size, borderRadius: 12 }}
      role="img"
      aria-label="Scan to pair this display"
    />
  );
}
