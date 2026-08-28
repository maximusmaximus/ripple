import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { VoidrideHold } from "@/components/voidride-hold";
import { routeTree } from "./routeTree.gen";

function BootPending() {
  return (
    <div className="h-dvh w-dvw bg-ink">
      <VoidrideHold fullScreen quiet />
    </div>
  );
}

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultPendingComponent: BootPending,
    defaultPendingMs: 2000,
  });
}
