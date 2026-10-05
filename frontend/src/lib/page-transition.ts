import type { RouterOptions } from "@tanstack/react-router";
import { LANDING_PATHS, PUBLIC_PATHS } from "@/lib/navigation";

type DefaultViewTransition = NonNullable<RouterOptions<never, never>["defaultViewTransition"]>;

interface TransitionLocation {
  pathname: string;
}

interface TransitionInfo {
  fromLocation?: TransitionLocation;
  toLocation: TransitionLocation;
  pathChanged: boolean;
}

function shellOf(pathname: string) {
  if (LANDING_PATHS.has(pathname)) {
    return "landing";
  }
  return PUBLIC_PATHS.has(pathname) ? "public" : "app";
}

export function pageTransitionTypes({ fromLocation, toLocation, pathChanged }: TransitionInfo) {
  if (!fromLocation || !pathChanged) {
    return false;
  }
  const from = shellOf(fromLocation.pathname);
  const to = shellOf(toLocation.pathname);
  return from === to && from !== "landing" ? ["page"] : ["shell"];
}

export const pageViewTransition: DefaultViewTransition = { types: pageTransitionTypes };
