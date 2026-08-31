import { VOIDRIDE_LATEST, type VoidrideRelease } from "@/lib/voidride";

const PROFILE = "https://soundcloud.com/ridethevoid";
const TRACKS = `${PROFILE}/tracks`;
const UA = "Mozilla/5.0 RippleStudio/1.0";
const TTL_MS = 120_000;

let cache: { at: number; drop: VoidrideRelease } | null = null;

function decode(html: string) {
  const amp = `&${"amp"};`;
  const quot = `&${"quot"};`;
  const lt = `&${"lt"};`;
  const gt = `&${"gt"};`;
  return html
    .replaceAll(amp, "&")
    .replaceAll(quot, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replaceAll(lt, "<")
    .replaceAll(gt, ">");
}

async function get(url: string): Promise<string> {
  const r = await fetch(url, { headers: { "user-agent": UA }, cache: "no-store" });
  if (!r.ok) throw new Error(`voidride ${r.status}`);
  return r.text();
}

function trackNames(html: string): { href: string; title: string }[] {
  const out: { href: string; title: string }[] = [];
  const seen = new Set<string>();
  const re =
    /<h2 itemprop="name">\s*<a itemprop="url" href="(\/ridethevoid\/(?!sets\/)[^"]+)">([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1]!;
    if (href.includes("/") && href.split("/").length > 3) continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ href, title: decode(m[2]!).trim() });
  }
  if (out.length) return out;
  const loose = /href="(\/ridethevoid\/[a-z0-9-]+)"[^>]*>([^<]{2,80})</gi;
  while ((m = loose.exec(html))) {
    const href = m[1]!;
    const slug = href.slice("/ridethevoid/".length);
    if (!slug || slug === "sets" || slug === "albums" || slug === "tracks" || slug === "likes") continue;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ href, title: decode(m[2]!).trim() });
  }
  return out;
}

function albumOf(html: string): { href: string; title: string } | null {
  const item =
    /itemprop="inAlbum"[\s\S]{0,400}?href="(\/ridethevoid\/sets\/[^"]+)"[^>]*>([^<]+)/i.exec(html) ||
    /href="(\/ridethevoid\/sets\/[^"]+)"[^>]*itemprop="url"[^>]*>([^<]+)/i.exec(html);
  if (item) return { href: item[1]!, title: decode(item[2]!).trim() };
  const loose = /href="(\/ridethevoid\/sets\/[^"]+)"[^>]*>([^<]{2,80})</i.exec(html);
  if (!loose) return null;
  return { href: loose[1]!, title: decode(loose[2]!).trim() };
}

async function oembed(url: string): Promise<{ title?: string; thumbnail_url?: string } | null> {
  try {
    const r = await fetch(`https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`, {
      headers: { "user-agent": UA },
      cache: "no-store",
    });
    if (!r.ok) return null;
    return (await r.json()) as { title?: string; thumbnail_url?: string };
  } catch {
    return null;
  }
}

/** Newest published VOIDRIDE track only — never a playlist's first song or a stale fallback flash. */
export async function fetchVoidrideLatest(): Promise<VoidrideRelease> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.drop;
  try {
    const tracksHtml = await get(TRACKS);
    const tracks = trackNames(tracksHtml);
    const song = tracks[0];
    if (!song) throw new Error("no track");
    const songUrl = `https://soundcloud.com${song.href}`;
    const songTitle = song.title;
    let album = songTitle;
    let albumUrl = songUrl;
    try {
      const page = await get(songUrl);
      const set = albumOf(page);
      if (set?.href) {
        albumUrl = `https://soundcloud.com${set.href}`;
        album = set.title || album;
      }
    } catch {
      /* single */
    }
    const meta = await oembed(songUrl);
    const drop: VoidrideRelease = {
      album,
      albumUrl,
      title: songTitle,
      url: songUrl,
      art: meta?.thumbnail_url || VOIDRIDE_LATEST.art,
    };
    cache = { at: now, drop };
    return drop;
  } catch {
    return cache?.drop ?? VOIDRIDE_LATEST;
  }
}
