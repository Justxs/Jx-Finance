import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useAddMember } from "@/api/generated";
import type { HouseholdRole } from "@/api/generated/model";
import { addMemberBodyEmailMax } from "@/api/schemas/households/households.zod";
import { useAppForm } from "@/components/form";
import { Button } from "@/components/ui/button";
import { submitToServer } from "@/lib/form-server-errors";
import { requiredEmail } from "@/lib/validation";

interface FormValues {
  email: string;
  role: HouseholdRole;
}

interface Props {
  householdId: string;
  onAdded: () => void;
  onCancel?: () => void;
}

export function AddMemberForm({ householdId, onAdded, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    email: requiredEmail(t).max(
      addMemberBodyEmailMax,
      t("validation.maxLength", { max: addMemberBodyEmailMax }),
    ),
    role: z.enum(["owner", "member"]),
  });

  const addMutation = useAddMember({ mutation: { onSuccess: onAdded } });

  const defaultValues: FormValues = { email: "", role: "member" };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;

      return submitToServer(submission, () =>
        addMutation.mutateAsync({
          id: householdId,
          data: { email: value.email.trim(), role: value.role },
        }),
      );
    },
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
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
      >
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
              selectClassName="sm:w-auto"
              options={[
                { value: "member", label: t("households.roles.member") },
                { value: "owner", label: t("households.roles.owner") },
              ]}
            />
          )}
        </form.Field>

        {onCancel ? (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        ) : null}

        <form.SubmitButton size="sm" pending={addMutation.isPending}>
          {t("households.addMember")}
        </form.SubmitButton>
      </form>
    </form.AppForm>
  );
}
