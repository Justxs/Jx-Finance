import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { SecurityResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FieldError } from "@/components/ui/field-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Input } from "@/components/ui/input/input";
import { Label } from "@/components/ui/label/label";
import { useToday } from "@/hooks/use-settings";
import { quantity, requiredValue } from "@/lib/validation";

export interface PriceFormValues {
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
    lastPriceDate: requiredValue(t),
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
            <div className="space-y-1.5">
              <Label htmlFor="price-form-price">
                {t("investments.price.label", { currency: security.currency.toUpperCase() })}
              </Label>
              <Input
                id="price-form-price"
                inputMode="decimal"
                placeholder="0.00"
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={
                  field.errors.length > 0 ? "price-form-price-error" : "price-form-price-hint"
                }
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
              <FieldError id="price-form-price-error" message={field.errors[0]?.message} />
            </div>
          )}
        </form.Field>

        <form.Field name="lastPriceDate">
          {(field) => <field.DateField id="price-form-date" label={t("investments.price.date")} />}
        </form.Field>

        <p id="price-form-price-hint" className="col-span-full text-xs text-muted-foreground">
          {t("investments.price.hint")}
        </p>

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
