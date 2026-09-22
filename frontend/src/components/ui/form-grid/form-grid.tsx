import { type PolymorphicProps, splitAs } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";

type Props = PolymorphicProps<"div", "form">;

export function FormGrid({ className, ...props }: Readonly<Props>) {
  const slot = {
    "data-slot": "form-grid",
    className: cn(
      "grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] items-start gap-4 [:where(&>*)]:min-w-0",
      className,
    ),
  };

  const { Component, rest } = splitAs(props, "div");
  return <Component {...slot} {...rest} />;
}
