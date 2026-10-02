import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useAddMember } from "@/api/generated";
import { HouseholdRole } from "@/api/generated/model";
import { addMemberBodyEmailMax } from "@/api/schemas/households/households.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { householdRoleOptions } from "@/features/households/household-roles";
import { silentMutation } from "@/lib/mutations";
import { requiredEmail } from "@/lib/validation";

interface FormValues {
  email: string;
  role: HouseholdRole;
}

interface Props {
  householdId: string;
  onClose: () => void;
}

export function AddMemberForm({ householdId, onClose }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    email: requiredEmail(t, addMemberBodyEmailMax),
    role: z.enum(HouseholdRole),
  });

  const addMutation = useAddMember({ mutation: { ...silentMutation, onSuccess: onClose } });

  const defaultValues: FormValues = { email: "", role: "member" };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      addMutation.mutateAsync({
        id: householdId,
        data: { email: value.email.trim(), role: value.role },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <FormGrid>
          <form.Field name="email">
            {(field) => (
              <field.TextField
                id={`member-email-${householdId}`}
                label={t("users.email")}
                type="email"
                placeholder={t("households.memberEmailPlaceholder")}
              />
            )}
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <field.SelectFieldControl
                id={`member-role-${householdId}`}
                label={t("users.role")}
                options={householdRoleOptions(t, ["member", "owner"])}
              />
            )}
          </form.Field>
        </FormGrid>

        <FormError error={addMutation.error} />

        <form.FormActions
          pending={addMutation.isPending}
          submitLabel={t("households.addMember")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
