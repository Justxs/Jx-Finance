import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSetupEndpoint } from "@/api/generated";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setSetupNeeded } from "@/lib/auth-gate";
import { isEmail } from "@/lib/validation";

interface FormValues {
  email: string;
  password: string;
  displayName: string;
}

export function SetupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const schema = z.object({
    email: z
      .string()
      .refine((value) => value.trim().length > 0, t("validation.required"))
      .refine((value) => isEmail(value.trim()), t("validation.email")),
    password: z
      .string()
      .min(8, t("validation.minLength", { min: 8 }))
      .max(100, t("validation.maxLength", { max: 100 })),
    displayName: z
      .string()
      .refine((value) => value.trim().length > 0, t("validation.required"))
      .refine((value) => value.trim().length <= 100, t("validation.maxLength", { max: 100 })),
  });

  const setupMutation = useSetupEndpoint({
    mutation: {
      onSuccess: () => {
        setSetupNeeded(false);
        navigate({ to: "/login" });
      },
    },
  });

  const defaultValues: FormValues = { email: "", password: "", displayName: "" };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      setupMutation.mutate({
        data: {
          email: value.email.trim(),
          password: value.password,
          displayName: value.displayName.trim(),
        },
      });
    },
  });

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex justify-center">
        <Brand size="lg" />
      </div>
      <div className="card p-6 sm:p-8">
        <h1 className="text-lg font-semibold">{t("auth.setupTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.setupSubtitle")}</p>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
          noValidate
          className="mt-6 space-y-4"
        >
          <form.Field name="displayName">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="setup-display-name">{t("auth.displayName")}</Label>
                <Input
                  id="setup-display-name"
                  autoComplete="name"
                  placeholder={t("auth.displayNamePlaceholder")}
                  value={field.value}
                  aria-invalid={field.errors.length > 0}
                  aria-describedby={
                    field.errors.length > 0 ? "setup-display-name-error" : undefined
                  }
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError id="setup-display-name-error" message={field.errors[0]?.message} />
              </div>
            )}
          </form.Field>

          <form.Field name="email">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="setup-email">{t("auth.email")}</Label>
                <Input
                  id="setup-email"
                  autoComplete="email"
                  type="email"
                  value={field.value}
                  aria-invalid={field.errors.length > 0}
                  aria-describedby={field.errors.length > 0 ? "setup-email-error" : undefined}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError id="setup-email-error" message={field.errors[0]?.message} />
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="setup-password">{t("auth.password")}</Label>
                <Input
                  id="setup-password"
                  autoComplete="new-password"
                  type="password"
                  value={field.value}
                  aria-invalid={field.errors.length > 0}
                  aria-describedby={field.errors.length > 0 ? "setup-password-error" : undefined}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError id="setup-password-error" message={field.errors[0]?.message} />
              </div>
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.canSubmit}>
            {(canSubmit) => (
              <Button
                type="submit"
                pending={setupMutation.isPending}
                disabled={!canSubmit}
                className="w-full"
              >
                {t("auth.createAdmin")}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </div>
  );
}
