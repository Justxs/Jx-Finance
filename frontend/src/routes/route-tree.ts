import { createRootRoute, createRoute } from "@tanstack/react-router";
import { RootLayout } from "./root-layout";
import { HomePage } from "./home-page";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

export const routeTree = rootRoute.addChildren([indexRoute]);
