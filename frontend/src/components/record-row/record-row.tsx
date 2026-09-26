import type { ReactNode } from "react";
import { type DeleteProps, RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";

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
      <li className="flex flex-col gap-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
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
