import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSetPayeeName } from "@/api/generated";
import { setPayeeNameBodyNameMax } from "@/api/schemas/payees/payees.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { silentMutation } from "@/lib/mutations";
import { requiredText } from "@/lib/validation";

interface Props {
  payee: string;
  initialName?: string | null;
  onClose: () => void;
}

export function PayeeNameForm({ payee, initialName, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const setName = useSetPayeeName({ mutation: { ...silentMutation, onSuccess: onClose } });

  const form = useServerForm({
    defaultValues: { name: initialName ?? "" },
    schema: z.object({ name: requiredText(t, setPayeeNameBodyNameMax) }),
    submit: (value) => setName.mutateAsync({ data: { payee, name: value.name.trim() } }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <form.Field name="name">
          {(field) => (
            <field.TextField
              id="payee-name"
              label={t("payees.name")}
              hint={t("payees.bankText", { text: payee })}
              autoFocus
            />
          )}
        </form.Field>

        <FormError error={setName.error} />

        <form.FormActions
          pending={setName.isPending}
          submitLabel={t("actions.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
