import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { SecurityResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToday } from "@/hooks/use-settings";
import { isQuantity } from "@/lib/validation";

export interface PriceFormValues {
  lastPrice: string;
  lastPriceDate: string;
}

interface Props {
  security: SecurityResponse;
  pending: boolean;
  onSubmit: (values: PriceFormValues) => void;
  onCancel: () => void;
}

export function PriceForm({ security, pending, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();

  const schema = z.object({
    lastPrice: z.string().refine(isQuantity, t("investments.validation.price")),
    lastPriceDate: z.string().min(1, t("validation.required")),
  });

  const defaultValues: PriceFormValues = {
    lastPrice: security.lastPrice ?? "",
    lastPriceDate: today,
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      noValidate
      className="form-grid"
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
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="price-form-date">{t("investments.price.date")}</Label>
            <DatePicker
              id="price-form-date"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "price-form-date-error" : undefined}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
            <FieldError id="price-form-date-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <p id="price-form-price-hint" className="col-span-full text-xs text-muted-foreground">
        {t("investments.price.hint")}
      </p>

      <div className="col-span-full flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={pending} disabled={!canSubmit}>
              {t("actions.save")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
