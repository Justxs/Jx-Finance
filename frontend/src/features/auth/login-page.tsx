import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useLoginEndpoint } from "@/api/generated";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setAuthenticated } from "@/lib/auth-gate";

interface FormValues {
  email: string;
  password: string;
  rememberMe: boolean;
  twoFactorCode: string;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  const schema = z.object({
    email: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .regex(/^[^\s@]+@[^\s@]+$/, t("validation.email")),
    password: z.string().min(1, t("validation.required")),
    rememberMe: z.boolean(),
    twoFactorCode: twoFactorRequired ? z.string().min(1, t("validation.required")) : z.string(),
  });

  const loginMutation = useLoginEndpoint({
    mutation: {
      onSuccess: (data) => {
        if (data.twoFactorRequired) {
          setTwoFactorRequired(true);
          return;
        }
        setAuthenticated(true);
        navigate({ to: "/" });
      },
    },
  });

  const defaultValues: FormValues = {
    email: "",
    password: "",
    rememberMe: false,
    twoFactorCode: "",
  };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      loginMutation.mutate({
        data: {
          email: value.email.trim(),
          password: value.password,
          rememberMe: value.rememberMe,
          twoFactorCode: value.twoFactorCode || null,
        },
      });
    },
  });

  return (
    <div className="card w-full max-w-sm p-6">
      <h1 className="text-xl font-semibold tracking-tight">{t("auth.signIn")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("auth.signInSubtitle")}</p>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
        className="mt-6 space-y-4"
      >
        <form.Field name="email">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="login-email">{t("auth.email")}</Label>
              <Input
                id="login-email"
                type="email"
                autoFocus={!twoFactorRequired}
                disabled={twoFactorRequired}
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError message={field.state.meta.errors[0]?.message} />
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="login-password">{t("auth.password")}</Label>
              <Input
                id="login-password"
                type="password"
                disabled={twoFactorRequired}
                value={field.state.value}
                aria-invalid={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError message={field.state.meta.errors[0]?.message} />
            </div>
          )}
        </form.Field>

        {twoFactorRequired ? (
          <form.Field name="twoFactorCode">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="login-two-factor-code">{t("auth.twoFactorCode")}</Label>
                <Input
                  id="login-two-factor-code"
                  autoFocus
                  inputMode="numeric"
                  value={field.state.value}
                  aria-invalid={field.state.meta.errors.length > 0}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                <FieldError message={field.state.meta.errors[0]?.message} />
                <p className="text-xs text-muted-foreground">{t("auth.twoFactorCodeHint")}</p>
              </div>
            )}
          </form.Field>
        ) : (
          <form.Field name="rememberMe">
            {(field) => (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={field.state.value}
                  onCheckedChange={(checked) => field.handleChange(checked)}
                />
                {t("auth.rememberMe")}
              </label>
            )}
          </form.Field>
        )}

        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button
              type="submit"
              pending={loginMutation.isPending}
              disabled={!canSubmit}
              className="w-full"
            >
              {twoFactorRequired ? t("auth.verifyCode") : t("auth.signIn")}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
