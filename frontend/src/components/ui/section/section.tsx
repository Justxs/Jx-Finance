import type { ComponentProps } from "react";
import type { PolymorphicProps } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";
import type { Rows } from "../rows";
import type { SplitColumns } from "../split-columns";

const surface =
  "min-w-0 rounded-lg bg-muted/50 p-5 sm:p-6 dark:bg-card [:is([data-surface],[role=dialog])_&]:rounded-none [:is([data-surface],[role=dialog])_&]:bg-transparent [:is([data-surface],[role=dialog])_&]:p-0 dark:[:is([data-surface],[role=dialog])_&]:bg-transparent";

type PanelProps = PolymorphicProps<"div", "section" | typeof Rows | typeof SplitColumns>;

export function Panel({ as, className, ...props }: Readonly<PanelProps>) {
  const Component = (as ?? "div") as "div";

  return (
    <Component
      data-slot="panel"
      data-surface=""
      className={cn(surface, className)}
      {...(props as ComponentProps<"div">)}
    />
  );
}

type SectionProps = PolymorphicProps<"section", "div" | "form">;

export function Section({ as, className, ...props }: Readonly<SectionProps>) {
  const Component = (as ?? "section") as "div";

  return (
    <Component
      data-slot="section"
      data-surface=""
      className={cn(surface, className)}
      {...(props as ComponentProps<"div">)}
    />
  );
}

export function SectionTitle({ className, children, ...props }: Readonly<ComponentProps<"h2">>) {
  return (
    <h2
      data-slot="section-title"
      className={cn("text-lg leading-6 font-semibold", className)}
      {...props}
    >
      {children}
    </h2>
  );
}
