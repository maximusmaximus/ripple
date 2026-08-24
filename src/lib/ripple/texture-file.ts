import {
  ALLOWED_TEXTURE_TYPES,
  MAX_IMAGE_DIM,
  MAX_UPLOAD_BYTES,
  type CustomTexture,
} from "./studio";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = src;
  });
}

function drawFit(img: CanvasImageSource, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image.");
  ctx.drawImage(img, 0, 0, w, h);
  return canvas;
}

/** Still JPEG for persistence (GIFs keep a first-frame still). */
function persistStill(img: HTMLImageElement): CustomTexture {
  const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.naturalWidth, img.naturalHeight, 1));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = drawFit(img, w, h);
  let quality = 0.86;
  let dataUrl = canvas.toDataURL("image/jpeg", quality);
  while (dataUrl.length > 1_400_000 && quality > 0.5) {
    quality -= 0.08;
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  return { mime: "image/jpeg", dataUrl, width: w, height: h };
}

export type LoadedTexture = {
  still: CustomTexture;
  liveUrl: string;
  animated: boolean;
};

export async function readTextureFile(file: File): Promise<LoadedTexture> {
  if (!ALLOWED_TEXTURE_TYPES.has(file.type)) {
    throw new Error("Use a JPG, PNG, GIF, or WebP.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Max 10 MB — try a smaller file.");
  }
  const liveUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(liveUrl);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w < 8 || h < 8) {
      URL.revokeObjectURL(liveUrl);
      throw new Error("Image is too small.");
    }
    if ((w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) && file.type === "image/gif") {
      URL.revokeObjectURL(liveUrl);
      throw new Error("GIFs must be 4K (4096px) or smaller.");
    }
    const still = persistStill(img);
    const animated = file.type === "image/gif";
    if (!animated) {
      URL.revokeObjectURL(liveUrl);
      return { still, liveUrl: still.dataUrl, animated: false };
    }
    return { still, liveUrl, animated: true };
  } catch (err) {
    URL.revokeObjectURL(liveUrl);
    throw err;
  }
}
