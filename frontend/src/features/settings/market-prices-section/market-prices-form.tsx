import { useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useUpdateMarketPriceSettings } from "@/api/generated";
import type { MarketPriceSettingsResponse } from "@/api/generated/model";
import { updateMarketPriceSettingsBodyEodhdApiKeyMax } from "@/api/schemas/settings/settings.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { Tag } from "@/components/ui/tag/tag";
import { optionalText } from "@/lib/validation";

type KeyAction = "keep" | "replace" | "remove";

interface KeyStateProps {
  action: KeyAction;
  onChange: (action: KeyAction) => void;
}

function SavedKey({ action, onChange }: Readonly<KeyStateProps>) {
  const { t } = useTranslation();

  return (
    <div className="max-w-3xl space-y-1.5">
      <p className="text-sm font-medium">{t("settings.marketPrices.key")}</p>
      <div className="flex flex-wrap items-center gap-2">
        {action === "keep" ? (
          <>
            <Tag tone="neutral">{t("settings.marketPrices.keySaved")}</Tag>
            <Button type="button" variant="outline" size="sm" onClick={() => onChange("replace")}>
              {t("settings.marketPrices.replace")}
            </Button>
            <Button
              type="button"
              variant="outline-destructive"
              size="sm"
              onClick={() => onChange("remove")}
            >
              {t("settings.marketPrices.remove")}
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">{t("settings.marketPrices.removing")}</p>
            <Button type="button" variant="outline" size="sm" onClick={() => onChange("keep")}>
              {t("actions.cancel")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function MarketPricesForm({
  settings,
}: Readonly<{ settings: MarketPriceSettingsResponse }>) {
  const { t } = useTranslation();
  const [keyAction, setKeyAction] = useState<KeyAction>(settings.hasKey ? "keep" : "replace");

  const saveMutation = useUpdateMarketPriceSettings({
    mutation: { meta: { silent: true, success: t("settings.marketPrices.saved") } },
  });

  const form = useServerForm({
    defaultValues: { enabled: settings.enabled, key: "" },
    schema: z.object({
      enabled: z.boolean(),
      key: optionalText(t, updateMarketPriceSettingsBodyEodhdApiKeyMax),
    }),
    submit: async (value, formApi) => {
      const saved = await saveMutation.mutateAsync({
        data: {
          enabled: value.enabled,
          eodhdApiKey: keyAction === "remove" ? "" : value.key.trim() || null,
        },
      });
      formApi.reset({ ...value, key: "" });
      setKeyAction(saved.hasKey ? "keep" : "replace");
    },
  });

  return (
    <form.AppForm>
      <form.FormShell className="mt-4 space-y-5">
        <form.Field name="enabled">
          {(field) => (
            <field.CheckboxField
              id="market-prices-enabled"
              className="max-w-prose"
              label={t("settings.marketPrices.enabled")}
              hint={t("settings.marketPrices.enabledHint")}
            />
          )}
        </form.Field>

        {keyAction === "replace" ? (
          <form.Field name="key">
            {(field) => (
              <field.TextField
                id="market-prices-key"
                type="password"
                className="max-w-md"
                label={t("settings.marketPrices.key")}
                hint={t("settings.marketPrices.keyHint")}
                autoComplete="off"
              />
            )}
          </form.Field>
        ) : (
          <SavedKey action={keyAction} onChange={setKeyAction} />
        )}

        <FormError error={saveMutation.error} />

        <div className="flex max-w-3xl justify-end">
          <form.SubmitButton pending={saveMutation.isPending}>
            {t("actions.save")}
          </form.SubmitButton>
        </div>
      </form.FormShell>
    </form.AppForm>
  );
}
