import type { RouterOptions } from "@tanstack/react-router";

type DefaultViewTransition = NonNullable<RouterOptions<never, never>["defaultViewTransition"]>;

export const pageViewTransition: DefaultViewTransition = {
  types: ({ pathChanged }) => (pathChanged ? ["page"] : false),
};
