import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Props<T> {
  target: T | null;
  itemLabel?: string;
  onCancel: () => void;
  onConfirm: (target: T) => void;
}

export function ConfirmDeleteDialog<T>({
  target,
  itemLabel,
  onCancel,
  onConfirm,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const [shownLabel, setShownLabel] = useState(itemLabel);

  if (target !== null && itemLabel !== shownLabel) {
    setShownLabel(itemLabel);
  }

  function handleConfirm() {
    if (target === null) {
      return;
    }
    onConfirm(target);
    onCancel();
  }

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmDelete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {shownLabel ? (
              <span className="mb-1 block font-medium wrap-break-word text-foreground">
                {shownLabel}
              </span>
            ) : null}
            {t("confirmDelete.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            {t("actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
