import { ButtonSkeleton, Skeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { type PolymorphicProps, splitAs } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";

const formGridClass =
  "grid grid-cols-[repeat(auto-fit,minmax(min(100%,13rem),1fr))] items-start gap-4 [:where(&>*)]:min-w-0";

type Props = PolymorphicProps<"div", "form">;

export function FormGrid({ className, ...props }: Readonly<Props>) {
  const slot = { "data-slot": "form-grid", className: cn(formGridClass, className) };

  const { Component, rest } = splitAs(props, "div");
  return <Component {...slot} {...rest} />;
}

interface SkeletonProps {
  fields?: number;
  actions?: number;
  hints?: boolean;
  className?: string;
}

export function FormGridSkeleton({
  fields = 4,
  actions = 0,
  hints = false,
  className,
}: Readonly<SkeletonProps>) {
  return (
    <div data-slot="form-grid-skeleton" aria-hidden="true" className={cn(formGridClass, className)}>
      {Array.from({ length: fields }, (_, index) => (
        <div key={index} className="space-y-1.5">
          <TextSkeleton size="label" />
          <Skeleton className="h-9 w-full rounded-lg pointer-coarse:h-11" />
          {hints ? <TextSkeleton size="xs" width="w-4/5" /> : null}
        </div>
      ))}
      {actions > 0 ? (
        <div className="col-span-full flex justify-end gap-2 pt-2">
          {Array.from({ length: actions }, (_, index) => (
            <ButtonSkeleton key={index} className="w-20" />
          ))}
        </div>
      ) : null}
    </div>
  );
}
