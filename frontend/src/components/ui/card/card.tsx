import type { ComponentProps } from "react";
import type { PolymorphicProps } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";

type Props = PolymorphicProps<"div", "section">;

export function Card({ as, className, ...props }: Readonly<Props>) {
  const Component = (as ?? "div") as "div";

  return (
    <Component
      data-slot="card"
      className={cn("min-w-0 rounded-md border bg-card text-card-foreground", className)}
      {...(props as ComponentProps<"div">)}
    />
  );
}
