import { useTranslation } from "react-i18next";
import { z } from "zod";
import { restoreBackupBodyPasswordMax } from "@/api/schemas/backups/backups.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog/alert-dialog";
import { Button } from "@/components/ui/button/button";
import { useRetained } from "@/hooks/use-retained";
import { hasServerErrorCode } from "@/lib/form-server-errors";
import { requiredValue } from "@/lib/validation";

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
    password: requiredValue(t).max(
      restoreBackupBodyPasswordMax,
      t("validation.maxLength", { max: restoreBackupBodyPasswordMax }),
    ),
  });

  const form = useServerForm({
    defaultValues: { confirmation: "", password: "" },
    schema,
    submit: async (value, formApi) => {
      try {
        await onRestore(value.password);
      } catch (failure) {
        if (hasServerErrorCode(failure, "password.incorrect")) {
          formApi.setFieldValue("password", "");
        }
        throw failure;
      }
    },
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
        <AlertDialogHeader>
          <AlertDialogTitle>{t("backup.confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="mb-1 block font-medium wrap-break-word text-foreground">
              {shownLabel}
            </span>
            {t("backup.confirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {backupId === null ? null : (
          <RestoreBackupForm key={backupId} error={error} pending={pending} onRestore={onRestore} />
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
