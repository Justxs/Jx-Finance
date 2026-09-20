import type { ComponentProps, ReactNode } from "react";
import { type PolymorphicProps, rendersAs } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";
import { Rows } from "../rows/rows";
import { SplitColumns } from "../split-columns/split-columns";

const surface =
  "min-w-0 rounded-lg bg-muted/50 p-5 sm:p-6 dark:bg-card [:is([data-surface],[role=dialog])_&]:rounded-none [:is([data-surface],[role=dialog])_&]:bg-transparent [:is([data-surface],[role=dialog])_&]:p-0 dark:[:is([data-surface],[role=dialog])_&]:bg-transparent";

type PanelProps = PolymorphicProps<"div", "section" | typeof Rows | typeof SplitColumns>;

export function Panel({ className, ...props }: Readonly<PanelProps>) {
  const slot = { "data-slot": "panel", "data-surface": "", className: cn(surface, className) };

  if (rendersAs(props, Rows)) {
    const { as: Component, ...rest } = props;
    return <Component {...slot} {...rest} />;
  }

  if (rendersAs(props, SplitColumns)) {
    const { as: Component, ...rest } = props;
    return <Component {...slot} {...rest} />;
  }

  if (props.as === "section") {
    const { as: Component, ...rest } = props;
    return <Component {...slot} {...rest} />;
  }

  const { as: Component = "div", ...rest } = props;
  return <Component {...slot} {...rest} />;
}

type SectionProps = PolymorphicProps<"section", "div" | "form">;

export function Section({ className, ...props }: Readonly<SectionProps>) {
  const slot = { "data-slot": "section", "data-surface": "", className: cn(surface, className) };

  if (props.as === "div") {
    const { as: Component, ...rest } = props;
    return <Component {...slot} {...rest} />;
  }

  if (props.as === "form") {
    const { as: Component, ...rest } = props;
    return <Component {...slot} {...rest} />;
  }

  const { as: Component = "section", ...rest } = props;
  return <Component {...slot} {...rest} />;
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

interface SectionHeaderProps {
  title: ReactNode;
  titleClassName?: string;
  children?: ReactNode;
}

export function SectionHeader({ title, titleClassName, children }: Readonly<SectionHeaderProps>) {
  return (
    <div
      data-slot="section-header"
      className="mb-2 flex flex-wrap items-center justify-between gap-3"
    >
      <SectionTitle className={titleClassName}>{title}</SectionTitle>
      {children}
    </div>
  );
}
