import type { RouterOptions } from "@tanstack/react-router";

type DefaultViewTransition = NonNullable<RouterOptions<never, never>["defaultViewTransition"]>;

interface TransitionInfo {
  fromLocation?: object;
  pathChanged: boolean;
}

export function pageTransitionTypes({ fromLocation, pathChanged }: TransitionInfo) {
  return fromLocation && pathChanged ? ["page"] : false;
}

export const pageViewTransition: DefaultViewTransition = { types: pageTransitionTypes };
