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
import { Input } from "@/components/ui/input";

interface Props {
  label: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RestoreBackupDialog({ label, onCancel, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  const [typed, setTyped] = useState("");
  const [shownLabel, setShownLabel] = useState(label);
  const confirmWord = t("backup.confirmWord");

  if (label !== null && label !== shownLabel) {
    setShownLabel(label);
  }

  function close() {
    setTyped("");
    onCancel();
  }

  return (
    <AlertDialog
      open={label !== null}
      onOpenChange={(open) => {
        if (!open) {
          close();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("backup.confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="mb-1 block font-medium wrap-break-word text-foreground">
              {shownLabel}
            </span>
            {t("backup.confirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="backup-confirm">
            {t("backup.confirmLabel", { word: confirmWord })}
          </label>
          <Input
            id="backup-confirm"
            autoComplete="off"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("actions.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={typed.trim() !== confirmWord}
            onClick={() => {
              onConfirm();
              close();
            }}
          >
            {t("backup.confirmAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
