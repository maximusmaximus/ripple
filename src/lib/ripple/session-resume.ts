type ShareValue = {
  title: string;
  description: string;
  watchable: boolean;
};

const PEER_KEY = "ripple-host-peer";
const CODE_KEY = "ripple-host-code";
const SHARE_KEY = "ripple-host-share";
const MENU_SEEN_KEY = "ripple-menu-seen";
const VOIDRIDE_KEY = "ripple-voidride-latest-v2";
const VOIDRIDE_CACHE_MS = 5 * 60 * 1000;

function lsGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode */
  }
}

function lsDel(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
}

export function readHostPeer(): string | null {
  const v = lsGet(PEER_KEY);
  return v && /^[a-zA-Z0-9_-]{2,64}$/.test(v) ? v : null;
}

export function writeHostPeer(id: string) {
  if (id) lsSet(PEER_KEY, id);
}

export function restoreHostPeer(make: () => string): string {
  const saved = readHostPeer();
  if (saved) return saved;
  const id = make();
  writeHostPeer(id);
  return id;
}

export function readHostCode(): string | null {
  const v = lsGet(CODE_KEY);
  if (!v) return null;
  const code = v.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return code.length >= 4 && code.length <= 8 ? code : null;
}

export function writeHostCode(code: string) {
  const next = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (next.length >= 4) lsSet(CODE_KEY, next);
}

export function readHostShare(): ShareValue | null {
  const raw = lsGet(SHARE_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ShareValue>;
    if (!v || typeof v !== "object") return null;
    return {
      title: typeof v.title === "string" ? v.title.slice(0, 48) : "",
      description: typeof v.description === "string" ? v.description.slice(0, 140) : "",
      watchable: Boolean(v.watchable),
    };
  } catch {
    return null;
  }
}

export function writeHostShare(value: ShareValue) {
  lsSet(SHARE_KEY, JSON.stringify(value));
}

export function menuSeenBefore(): boolean {
  return lsGet(MENU_SEEN_KEY) === "1";
}

export function markMenuSeen() {
  lsSet(MENU_SEEN_KEY, "1");
}

export type CachedVoidride = {
  album: string;
  albumUrl: string;
  title: string;
  url: string;
  art: string;
  at?: number;
};

/** Fresh live drop only. Untimed / stale / v1 caches are ignored so launch never shows an older track. */
export function readCachedVoidride(): CachedVoidride | null {
  lsDel("ripple-voidride-latest");
  const raw = lsGet(VOIDRIDE_KEY);
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as CachedVoidride;
    if (!v?.title || !v?.url || !v?.album) return null;
    if (typeof v.at !== "number" || Date.now() - v.at > VOIDRIDE_CACHE_MS) return null;
    return v;
  } catch {
    return null;
  }
}

export function writeCachedVoidride(drop: CachedVoidride) {
  lsDel("ripple-voidride-latest");
  lsSet(VOIDRIDE_KEY, JSON.stringify({ ...drop, at: Date.now() }));
}
