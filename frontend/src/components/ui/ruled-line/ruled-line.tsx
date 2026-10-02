import { type PolymorphicProps, splitAs } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";

type RuledLineProps = PolymorphicProps<"div", "p" | "dl"> & {
  tone?: "hairline" | "ink";
};

export function RuledLine({ tone = "hairline", className, ...props }: Readonly<RuledLineProps>) {
  const { Component, rest } = splitAs(props, "div");
  return (
    <Component
      data-slot="ruled-line"
      className={cn("border-y py-2.5 text-sm", tone === "ink" && "border-rule", className)}
      {...rest}
    />
  );
}
