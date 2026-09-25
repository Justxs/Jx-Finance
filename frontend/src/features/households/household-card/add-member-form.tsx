import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useAddMember } from "@/api/generated";
import { HouseholdRole } from "@/api/generated/model";
import { addMemberBodyEmailMax } from "@/api/schemas/households/households.zod";
import { useServerForm } from "@/components/form";
import { Button } from "@/components/ui/button/button";
import { requiredEmail } from "@/lib/validation";
import { householdRoleOptions } from "../household-roles";

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

  const addMutation = useAddMember({ mutation: { onSuccess: onClose } });

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
      <form.FormShell className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <form.Field name="email">
          {(field) => (
            <field.TextField
              id={`member-email-${householdId}`}
              className="flex-1"
              placeholder={t("households.memberEmailPlaceholder")}
            />
          )}
        </form.Field>

        <form.Field name="role">
          {(field) => (
            <field.SelectFieldControl
              id={`member-role-${householdId}`}
              aria-label={t("users.role")}
              className="min-w-0"
              fitContent
              options={householdRoleOptions(t, ["member", "owner"])}
            />
          )}
        </form.Field>

        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          {t("actions.cancel")}
        </Button>

        <form.SubmitButton size="sm" pending={addMutation.isPending}>
          {t("households.addMember")}
        </form.SubmitButton>
      </form.FormShell>
    </form.AppForm>
  );
}
