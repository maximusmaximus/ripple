import { createFileRoute } from "@tanstack/react-router";
import { handleLive } from "@/lib/multiplayer/live.server";

const handle = ({ request }: { request: Request }) => handleLive(request);

export const Route = createFileRoute("/api/live")({
  server: { handlers: { GET: handle, POST: handle } },
});
