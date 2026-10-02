import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useSetExchangeRate } from "@/api/generated";
import type { Currency, ExchangeRateEntryResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useRateFormat } from "@/hooks/use-formatters";
import { useToday } from "@/hooks/use-settings";
import { silentMutation } from "@/lib/mutations";
import { isPositiveQuantity, normalizeMoney, requiredValue } from "@/lib/validation";

interface Props {
  currency: Currency;
  entry?: ExchangeRateEntryResponse;
  onClose: () => void;
}

export function ExchangeRateForm({ currency, entry, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const rateFormat = useRateFormat();
  const code = currency.toUpperCase();
  const mutation = useSetExchangeRate({ mutation: { ...silentMutation, onSuccess: onClose } });

  const schema = z.object({
    date: requiredValue(t).refine((value) => value <= today, t("settings.rates.form.dateFuture")),
    rate: z.string().refine(isPositiveQuantity, t("settings.rates.form.rateInvalid")),
  });

  const form = useServerForm({
    defaultValues: { date: entry?.date ?? today, rate: entry?.rate ?? "" },
    schema,
    submit: (value) =>
      mutation.mutateAsync({
        currency,
        date: value.date,
        data: { rate: normalizeMoney(value.rate) },
      }),
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="rate">
          {(field) => (
            <field.TextField
              id="exchange-rate-rate"
              label={t("settings.rates.form.rate", { currency: code })}
              hint={t("settings.rates.form.rateHint", { currency: code })}
              inputMode="decimal"
              placeholder={rateFormat.format(1)}
            />
          )}
        </form.Field>

        <form.Field name="date">
          {(field) => (
            <field.DateField id="exchange-rate-date" label={t("settings.rates.form.date")} />
          )}
        </form.Field>

        <FormError error={mutation.error} />

        <form.FormActions
          span
          pending={mutation.isPending}
          submitLabel={t("actions.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
