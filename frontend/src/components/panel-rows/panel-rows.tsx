import type { ReactNode } from "react";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section } from "@/components/ui/section/section";

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
    <Section as={Rows} className="py-2 sm:py-3">
      {children}
    </Section>
  );
}
