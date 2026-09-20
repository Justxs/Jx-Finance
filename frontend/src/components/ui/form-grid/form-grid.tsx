import type { ComponentProps } from "react";
import type { PolymorphicProps } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";

type Props = PolymorphicProps<"div", "form">;

export function FormGrid({ as, className, ...props }: Readonly<Props>) {
  const Component = (as ?? "div") as "div";

  return (
    <Component
      data-slot="form-grid"
      className={cn(
        "grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] items-start gap-4 [:where(&>*)]:min-w-0",
        className,
      )}
      {...(props as ComponentProps<"div">)}
    />
  );
}
