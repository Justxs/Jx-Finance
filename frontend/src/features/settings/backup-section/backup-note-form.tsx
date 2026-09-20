import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useUpdateBackup } from "@/api/generated";
import type { BackupResponse } from "@/api/generated/model";
import { updateBackupBodyNoteMax } from "@/api/schemas/backups/backups.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { silent } from "@/lib/mutations";
import { optionalText } from "@/lib/validation";

interface Props {
  backup: BackupResponse;
  onSaved: () => void;
  onCancel: () => void;
}

export function BackupNoteForm({ backup, onSaved, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = z.object({ note: optionalText(t, updateBackupBodyNoteMax) });

  const updateMutation = useUpdateBackup(silent({ onSuccess: onSaved }));

  const form = useServerForm({
    defaultValues: { note: backup.note ?? "" },
    schema,
    submit: (value) =>
      updateMutation.mutateAsync({
        id: backup.id,
        data: { note: value.note.trim() || null },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
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
        <form.FormActions
          pending={updateMutation.isPending}
          submitLabel={t("actions.save")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
