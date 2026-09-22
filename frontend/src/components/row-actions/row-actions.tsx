import { Archive, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { cn } from "@/lib/utils";

const removeKinds = {
  delete: { icon: Trash2, labelKey: "actions.delete" },
  archive: { icon: Archive, labelKey: "actions.archive" },
} as const;

interface Props {
  label: string;
  size?: "icon-sm" | "icon";
  removeKind?: keyof typeof removeKinds;
  onEdit?: () => void;
  onDelete?: () => void;
  editDisabled?: boolean;
  deletePending?: boolean;
  deleteDisabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function RowActions({
  label,
  size = "icon-sm",
  removeKind = "delete",
  onEdit,
  onDelete,
  editDisabled = false,
  deletePending = false,
  deleteDisabled = false,
  className,
  children,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { icon: RemoveIcon, labelKey: removeLabelKey } = removeKinds[removeKind];

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      {children}
      {onEdit ? (
        <Button
          variant="ghost"
          size={size}
          disabled={editDisabled}
          onClick={onEdit}
          aria-label={`${t("actions.edit")}: ${label}`}
        >
          <Pencil />
        </Button>
      ) : null}
      {onDelete ? (
        <Button
          variant="ghost"
          size={size}
          pending={deletePending}
          disabled={deleteDisabled}
          onClick={onDelete}
          aria-label={`${t(removeLabelKey)}: ${label}`}
        >
          <RemoveIcon />
        </Button>
      ) : null}
    </div>
  );
}
