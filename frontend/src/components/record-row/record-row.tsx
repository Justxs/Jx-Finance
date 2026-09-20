import { Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";

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
  const { t } = useTranslation();

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
          {onEdit ? (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={onEdit}
              aria-label={`${t("actions.edit")}: ${label}`}
            >
              <Pencil />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon-sm"
            pending={deletePending}
            disabled={deleteDisabled}
            onClick={onDelete}
            aria-label={`${t("actions.delete")}: ${label}`}
          >
            <Trash2 />
          </Button>
        </div>
      </li>
    </RowTransition>
  );
}
