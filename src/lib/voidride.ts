/** Latest VOIDRIDE drop used while the pairing QR is waking. */
export const VOIDRIDE_PROFILE = "https://soundcloud.com/ridethevoid";
export const VOIDRIDE_CREDIT_MS = 400;
export const VOIDRIDE_FAILSAFE_MS = 1800;
export const VOIDRIDE_HOLD_MS = VOIDRIDE_FAILSAFE_MS;

export type VoidrideRelease = {
  title: string;
  url: string;
  art: string;
};

/** SoundCloud artwork CDN — local /studio copies 404 under Vite's watch ignore. */
export const VOIDRIDE_LATEST: VoidrideRelease = {
  title: "EMBER RITE",
  url: "https://soundcloud.com/ridethevoid/ember-rite",
  art: "https://i1.sndcdn.com/artworks-EBNFdPf8REoyKlxC-sn2PPg-t500x500.jpg",
};

const OEMBED = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(VOIDRIDE_LATEST.url)}`;

export async function fetchVoidrideLatest(): Promise<VoidrideRelease> {
  try {
    const r = await fetch(OEMBED, { cache: "no-store" });
    if (!r.ok) return VOIDRIDE_LATEST;
    const data = (await r.json()) as { title?: string; thumbnail_url?: string; author_url?: string };
    const title = (data.title ?? VOIDRIDE_LATEST.title).replace(/\s+by\s+VOIDRIDE\s*$/i, "").trim();
    const art = data.thumbnail_url || VOIDRIDE_LATEST.art;
    return {
      title: title || VOIDRIDE_LATEST.title,
      url: VOIDRIDE_LATEST.url,
      art,
    };
  } catch {
    return VOIDRIDE_LATEST;
  }
}
