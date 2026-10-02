import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";

interface Props {
  id: string;
  submitLabel: string;
  variant?: "default" | "outline" | "destructive";
  pending: boolean;
  error: unknown;
  message?: string;
  onSubmit: (password: string) => Promise<unknown>;
}

export function PasswordPrompt({
  id,
  submitLabel,
  variant = "default",
  pending,
  error,
  message,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const form = useServerForm({
    defaultValues: { password: "" },
    schema: z.object({ password: z.string() }),
    submit: async (value, formApi) => {
      try {
        await onSubmit(value.password);
      } finally {
        formApi.setFieldValue("password", "");
      }
    },
  });

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4 *:max-w-md">
        <form.Field name="password">
          {(field) => (
            <field.TextField
              id={id}
              label={t("profile.currentPassword")}
              type="password"
              autoComplete="current-password"
            />
          )}
        </form.Field>

        <FormError error={error} message={message} />

        <form.FormActions>
          <form.Subscribe selector={(state) => state.values.password !== ""}>
            {(ready) => (
              <form.SubmitButton variant={variant} pending={pending} disabled={!ready}>
                {submitLabel}
              </form.SubmitButton>
            )}
          </form.Subscribe>
        </form.FormActions>
      </form.FormShell>
    </form.AppForm>
  );
}
