import type { ComponentProps, ElementType } from "react";

type AsProps<T extends ElementType> = T extends ElementType
  ? { as: T } & Omit<ComponentProps<T>, "as">
  : never;

export type PolymorphicProps<Default extends ElementType, Others extends ElementType = never> =
  | ({ as?: Default } & Omit<ComponentProps<Default>, "as">)
  | AsProps<Others>;

export function splitAs<TProps extends { as?: ElementType }>(props: TProps, fallback: ElementType) {
  const { as: Component = fallback, ...rest } = props;
  return { Component, rest };
}
