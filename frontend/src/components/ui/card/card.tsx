import type { PolymorphicProps } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";

type Props = PolymorphicProps<"div", "section">;

export function Card({ className, ...props }: Readonly<Props>) {
  const slot = {
    "data-slot": "card",
    className: cn("min-w-0 rounded-md border bg-card text-card-foreground", className),
  };

  if (props.as === "section") {
    const { as: Component, ...rest } = props;
    return <Component {...slot} {...rest} />;
  }

  const { as: Component = "div", ...rest } = props;
  return <Component {...slot} {...rest} />;
}
