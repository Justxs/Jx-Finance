import type { ReactNode } from "react";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";

const panelClass = "py-2 sm:py-3";

interface Props {
  count: number;
  emptyText: string;
  children: ReactNode;
}

export function PanelRows({ count, emptyText, children }: Readonly<Props>) {
  if (count === 0) {
    return <EmptyText>{emptyText}</EmptyText>;
  }

  return (
    <Section as={Rows} className={panelClass}>
      {children}
    </Section>
  );
}

export function PanelRowsSkeleton({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Section as={Rows} className={panelClass} aria-hidden="true">
      {children}
    </Section>
  );
}
