import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface Props<T> {
  target: T | null;
  onCancel: () => void;
  onConfirm: (target: T) => void;
}

export function ConfirmDeleteDialog<T>({ target, onCancel, onConfirm }: Readonly<Props<T>>) {
  const { t } = useTranslation();

  function handleConfirm() {
    if (target === null) return;
    onConfirm(target);
    onCancel();
  }

  return (
    <Dialog
      open={target !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
      title={t("confirmDelete.title")}
      description={t("confirmDelete.description")}
      className="max-w-sm"
    >
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <Button variant="destructive" onClick={handleConfirm}>
          {t("actions.delete")}
        </Button>
      </div>
    </Dialog>
  );
}
