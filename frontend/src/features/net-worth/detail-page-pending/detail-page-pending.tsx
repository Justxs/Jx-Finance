import type { ReactNode } from "react";
import { PagePending } from "@/components/route-pending/route-pending";
import { Section } from "@/components/ui/section/section";
import { TextSkeleton } from "@/components/ui/skeleton/skeleton";

export function DetailPagePending({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <PagePending
      header={
        <div className="space-y-5">
          <TextSkeleton size="sm" width="w-32" />
          <TextSkeleton size="page" width="w-48" />
        </div>
      }
    >
      {children}
    </PagePending>
  );
}

const statGrids = {
  3: "grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3",
  4: "grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4",
} as const;

interface StatsProps {
  count: keyof typeof statGrids;
  details?: number;
}

export function DetailStatsSkeleton({ count, details = 0 }: Readonly<StatsProps>) {
  return (
    <div className={statGrids[count]}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="min-w-0">
          <TextSkeleton size="sm" width="w-28" />
          <TextSkeleton size="xl" className="mt-0.5" />
          {index < details ? <TextSkeleton size="xs" className="mt-0.5" width="w-20" /> : null}
        </div>
      ))}
    </div>
  );
}

export function DetailSummarySkeleton({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Section
      as="div"
      aria-hidden="true"
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end"
    >
      <div className="min-w-0">
        <TextSkeleton size="sm" width="w-28" />
        <TextSkeleton size="stat" className="mt-1" width="w-52" />
        <TextSkeleton size="sm" className="mt-1.5" width="w-40" />
      </div>
      {children}
    </Section>
  );
}
