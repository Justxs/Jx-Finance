import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { SelectField, type SelectOption } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToday } from "@/hooks/use-settings";
import { isMoney, isRate } from "@/lib/validation";

interface HoldingFormValues {
  name: string;
  type: string;
  amount: string;
  interestRate: string;
  asOf: string;
}

interface Props {
  idPrefix: string;
  typeOptions: SelectOption[];
  defaultType: string;
  amountLabel: string;
  withInterestRate?: boolean;
  withAsOf?: boolean;
  pending: boolean;
  onSubmit: (values: HoldingFormValues) => void;
  onCancel: () => void;
}

export function HoldingForm({
  idPrefix,
  typeOptions,
  defaultType,
  amountLabel,
  withInterestRate = false,
  withAsOf = false,
  pending,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();

  const schema = z.object({
    name: z
      .string()
      .refine((value) => value.trim().length > 0, t("validation.required"))
      .refine((value) => value.trim().length <= 100, t("validation.maxLength", { max: 100 })),
    type: z.string(),
    amount: z.string().refine(isMoney, t("validation.money")),
    interestRate: z.string().refine(isRate, t("validation.rate")),
    asOf: z.string().min(1, t("validation.required")),
  });

  const defaultValues: HoldingFormValues = {
    name: "",
    type: defaultType,
    amount: "",
    interestRate: "",
    asOf: today,
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      onSubmit({ ...value, name: value.name.trim() });
    },
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
      <form.Field name="name">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-name`}>{t("netWorth.name")}</Label>
            <Input
              id={`${idPrefix}-name`}
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? `${idPrefix}-name-error` : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id={`${idPrefix}-name-error`} message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-type`}>{t("netWorth.type")}</Label>
            <SelectField
              id={`${idPrefix}-type`}
              value={field.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              options={typeOptions}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="amount">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-amount`}>{amountLabel}</Label>
            <Input
              id={`${idPrefix}-amount`}
              inputMode="decimal"
              placeholder="0.00"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? `${idPrefix}-amount-error` : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id={`${idPrefix}-amount-error`} message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      {withInterestRate ? (
        <form.Field name="interestRate">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-rate`}>{t("netWorth.interestRate")}</Label>
              <Input
                id={`${idPrefix}-rate`}
                inputMode="decimal"
                placeholder="0.0"
                value={field.value}
                aria-invalid={field.errors.length > 0}
                aria-describedby={field.errors.length > 0 ? `${idPrefix}-rate-error` : undefined}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              <FieldError id={`${idPrefix}-rate-error`} message={field.errors[0]?.message} />
            </div>
          )}
        </form.Field>
      ) : null}

      {withAsOf ? (
        <form.Field name="asOf">
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-as-of`}>{t("netWorth.asOf")}</Label>
              <DatePicker
                id={`${idPrefix}-as-of`}
                value={field.value}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
              />
            </div>
          )}
        </form.Field>
      ) : null}

      <div className="col-span-full flex items-end justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={pending} disabled={!canSubmit}>
              {t("actions.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
