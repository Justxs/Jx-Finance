import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useUpdateBackup } from "@/api/generated";
import type { BackupResponse } from "@/api/generated/model";
import { updateBackupBodyNoteMax } from "@/api/schemas/backups/backups.zod";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { submitToServer } from "@/lib/form-server-errors";
import { optionalText } from "@/lib/validation";

interface Props {
  backup: BackupResponse;
  onSaved: () => void;
  onCancel: () => void;
}

export function BackupNoteForm({ backup, onSaved, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = z.object({ note: optionalText(t, updateBackupBodyNoteMax) });

  const updateMutation = useUpdateBackup({
    mutation: { meta: { silent: true }, onSuccess: onSaved },
  });

  const form = useAppForm({
    defaultValues: { note: backup.note ?? "" },
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) =>
      submitToServer(submission, () =>
        updateMutation.mutateAsync({
          id: backup.id,
          data: { note: submission.value.note.trim() || null },
        }),
      ),
  });

  return (
    <form.AppForm>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
        className="space-y-4"
      >
        <form.Field name="note">
          {(field) => (
            <field.TextField
              id="backup-note-edit"
              label={t("backup.note")}
              placeholder={t("backup.notePlaceholder")}
              autoFocus
            />
          )}
        </form.Field>
        <FormError error={updateMutation.error} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={updateMutation.isPending}>
            {t("actions.save")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
