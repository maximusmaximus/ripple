export const MAX_SESSION_CLIPS = 8;

export type PendingClip = { url: string; name: string; createdAt?: string };

export function revokeClip(clip: PendingClip | null | undefined) {
  if (!clip?.url) return;
  if (typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
  if (!clip.url.startsWith("blob:")) return;
  try {
    URL.revokeObjectURL(clip.url);
  } catch {
    /* already gone */
  }
}

/** Newest first. Drops extras and revokes their blob URLs. */
export function prependClip(list: PendingClip[], clip: PendingClip): PendingClip[] {
  const next = [clip, ...list.filter((c) => c.url && c.url !== clip.url)];
  const keep = next.slice(0, MAX_SESSION_CLIPS);
  for (const dropped of next.slice(MAX_SESSION_CLIPS)) revokeClip(dropped);
  return keep;
}

export function dropClip(list: PendingClip[], url: string): PendingClip[] {
  const found = list.find((c) => c.url === url);
  if (found) revokeClip(found);
  return list.filter((c) => c.url !== url);
}

export function clearClips(list: PendingClip[]): PendingClip[] {
  for (const c of list) revokeClip(c);
  return [];
}

export function makeClip(blob: Blob, name: string): PendingClip {
  const url =
    typeof URL !== "undefined" && typeof URL.createObjectURL === "function"
      ? URL.createObjectURL(blob)
      : "";
  return { url, name, createdAt: new Date().toISOString() };
}
