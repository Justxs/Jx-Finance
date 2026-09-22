import type { ReactNode } from "react";
import { RowActions } from "@/components/row-actions/row-actions";
import { RowTransition } from "@/components/row-transition/row-transition";

interface Props {
  title: ReactNode;
  subtitle: ReactNode;
  note?: ReactNode;
  amount: ReactNode;
  label: string;
  onEdit?: () => void;
  onDelete: () => void;
  deletePending: boolean;
  deleteDisabled: boolean;
}

export function RecordRow({
  title,
  subtitle,
  note,
  amount,
  label,
  onEdit,
  onDelete,
  deletePending,
  deleteDisabled,
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
          <RowActions
            label={label}
            onEdit={onEdit}
            onDelete={onDelete}
            deletePending={deletePending}
            deleteDisabled={deleteDisabled}
          />
        </div>
      </li>
    </RowTransition>
  );
}
