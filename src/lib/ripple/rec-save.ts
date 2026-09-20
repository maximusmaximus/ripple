export const REC_AUTOSAVE_KEY = "ripple-rec-autosave";

export type RecAutosave = "on" | "off" | null;
export type RecNoticeMode = "ask" | "saved" | "play";
export type RecNotice = {
  clip: { url: string; name: string; createdAt?: string } | null;
  mode: RecNoticeMode;
};

type Kv = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

function defaultStore(): Kv | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readRecAutosave(store: Kv | null = defaultStore()): RecAutosave {
  const v = store?.getItem(REC_AUTOSAVE_KEY);
  if (v === "on" || v === "off") return v;
  return null;
}

export function writeRecAutosave(value: "on" | "off", store: Kv | null = defaultStore()) {
  try {
    store?.setItem(REC_AUTOSAVE_KEY, value);
  } catch {
    /* private mode */
  }
}

/** First REC — ask once, on the desktop, before later takes save themselves. */
export function noticeForRecStart(pref: RecAutosave): RecNoticeMode | null {
  return pref == null ? "ask" : null;
}

/** After a take lands — ask only if they have not chosen yet. */
export function noticeForTake(pref: RecAutosave): RecNoticeMode | null {
  if (pref === "on") return "saved";
  if (pref == null) return "ask";
  return null;
}
