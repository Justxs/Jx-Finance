import type { ReactNode } from "react";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Rows } from "@/components/ui/rows/rows";
import {
  IconButtonSkeleton,
  Skeleton,
  TextSkeleton,
  rowWidth,
} from "@/components/ui/skeleton/skeleton";

const gridClass =
  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]";
const actionsClass = "col-span-2 flex items-center justify-end sm:col-span-1";

interface Props {
  heading: ReactNode;
  meta: ReactNode;
  amount: ReactNode;
  actions: ReactNode;
}

export function BillRowLayout({ heading, meta, amount, actions }: Readonly<Props>) {
  return (
    <RowTransition>
      <li className="py-3">
        <div className={gridClass}>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">{heading}</div>
            {meta}
          </div>
          {amount}
          <div className={actionsClass}>{actions}</div>
        </div>
      </li>
    </RowTransition>
  );
}

interface SkeletonProps {
  rows: number;
  suggestion?: boolean;
}

export function BillRowsSkeleton({ rows, suggestion = false }: Readonly<SkeletonProps>) {
  return (
    <Rows aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="py-3">
          <div className={gridClass}>
            <div className="min-w-0">
              <TextSkeleton width={rowWidth(index)} />
              <TextSkeleton size="xs" width="w-3/4" />
              {suggestion ? <TextSkeleton size="xs" width="w-1/2" /> : null}
            </div>
            <TextSkeleton size="sm" className="justify-end" width="w-16" />
            <div className={actionsClass}>
              <Skeleton className="mr-2 h-8 w-28 rounded-lg sm:w-38 pointer-coarse:h-11" />
              <IconButtonSkeleton size="md" />
              {suggestion ? null : <IconButtonSkeleton size="md" />}
            </div>
          </div>
        </li>
      ))}
    </Rows>
  );
}
