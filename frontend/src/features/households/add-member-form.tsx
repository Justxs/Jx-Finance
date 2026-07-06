import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useAddMemberEndpoint } from "@/api/generated";
import type { HouseholdRole } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface FormValues {
  email: string;
  role: HouseholdRole;
}

interface Props {
  householdId: string;
  onAdded: () => void;
}

export function AddMemberForm({ householdId, onAdded }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    email: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .regex(/^\S+@\S+$/, t("validation.email")),
    role: z.enum(["owner", "member"]),
  });

  const addMutation = useAddMemberEndpoint({ mutation: { onSuccess: onAdded } });

  const defaultValues: FormValues = { email: "", role: "member" };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      addMutation.mutate({
        id: householdId,
        data: { email: value.email.trim(), role: value.role },
      });
      form.reset();
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
      className="flex items-end gap-2"
    >
      <form.Field name="email">
        {(field) => (
          <div className="flex-1 space-y-1.5">
            <Input
              placeholder={t("households.memberEmailPlaceholder")}
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="role">
        {(field) => (
          <Select
            value={field.state.value}
            onChange={(e) => field.handleChange(e.target.value as HouseholdRole)}
          >
            <option value="member">{t("households.roles.member")}</option>
            <option value="owner">{t("households.roles.owner")}</option>
          </Select>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.canSubmit}>
        {(canSubmit) => (
          <Button type="submit" size="sm" disabled={addMutation.isPending || !canSubmit}>
            {t("households.addMember")}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
