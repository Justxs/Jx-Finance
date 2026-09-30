import { useTranslation } from "react-i18next";
import { z } from "zod";
import { closeMonthBodyNoteMax } from "@/api/schemas/month-close/month-close.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Modal } from "@/components/modal/modal";
import { optionalText } from "@/lib/validation";

interface FormProps {
  note: string;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  onSubmit: (note: string) => Promise<unknown>;
  onClose: () => void;
}

function NoteForm({ note, submitLabel, pending, error, onSubmit, onClose }: Readonly<FormProps>) {
  const { t } = useTranslation();
  const form = useServerForm({
    defaultValues: { note },
    schema: z.object({ note: optionalText(t, closeMonthBodyNoteMax) }),
    submit: (value) => onSubmit(value.note),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <form.Field name="note">
          {(field) => (
            <field.TextField
              id="month-close-note"
              label={t("monthClose.form.note")}
              hint={t("monthClose.form.noteHint")}
              maxLength={closeMonthBodyNoteMax}
              autoComplete="off"
            />
          )}
        </form.Field>
        <FormError error={error} />
        <form.FormActions pending={pending} submitLabel={submitLabel} onCancel={onClose} />
      </form.FormShell>
    </form.AppForm>
  );
}

interface Props extends FormProps {
  open: boolean;
  title: string;
  description?: string;
}

export function MonthNoteDialog({ open, title, description, ...form }: Readonly<Props>) {
  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.onClose();
        }
      }}
      title={title}
      description={description}
    >
      {open ? <NoteForm {...form} /> : null}
    </Modal>
  );
}
