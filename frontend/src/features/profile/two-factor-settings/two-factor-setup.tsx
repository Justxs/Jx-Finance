import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useEnableTwoFactor } from "@/api/generated";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { RuledLine } from "@/components/ui/ruled-line/ruled-line";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { silentMutation } from "@/lib/mutations";

interface Props {
  qrDataUrl: string;
  sharedKey: string;
  onEnabled: (recoveryCodes: string[]) => void;
  onCancel: () => void;
}

export function TwoFactorSetup({ qrDataUrl, sharedKey, onEnabled, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const enableMutation = useEnableTwoFactor({
    mutation: { ...silentMutation, onSuccess: (data) => onEnabled(data.recoveryCodes ?? []) },
  });

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
          className="aspect-square w-48 max-w-full rounded-md border"
        />
        <RuledLine>
          <p className="font-mono text-xs break-all">{sharedKey}</p>
        </RuledLine>

        <form.Field name="code">
          {(field) => (
            <field.TextField
              id="two-factor-code"
              label={t("profile.enterCode")}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
            />
          )}
        </form.Field>

        <FormError error={enableMutation.error} />

        <form.Subscribe selector={(state) => state.values.code.length === 6}>
          {(ready) => (
            <form.FormActions
              submitLabel={t("profile.confirmAndEnable")}
              pending={enableMutation.isPending}
              disabled={!ready}
              onCancel={onCancel}
            />
          )}
        </form.Subscribe>
      </form.FormShell>
    </form.AppForm>
  );
}
