import type { ReactNode } from "react";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";

interface Props {
  title: string;
  count: number;
  description?: string;
  emptyText: string;
  children: ReactNode;
}

export function ListSection({ title, count, description, emptyText, children }: Readonly<Props>) {
  return (
    <Section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <SectionTitle>{title}</SectionTitle>
        <span className="text-sm text-muted-foreground tabular-nums">{count}</span>
      </div>
      {description ? (
        <p className="mb-3 max-w-prose text-sm text-muted-foreground">{description}</p>
      ) : null}
      {count === 0 ? <EmptyText>{emptyText}</EmptyText> : <Rows>{children}</Rows>}
    </Section>
  );
}
