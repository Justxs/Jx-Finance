import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateDebtEndpoint } from "@/api/generated";
import { DebtType } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/select-field";
import { isMoney } from "@/lib/validation";
import { todayIsoDate } from "@/features/transactions/transaction-form";

const debtTypes = Object.values(DebtType);

interface FormValues {
  name: string;
  type: DebtType;
  outstandingAmount: string;
  interestRate: string;
  asOf: string;
}

interface Props {
  onCreated: () => void;
  onCancel: () => void;
}

export function DebtForm({ onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t("validation.required"))
      .max(100, t("validation.maxLength", { max: 100 })),
    type: z.enum(debtTypes),
    outstandingAmount: z.string().refine(isMoney, t("validation.money")),
    interestRate: z.string(),
    asOf: z.string().min(1, t("validation.required")),
  });

  const createMutation = useCreateDebtEndpoint({ mutation: { onSuccess: onCreated } });

  const defaultValues: FormValues = {
    name: "",
    type: DebtType.other,
    outstandingAmount: "",
    interestRate: "",
    asOf: todayIsoDate(),
  };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      createMutation.mutate({
        data: {
          name: value.name,
          type: value.type,
          outstandingAmount: value.outstandingAmount,
          interestRate: value.interestRate ? Number(value.interestRate) : null,
          asOf: value.asOf,
        },
      });
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
            <Label htmlFor="debt-name">{t("netWorth.name")}</Label>
            <Input
              id="debt-name"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="type">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="debt-type">{t("netWorth.type")}</Label>
            <SelectField
              id="debt-type"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              options={debtTypes.map((type) => ({
                value: type,
                label: t(`netWorth.debtTypes.${type}`),
              }))}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="outstandingAmount">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="debt-amount">{t("netWorth.outstandingAmount")}</Label>
            <Input
              id="debt-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="interestRate">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="debt-rate">{t("netWorth.interestRate")}</Label>
            <Input
              id="debt-rate"
              inputMode="decimal"
              placeholder="0.0"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <div className="flex items-end justify-end gap-2 col-span-full">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={createMutation.isPending} disabled={!canSubmit}>
              {t("actions.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
