import { type ComponentProps, type ReactNode, useId } from "react";
import { type PolymorphicProps, splitAs } from "@/lib/polymorphic";
import { cn } from "@/lib/utils";
import type { Rows } from "../rows/rows";
import type { SplitColumns } from "../split-columns/split-columns";

const surface =
  "min-w-0 rounded-lg bg-muted/50 p-5 sm:p-6 dark:bg-card [:is([data-surface],[role=dialog])_&]:rounded-none [:is([data-surface],[role=dialog])_&]:bg-transparent [:is([data-surface],[role=dialog])_&]:p-0 dark:[:is([data-surface],[role=dialog])_&]:bg-transparent";

type SectionProps = PolymorphicProps<"section", "div" | "form" | typeof Rows | typeof SplitColumns>;

export function Section({ className, ...props }: Readonly<SectionProps>) {
  const slot = { "data-slot": "section", "data-surface": "", className: cn(surface, className) };

  const { Component, rest } = splitAs(props, "section");
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

interface TitledSectionProps {
  title: ReactNode;
  titleId?: string;
  description?: ReactNode;
  children: ReactNode;
}

export function TitledSection({
  title,
  titleId,
  description,
  children,
}: Readonly<TitledSectionProps>) {
  const generatedId = useId();
  const id = titleId ?? generatedId;

  return (
    <Section aria-labelledby={id}>
      <SectionTitle id={id}>{title}</SectionTitle>
      {description ? (
        <p id={`${id}-description`} className="mt-1 max-w-prose text-sm text-muted-foreground">
          {description}
        </p>
      ) : null}
      {children}
    </Section>
  );
}
