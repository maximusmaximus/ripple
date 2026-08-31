import { createFileRoute } from "@tanstack/react-router";
import { fetchVoidrideLatest } from "@/lib/ripple/voidride-fetch";
import { VOIDRIDE_LATEST } from "@/lib/voidride";

export const Route = createFileRoute("/api/voidride")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const drop = await fetchVoidrideLatest();
          return Response.json(drop, {
            headers: { "cache-control": "no-store" },
          });
        } catch {
          return Response.json(VOIDRIDE_LATEST, {
            headers: { "cache-control": "no-store" },
          });
        }
      },
    },
  },
});
