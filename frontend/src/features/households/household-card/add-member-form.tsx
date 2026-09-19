import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useAddMemberEndpoint } from "@/api/generated";
import type { HouseholdRole } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { isEmail } from "@/lib/validation";

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
    email: z
      .string()
      .refine((value) => value.trim().length > 0, t("validation.required"))
      .refine((value) => isEmail(value.trim()), t("validation.email")),
    role: z.enum(["owner", "member"]),
  });

  const addMutation = useAddMemberEndpoint({ mutation: { onSuccess: onAdded } });

  const defaultValues: FormValues = { email: "", role: "member" };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      addMutation.mutate({
        id: householdId,
        data: { email: value.email.trim(), role: value.role },
      });
    },
  });

  return (
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
          <div className="flex-1 space-y-1.5">
            <Input
              placeholder={t("households.memberEmailPlaceholder")}
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={
                field.errors.length > 0 ? `member-email-${householdId}-error` : undefined
              }
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError
              id={`member-email-${householdId}-error`}
              message={field.errors[0]?.message}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="role">
        {(field) => (
          <SelectField
            aria-label={t("users.role")}
            value={field.value}
            className="sm:w-auto"
            onChange={(value) => field.handleChange(value)}
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

      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button type="submit" size="sm" pending={addMutation.isPending} disabled={!canSubmit}>
            {t("households.addMember")}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
