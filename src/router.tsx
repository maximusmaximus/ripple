import { createRouter } from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { RippleSplash } from "@/components/ripple-splash";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultErrorComponent: AppErrorComponent,
    defaultPendingComponent: RippleSplash,
    defaultPendingMs: 0,
  });
}