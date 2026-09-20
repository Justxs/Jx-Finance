import type { PolymorphicProps } from "@/lib/polymorphic";
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

  if (props.as === "form") {
    const { as: Component, ...rest } = props;
    return <Component {...slot} {...rest} />;
  }

  const { as: Component = "div", ...rest } = props;
  return <Component {...slot} {...rest} />;
}
