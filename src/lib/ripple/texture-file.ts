import {
  ALLOWED_TEXTURE_TYPES,
  MAX_IMAGE_DIM,
  MAX_UPLOAD_BYTES,
  type CustomTexture,
} from "./studio";

const EXT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function sniffType(file: File): string {
  const raw = (file.type || "").toLowerCase();
  if (raw === "image/jpg") return "image/jpeg";
  if (ALLOWED_TEXTURE_TYPES.has(raw)) return raw;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_TYPE[ext] ?? "";
}

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
  if (dataUrl.length > 1_550_000) {
    throw new Error("Image is too heavy after compress — try a smaller file.");
  }
  return { mime: "image/jpeg", dataUrl, width: w, height: h };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Could not read that file."));
    };
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.readAsDataURL(file);
  });
}

export type LoadedTexture = {
  still: CustomTexture;
  liveUrl: string;
  animated: boolean;
};

export async function readTextureFile(file: File): Promise<LoadedTexture> {
  if (file.size <= 0) {
    throw new Error("That file is empty.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Max 10 MB — try a smaller file.");
  }
  const mime = sniffType(file);
  if (!mime || !ALLOWED_TEXTURE_TYPES.has(mime)) {
    throw new Error("Use a JPG, PNG, or GIF (WebP is ok too).");
  }

  const liveUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(liveUrl);
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (w < 8 || h < 8) {
      throw new Error("Image is too small.");
    }
    const animated = mime === "image/gif";
    if ((w > MAX_IMAGE_DIM || h > MAX_IMAGE_DIM) && animated) {
      throw new Error("GIFs must be 4K (4096px) or smaller.");
    }

    if (animated && file.size <= 900_000) {
      const dataUrl = await fileToDataUrl(file);
      if (dataUrl.length > 1_550_000) {
        const still = persistStill(img);
        return { still, liveUrl, animated: true };
      }
      return {
        still: { mime, dataUrl, width: w, height: h },
        liveUrl,
        animated: true,
      };
    }

    const still = persistStill(img);
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
