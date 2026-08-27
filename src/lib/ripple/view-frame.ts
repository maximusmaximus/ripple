/** Downscale a WebGL canvas to a JPEG for live watchers. */
export async function grabSurfaceJpeg(
  canvas: HTMLCanvasElement,
  maxW = 480,
  quality = 0.42,
): Promise<ArrayBuffer | null> {
  const w = canvas.width;
  const h = canvas.height;
  if (!w || !h) return null;
  const scale = Math.min(1, maxW / w);
  const dw = Math.max(1, Math.round(w * scale));
  const dh = Math.max(1, Math.round(h * scale));
  const off = document.createElement("canvas");
  off.width = dw;
  off.height = dh;
  const ctx = off.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(canvas, 0, 0, dw, dh);
  } catch {
    return null;
  }
  const blob = await new Promise<Blob | null>((resolve) => {
    off.toBlob((b) => resolve(b), "image/jpeg", quality);
  });
  if (!blob) return null;
  return blob.arrayBuffer();
}
