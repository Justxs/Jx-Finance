import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { SecurityResponse } from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { FormGrid } from "@/components/ui/form-grid";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToday } from "@/hooks/use-settings";
import { submitToServer } from "@/lib/form-server-errors";
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

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => submitToServer(submission, () => onSubmit(submission.value)),
  });

  return (
    <form.AppForm>
      <FormGrid
        as="form"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
      >
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

        <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={pending}>{t("actions.save")}</form.SubmitButton>
        </div>
      </FormGrid>
    </form.AppForm>
  );
}
