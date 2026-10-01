import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateContact, useUpdateContact } from "@/api/generated";
import type { ContactResponse } from "@/api/generated/model";
import { createContactBodyNameMax } from "@/api/schemas/contacts/contacts.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { silentMutation, upsert } from "@/lib/mutations";
import { requiredText } from "@/lib/validation";

interface Props {
  initial?: ContactResponse;
  onClose: () => void;
}

export function ContactForm({ initial, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = z.object({ name: requiredText(t, createContactBodyNameMax) });
  const { create, update, pending, error } = upsert(
    useCreateContact({ mutation: { ...silentMutation, onSuccess: onClose } }),
    useUpdateContact({ mutation: { ...silentMutation, onSuccess: onClose } }),
  );

  const form = useServerForm({
    defaultValues: { name: initial?.name ?? "" },
    schema,
    submit: (value) => {
      const data = { name: value.name.trim() };
      return initial ? update({ id: initial.id, data }) : create({ data });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="contact-name"
              label={t("households.people.name")}
              placeholder={t("households.people.namePlaceholder")}
              autoFocus
            />
          )}
        </form.Field>

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("households.people.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
