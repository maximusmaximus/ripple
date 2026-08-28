import { VOIDRIDE_LATEST, type VoidrideRelease } from "@/lib/voidride";

const PROFILE = "https://soundcloud.com/ridethevoid";
const SETS = `${PROFILE}/sets`;
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

function playlistNames(html: string): { href: string; title: string }[] {
  const out: { href: string; title: string }[] = [];
  const seen = new Set<string>();
  const re =
    /<h2 itemprop="name">\s*<a itemprop="url" href="(\/ridethevoid\/sets\/[^"]+)">([^<]+)<\/a>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = m[1]!;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ href, title: decode(m[2]!).trim() });
  }
  if (out.length) return out;
  const loose = /href="(\/ridethevoid\/sets\/[^"]+)"[^>]*>([^<]+)</g;
  while ((m = loose.exec(html))) {
    const href = m[1]!;
    if (seen.has(href)) continue;
    seen.add(href);
    out.push({ href, title: decode(m[2]!).trim() });
  }
  return out;
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

/** Latest VOIDRIDE album + a song from it. Scrapes SoundCloud; falls back to the baked drop. */
export async function fetchVoidrideLatest(): Promise<VoidrideRelease> {
  const now = Date.now();
  if (cache && now - cache.at < TTL_MS) return cache.drop;
  try {
    const setsHtml = await get(SETS);
    const playlists = playlistNames(setsHtml);
    const album = playlists[0];
    if (!album) throw new Error("no album");
    const albumUrl = `https://soundcloud.com${album.href}`;
    const albumPage = await get(albumUrl);
    const tracks = trackNames(albumPage);
    const song = tracks[0];
    const songUrl = song ? `https://soundcloud.com${song.href}` : albumUrl;
    const songTitle = song?.title || album.title;
    const meta = (await oembed(albumUrl)) ?? (await oembed(songUrl));
    const art = meta?.thumbnail_url || VOIDRIDE_LATEST.art;
    const drop: VoidrideRelease = {
      album: album.title,
      albumUrl,
      title: songTitle,
      url: songUrl,
      art,
    };
    cache = { at: now, drop };
    return drop;
  } catch {
    return cache?.drop ?? VOIDRIDE_LATEST;
  }
}
