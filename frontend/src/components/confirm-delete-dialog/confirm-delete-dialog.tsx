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
} from "@/components/ui/alert-dialog/alert-dialog";
import { useRetained } from "@/hooks/use-retained";

interface Props<T> {
  target: T | null;
  itemLabel?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (target: T) => void;
}

export function ConfirmDeleteDialog<T>({
  target,
  itemLabel,
  title,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const shownLabel = useRetained(itemLabel, target === null);

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
          <AlertDialogTitle>{title ?? t("confirmDelete.title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {shownLabel ? (
              <span className="mb-1 block font-medium wrap-break-word text-foreground">
                {shownLabel}
              </span>
            ) : null}
            {description ?? t("confirmDelete.description")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>
            {confirmLabel ?? t("actions.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
