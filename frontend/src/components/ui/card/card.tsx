import { type PolymorphicProps, splitAs } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";

type Props = PolymorphicProps<"div", "section">;

export function Card({ className, ...props }: Readonly<Props>) {
  const slot = {
    "data-slot": "card",
    className: cn("min-w-0 rounded-md border bg-card text-card-foreground", className),
  };

  const { Component, rest } = splitAs(props, "div");
  return <Component {...slot} {...rest} />;
}
