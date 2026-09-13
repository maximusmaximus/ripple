/** Phone pad URL baked into the wall QR / typed-code join. */

export function isUnroutableHost(hostname: string): boolean {
  const h = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "::1" ||
    h === "0.0.0.0" ||
    h.endsWith(".local")
  );
}

export function pairUrlIsLocal(url: string): boolean {
  if (!url) return true;
  try {
    return isUnroutableHost(new URL(url).hostname);
  } catch {
    return true;
  }
}

export function pairUrlFor(
  code: string,
  href: string = typeof window === "undefined" ? "" : window.location.href,
): string {
  const trimmed = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  if (!href || !trimmed) return "";
  try {
    const u = new URL(href);
    u.search = "";
    u.hash = "";
    u.searchParams.set("mode", "pad");
    u.searchParams.set("c", trimmed);
    return u.toString();
  } catch {
    return "";
  }
}
