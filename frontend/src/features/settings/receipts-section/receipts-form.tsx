import { KeyRound } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { ReceiptSettingsResponse, UpdateReceiptSettingsRequest } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { optionsOf } from "@/lib/options";
import { optionalText, wholeNumberBetween } from "@/lib/validation";

export const RECEIPT_MODELS = ["claude-sonnet-5", "claude-haiku-4-5", "claude-opus-5-5"] as const;

const MONTHLY_LIMIT_MAX = 10000;

interface FormValues {
  enabled: boolean;
  apiKey: string;
  model: string;
  monthlyLimit: string;
}

interface Props {
  settings: ReceiptSettingsResponse;
  pending: boolean;
  testPending: boolean;
  testError: unknown;
  onSubmit: (values: UpdateReceiptSettingsRequest, onSaved: () => void) => Promise<unknown> | void;
  onTest: () => void;
}

export function ReceiptsForm({
  settings,
  pending,
  testPending,
  testError,
  onSubmit,
  onTest,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z
    .object({
      enabled: z.boolean(),
      apiKey: optionalText(t, 500),
      model: z.enum(RECEIPT_MODELS),
      monthlyLimit: wholeNumberBetween(t, 1, MONTHLY_LIMIT_MAX),
    })
    .refine((value) => !value.enabled || settings.hasKey || value.apiKey.trim() !== "", {
      message: t("validation.required"),
      path: ["apiKey"],
    });

  const defaultValues: FormValues = {
    enabled: settings.enabled,
    apiKey: "",
    model: settings.model,
    monthlyLimit: String(settings.monthlyLimit),
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value, formApi) =>
      onSubmit(
        {
          enabled: value.enabled,
          apiKey: value.apiKey.trim() || null,
          model: value.model,
          monthlyLimit: Number(value.monthlyLimit),
        },
        () => formApi.reset({ ...value, apiKey: "" }),
      ),
  });

  return (
    <form.AppForm>
      <form.FormShell className="mt-4 space-y-5">
        <div className="max-w-prose space-y-1 rounded-md bg-background px-4 py-3 text-sm">
          <p className="font-medium">{t("settings.receipts.privacyTitle")}</p>
          <p className="text-muted-foreground">{t("settings.receipts.privacy")}</p>
        </div>

        <form.Field name="enabled">
          {(field) => (
            <field.CheckboxField
              id="receipts-enabled"
              className="max-w-prose"
              label={t("settings.receipts.enabled")}
              hint={t("settings.receipts.enabledHint")}
            />
          )}
        </form.Field>

        <FormGrid className="max-w-3xl">
          <form.Field name="apiKey">
            {(field) => (
              <field.TextField
                id="receipts-api-key"
                type="password"
                label={t("settings.receipts.apiKey")}
                hint={t("settings.receipts.apiKeyHint")}
                placeholder={settings.hasKey ? t("settings.receipts.apiKeyStored") : undefined}
                autoComplete="new-password"
              />
            )}
          </form.Field>

          <form.Field name="model">
            {(field) => (
              <field.SelectFieldControl
                id="receipts-model"
                label={t("settings.receipts.model")}
                options={optionsOf(RECEIPT_MODELS, (model) =>
                  t(`settings.receipts.models.${model}`),
                )}
              />
            )}
          </form.Field>

          <form.Field name="monthlyLimit">
            {(field) => (
              <field.TextField
                id="receipts-monthly-limit"
                label={t("settings.receipts.monthlyLimit")}
                hint={t("settings.receipts.monthlyLimitHint")}
                inputMode="numeric"
              />
            )}
          </form.Field>
        </FormGrid>

        <p className="text-sm tabular-nums">
          {t("settings.receipts.usage", {
            used: settings.readingsThisMonth,
            limit: settings.monthlyLimit,
          })}
        </p>

        <FormError error={testError} />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            pending={testPending}
            disabled={!settings.hasKey}
            onClick={onTest}
          >
            <KeyRound />
            {t("settings.receipts.test")}
          </Button>
          <p className="text-sm text-muted-foreground">{t("settings.receipts.testHint")}</p>
          <form.SubmitButton pending={pending} className="ml-auto">
            {t("actions.save")}
          </form.SubmitButton>
        </div>
      </form.FormShell>
    </form.AppForm>
  );
}
