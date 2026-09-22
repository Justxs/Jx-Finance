import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useEnableTwoFactor } from "@/api/generated";
import type { EnableTwoFactorResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { silent } from "@/lib/mutations";

interface Props {
  qrDataUrl: string;
  sharedKey: string;
  onEnabled: (recoveryCodes: string[]) => void;
  onCancel: () => void;
}

export function TwoFactorSetup({ qrDataUrl, sharedKey, onEnabled, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const enableMutation = useEnableTwoFactor(
    silent({
      onSuccess: (data: EnableTwoFactorResponse) => onEnabled(data.recoveryCodes ?? []),
    }),
  );

  const form = useServerForm({
    defaultValues: { code: "" },
    schema: z.object({ code: z.string() }),
    submit: (value) => enableMutation.mutateAsync({ data: { code: value.code } }),
  });

  return (
    <form.AppForm>
      <form.FormShell as={Section} className="space-y-4 *:max-w-md">
        <SectionTitle>{t("profile.twoFactorTitle")}</SectionTitle>
        <p className="text-sm text-muted-foreground">{t("profile.scanQrSubtitle")}</p>
        <img
          src={qrDataUrl}
          alt={t("profile.qrCodeAlt")}
          className="h-auto w-48 max-w-full rounded-md border"
        />
        <p className="rounded-md bg-muted px-3 py-2 font-mono text-xs break-all">{sharedKey}</p>

        <form.Field name="code">
          {(field) => (
            <field.TextField
              id="two-factor-code"
              label={t("profile.enterCode")}
              inputMode="numeric"
              maxLength={6}
            />
          )}
        </form.Field>

        <FormError error={enableMutation.error} />

        <div className="flex flex-wrap gap-2">
          <form.Subscribe selector={(state) => state.values.code.length === 6}>
            {(ready) => (
              <form.SubmitButton pending={enableMutation.isPending} disabled={!ready}>
                {t("profile.confirmAndEnable")}
              </form.SubmitButton>
            )}
          </form.Subscribe>
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        </div>
      </form.FormShell>
    </form.AppForm>
  );
}
