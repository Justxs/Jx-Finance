import { DatabaseBackup } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { useCreateBackup } from "@/api/generated";
import { createBackupBodyNoteMax } from "@/api/schemas/backups/backups.zod";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { submitToServer } from "@/lib/form-server-errors";
import { silent } from "@/lib/mutations";
import { optionalText } from "@/lib/validation";

export function CreateBackupForm() {
  const { t } = useTranslation();
  const schema = z.object({ note: optionalText(t, createBackupBodyNoteMax) });

  const createMutation = useCreateBackup(
    silent({
      onSuccess: () => {
        toast.success(t("backup.created"));
      },
    }),
  );

  const form = useAppForm({
    defaultValues: { note: "" },
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: async (submission) => {
      await submitToServer(submission, () =>
        createMutation.mutateAsync({ data: { note: submission.value.note.trim() || null } }),
      );
      submission.formApi.reset();
    },
  });

  return (
    <form.AppForm>
      <form.FormShell className="flex max-w-xl flex-wrap items-start gap-2">
        <form.Field name="note">
          {(field) => (
            <field.TextField
              id="backup-note"
              aria-label={t("backup.note")}
              placeholder={t("backup.notePlaceholder")}
              className="min-w-56 flex-1"
            />
          )}
        </form.Field>
        <form.SubmitButton pending={createMutation.isPending}>
          <DatabaseBackup />
          {t("backup.create")}
        </form.SubmitButton>
        <FormError error={createMutation.error} className="w-full" />
      </form.FormShell>
    </form.AppForm>
  );
}
