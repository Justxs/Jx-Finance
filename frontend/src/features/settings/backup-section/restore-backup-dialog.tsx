import { useTranslation } from "react-i18next";
import { z } from "zod";
import { restoreBackupBodyPasswordMax } from "@/api/schemas/backups/backups.zod";
import { ConfirmDialogHeader } from "@/components/confirm-delete-dialog/confirm-delete-dialog";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog/alert-dialog";
import { Button } from "@/components/ui/button/button";
import { useRetained } from "@/hooks/use-retained";
import { clearingWrongPassword } from "@/lib/form-server-errors";
import { requiredMax } from "@/lib/validation";

interface FormProps {
  error: unknown;
  pending: boolean;
  onRestore: (password: string) => Promise<unknown>;
}

interface Props extends FormProps {
  backupId: string | null;
  label: string | null;
  onCancel: () => void;
}

function RestoreBackupForm({ error, pending, onRestore }: Readonly<FormProps>) {
  const { t } = useTranslation();
  const confirmWord = t("backup.confirmWord");

  const schema = z.object({
    confirmation: z.string(),
    password: requiredMax(t, restoreBackupBodyPasswordMax),
  });

  const form = useServerForm({
    defaultValues: { confirmation: "", password: "" },
    schema,
    submit: (value, formApi) =>
      clearingWrongPassword(formApi, "password", () => onRestore(value.password)),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <form.Field name="confirmation">
          {(field) => (
            <field.TextField
              id="backup-confirm"
              label={t("backup.confirmLabel", { word: confirmWord })}
              autoComplete="off"
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <field.TextField
              id="backup-confirm-password"
              label={t("profile.currentPassword")}
              hint={t("backup.confirmPasswordHint")}
              type="password"
              autoComplete="current-password"
              touchedOnly
            />
          )}
        </form.Field>

        <FormError error={error} />

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{t("actions.cancel")}</AlertDialogCancel>
          <form.Subscribe
            selector={(state) =>
              state.values.confirmation.trim() === confirmWord && state.values.password !== ""
            }
          >
            {(ready) => (
              <Button type="submit" variant="destructive" pending={pending} disabled={!ready}>
                {t("backup.confirmAction")}
              </Button>
            )}
          </form.Subscribe>
        </AlertDialogFooter>
      </form.FormShell>
    </form.AppForm>
  );
}

export function RestoreBackupDialog({
  backupId,
  label,
  error,
  pending,
  onCancel,
  onRestore,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const shownLabel = useRetained(label);

  return (
    <AlertDialog
      open={label !== null}
      onOpenChange={(open) => {
        if (!open && !pending) {
          onCancel();
        }
      }}
    >
      <AlertDialogContent>
        <ConfirmDialogHeader
          title={t("backup.confirmTitle")}
          label={shownLabel}
          description={t("backup.confirmDescription")}
        />
        {backupId === null ? null : (
          <RestoreBackupForm key={backupId} error={error} pending={pending} onRestore={onRestore} />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
