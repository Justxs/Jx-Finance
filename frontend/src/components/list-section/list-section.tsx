import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";

interface Props {
  title: string;
  count: number;
  description?: string;
  emptyText: string;
  action?: ReactNode;
  children: ReactNode;
}

export function ListSection({
  title,
  count,
  description,
  emptyText,
  action,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Section>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <SectionTitle>{title}</SectionTitle>
        <div className="flex items-center gap-3">
          {action}
          <span className="text-sm text-muted-foreground tabular-nums">
            <span aria-hidden="true">{count}</span>
            <span className="sr-only">{t("common.itemCount", { count })}</span>
          </span>
        </div>
      </div>
      {description ? (
        <p className="mb-3 max-w-prose text-sm text-muted-foreground">{description}</p>
      ) : null}
      {count === 0 ? <EmptyText>{emptyText}</EmptyText> : <Rows>{children}</Rows>}
    </Section>
  );
}

interface SkeletonProps {
  description?: boolean;
  children: ReactNode;
}

export function ListSectionSkeleton({ description = false, children }: Readonly<SkeletonProps>) {
  return (
    <Section data-slot="list-section-skeleton" aria-hidden="true">
      <div className="mb-2 flex items-center justify-between gap-3">
        <TextSkeleton size="title" width="w-36" />
        <TextSkeleton size="sm" width="w-5" />
      </div>
      {description ? <TextSkeleton size="sm" className="mb-3" width="w-3/4 max-w-prose" /> : null}
      {children}
    </Section>
  );
}
