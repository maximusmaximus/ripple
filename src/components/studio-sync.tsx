import { useEffect, useRef } from "react";
import { useRippleStore } from "@/store/ripple";
import { getStudioSession, putStudioSession } from "@/lib/ripple/studio-api";

/** Hydrate from the shared studio row, then keep it in sync for the next visitor. */
export function StudioSync() {
  const applySnapshot = useRippleStore((s) => s.applySnapshot);
  const takeSnapshot = useRippleStore((s) => s.takeSnapshot);
  const hydrated = useRef(false);
  const timer = useRef<number | null>(null);

  const flush = () => {
    if (!hydrated.current) return;
    const snap = takeSnapshot();
    void putStudioSession({ data: snap }).catch(() => {});
  };

  useEffect(() => {
    let live = true;
    const run = async () => {
      try {
        const row = await getStudioSession();
        if (!live) return;
        if (row?.snapshot) applySnapshot(row.snapshot);
      } catch {
        /* preview without schema yet — local persist still applies */
      } finally {
        hydrated.current = true;
      }
    };
    const persist = useRippleStore.persist;
    if (persist.hasHydrated()) void run();
    const unsub = persist.onFinishHydration(() => {
      void run();
    });
    return () => {
      live = false;
      unsub();
    };
  }, [applySnapshot]);

  useEffect(() => {
    const unsub = useRippleStore.subscribe(() => {
      if (!hydrated.current) return;
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, 500);
    });
    const onHide = () => {
      if (timer.current) window.clearTimeout(timer.current);
      flush();
    };
    const onVis = () => {
      if (document.visibilityState === "hidden") onHide();
    };
    window.addEventListener("pagehide", onHide);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      unsub();
      if (timer.current) window.clearTimeout(timer.current);
      window.removeEventListener("pagehide", onHide);
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [takeSnapshot]);

  return null;
}
