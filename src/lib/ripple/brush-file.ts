import type { CustomBrush } from "./brushes";

export const MAX_BRUSH_BYTES = 100 * 1024;
export const MAX_BRUSH_DIM = 256;
export const MIN_BRUSH_DIM = 16;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that PNG."));
    img.src = src;
  });
}

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Could not encode that brush."));
      },
      "image/png",
    );
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read that brush."));
    };
    reader.onerror = () => reject(new Error("Could not read that brush."));
    reader.readAsDataURL(blob);
  });
}

function drawBrush(img: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process that PNG.");
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

export type LoadedBrush = Pick<CustomBrush, "mime" | "dataUrl" | "width" | "height">;

/** Transparent PNG → silhouette stamp, capped at 100 KB. */
export async function readBrushPng(file: File): Promise<LoadedBrush> {
  if (file.size <= 0) throw new Error("That file is empty.");
  const mime = (file.type || "").toLowerCase();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (mime !== "image/png" && ext !== "png") {
    throw new Error("Use a transparent PNG.");
  }

  const liveUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(liveUrl);
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (nw < MIN_BRUSH_DIM || nh < MIN_BRUSH_DIM) {
      throw new Error("PNG is too small — 16px minimum.");
    }

    let scale = Math.min(1, MAX_BRUSH_DIM / Math.max(nw, nh, 1));
    let blob: Blob | null = null;
    let w = 0;
    let h = 0;

    for (let i = 0; i < 10; i++) {
      w = Math.max(MIN_BRUSH_DIM, Math.round(nw * scale));
      h = Math.max(MIN_BRUSH_DIM, Math.round(nh * scale));
      const canvas = drawBrush(img, w, h);
      blob = await canvasToPng(canvas);
      if (blob.size <= MAX_BRUSH_BYTES) break;
      scale *= 0.78;
      if (w <= MIN_BRUSH_DIM && h <= MIN_BRUSH_DIM) break;
    }

    if (!blob || blob.size > MAX_BRUSH_BYTES) {
      throw new Error("Could not fit that PNG under 100 KB — try a simpler silhouette.");
    }

    const dataUrl = await blobToDataUrl(blob);
    return { mime: "image/png", dataUrl, width: w, height: h };
  } finally {
    URL.revokeObjectURL(liveUrl);
  }
}
