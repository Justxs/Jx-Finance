import type { ComponentProps, ElementType } from "react";

type AsProps<T extends ElementType> = T extends ElementType
  ? { as: T } & Omit<ComponentProps<T>, "as">
  : never;

export type PolymorphicProps<Default extends ElementType, Others extends ElementType = never> =
  | ({ as?: Default } & Omit<ComponentProps<Default>, "as">)
  | AsProps<Others>;

export function rendersAs<TProps extends { as?: unknown }, TComponent>(
  props: TProps,
  component: TComponent,
): props is Extract<TProps, { as: TComponent }> {
  return props.as === component;
}
