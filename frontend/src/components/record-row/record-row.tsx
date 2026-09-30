import type { ReactNode } from "react";
import { type DeleteProps, RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Rows } from "@/components/ui/rows/rows";
import { IconButtonSkeleton, TextSkeleton, rowWidth } from "@/components/ui/skeleton/skeleton";

const rowClass = "flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between";

interface Props extends DeleteProps {
  title: ReactNode;
  subtitle: ReactNode;
  note?: ReactNode;
  amount: ReactNode;
  label: string;
  onEdit?: () => void;
}

export function RecordRow({
  title,
  subtitle,
  note,
  amount,
  label,
  onEdit,
  ...deleteProps
}: Readonly<Props>) {
  return (
    <RowTransition>
      <li className={rowClass}>
        <div className="min-w-0 break-words">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
          {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="mr-2 font-semibold whitespace-nowrap tabular-nums">{amount}</span>
          <RowActions label={label} onEdit={onEdit} {...deleteProps}>
            {onEdit ? null : (
              <span
                className="size-8 shrink-0 max-sm:hidden pointer-coarse:size-11"
                aria-hidden="true"
              />
            )}
          </RowActions>
        </div>
      </li>
    </RowTransition>
  );
}

export function RecordRowsSkeleton({ rows = 3 }: Readonly<{ rows?: number }>) {
  return (
    <Rows data-slot="record-rows-skeleton" aria-hidden="true">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className={rowClass}>
          <div className="min-w-0 flex-1">
            <TextSkeleton size="sm" width={rowWidth(index)} />
            <TextSkeleton size="xs" width="w-1/3" />
          </div>
          <div className="flex items-center gap-1">
            <TextSkeleton className="mr-2" width="w-20" />
            <IconButtonSkeleton />
            <IconButtonSkeleton />
          </div>
        </li>
      ))}
    </Rows>
  );
}
