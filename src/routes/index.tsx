import { createFileRoute } from "@tanstack/react-router";
import { RippleApp } from "@/components/ripple-app";

type Search = {
  mode?: "wall" | "pad" | "watch";
  c?: string;
};

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): Search => {
    const mode = s.mode === "wall" || s.mode === "pad" || s.mode === "watch" ? s.mode : undefined;
    const c = typeof s.c === "string" && s.c.length > 0 ? s.c : undefined;
    return { mode, c };
  },
  component: Home,
});

function Home() {
  return <RippleApp />;
}
