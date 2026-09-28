import { Archive, EllipsisVertical, type LucideIcon, Pencil, Trash2, Unlink } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu/menu";
import { cn } from "@/lib/utils";

const removeKinds = {
  delete: { icon: Trash2, labelKey: "actions.delete" },
  archive: { icon: Archive, labelKey: "actions.archive" },
  unlink: { icon: Unlink, labelKey: "netWorth.payments.unlinkFromDebt" },
} as const;

const MENU_THRESHOLD = 3;

export interface RowAction {
  icon: LucideIcon;
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  pending?: boolean;
  destructive?: boolean;
}

export interface DeleteProps {
  onDelete?: () => void;
  deletePending?: boolean;
  deleteDisabled?: boolean;
  removeKind?: keyof typeof removeKinds;
}

interface Props extends DeleteProps {
  label: string;
  size?: "icon-sm" | "icon";
  actions?: readonly RowAction[];
  onEdit?: () => void;
  editDisabled?: boolean;
  className?: string;
  children?: ReactNode;
}

export function RowActions({
  label,
  size = "icon-sm",
  removeKind = "delete",
  actions,
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
  const all: RowAction[] = [...(actions ?? [])];
  if (onEdit) {
    all.push({ icon: Pencil, label: t("actions.edit"), onSelect: onEdit, disabled: editDisabled });
  }
  if (onDelete) {
    all.push({
      icon: RemoveIcon,
      label: t(removeLabelKey),
      onSelect: onDelete,
      disabled: deleteDisabled,
      pending: deletePending,
      destructive: true,
    });
  }

  return (
    <div className={cn("flex shrink-0 items-center gap-1", className)}>
      {children}
      {all.length >= MENU_THRESHOLD ? (
        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="ghost"
                size={size}
                pending={all.some((action) => action.pending)}
                aria-label={`${t("common.actions")}: ${label}`}
              />
            }
          >
            <EllipsisVertical />
          </MenuTrigger>
          <MenuContent>
            {all.map(({ icon: Icon, ...action }) => (
              <MenuItem
                key={action.label}
                destructive={action.destructive}
                disabled={action.disabled || action.pending}
                onClick={action.onSelect}
              >
                <Icon />
                {action.label}
              </MenuItem>
            ))}
          </MenuContent>
        </Menu>
      ) : (
        all.map(({ icon: Icon, ...action }) => (
          <Button
            key={action.label}
            variant="ghost"
            size={size}
            pending={action.pending}
            disabled={action.disabled}
            onClick={action.onSelect}
            aria-label={`${action.label}: ${label}`}
          >
            <Icon />
          </Button>
        ))
      )}
    </div>
  );
}
