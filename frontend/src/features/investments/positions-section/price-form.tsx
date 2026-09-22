import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { SecurityResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useToday } from "@/hooks/use-settings";
import { quantity, requiredValue } from "@/lib/validation";

interface PriceFormValues {
  lastPrice: string;
  lastPriceDate: string;
}

interface Props {
  security: SecurityResponse;
  pending: boolean;
  error?: unknown;
  onSubmit: (values: PriceFormValues) => Promise<unknown> | void;
  onCancel: () => void;
}

export function PriceForm({ security, pending, error, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();

  const schema = z.object({
    lastPrice: quantity(t, "investments.validation.price"),
    lastPriceDate: requiredValue(t).refine(
      (value) => value <= today,
      t("investments.validation.priceDateFuture"),
    ),
  });

  const defaultValues: PriceFormValues = {
    lastPrice: security.lastPrice ?? "",
    lastPriceDate: today,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => onSubmit(value),
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="lastPrice">
          {(field) => (
            <field.TextField
              id="price-form-price"
              label={t("investments.price.label", { currency: security.currency.toUpperCase() })}
              hint={t("investments.price.hint")}
              inputMode="decimal"
              placeholder="0.00"
            />
          )}
        </form.Field>

        <form.Field name="lastPriceDate">
          {(field) => <field.DateField id="price-form-date" label={t("investments.price.date")} />}
        </form.Field>

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={t("actions.save")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
