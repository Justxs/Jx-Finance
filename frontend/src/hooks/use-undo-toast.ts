import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useRestoreDeleted } from "@/api/generated";
import type { TrashKind } from "@/api/generated/model";

export function useUndoToast() {
  const { t } = useTranslation();
  const restore = useRestoreDeleted();

  return function showUndoToast(kind: TrashKind, entityId: string, label?: string) {
    toast.success(label ? t("trash.deletedNamed", { name: label }) : t("trash.deleted"), {
      action: {
        label: t("trash.undo"),
        onClick: () =>
          restore.mutate(
            { data: { kind, entityId } },
            { onSuccess: () => toast.success(t("trash.restored")) },
          ),
      },
    });
  };
}
