import { useTranslation } from "react-i18next";
import { z } from "zod";
import { createAssetBodyNameMax } from "@/api/schemas/net-worth/net-worth.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import type { SelectOption } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useToday } from "@/hooks/use-settings";
import type { FieldAliases } from "@/lib/form-server-errors";
import { isRate, money, requiredText, requiredValue } from "@/lib/validation";

export interface HoldingFormValues {
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
  initialValues?: HoldingFormValues;
  amountLabel: string;
  withInterestRate?: boolean;
  withAsOf?: boolean;
  pending: boolean;
  error?: unknown;
  errorAliases?: FieldAliases;
  onSubmit: (values: HoldingFormValues) => Promise<unknown> | void;
  onCancel: () => void;
}

export function HoldingForm({
  idPrefix,
  typeOptions,
  defaultType,
  initialValues,
  amountLabel,
  withInterestRate = false,
  withAsOf = false,
  pending,
  error,
  errorAliases,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();

  const schema = z.object({
    name: requiredText(t, createAssetBodyNameMax),
    type: z.string(),
    amount: money(t),
    interestRate: z.string().refine(isRate, t("validation.rate")),
    asOf: requiredValue(t),
  });

  const defaultValues: HoldingFormValues = initialValues ?? {
    name: "",
    type: defaultType,
    amount: "",
    interestRate: "",
    asOf: today,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    aliases: errorAliases,
    submit: (value) => onSubmit({ ...value, name: value.name.trim() }),
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="name">
          {(field) => <field.TextField id={`${idPrefix}-name`} label={t("netWorth.name")} />}
        </form.Field>

        <form.Field name="type">
          {(field) => (
            <field.SelectFieldControl
              id={`${idPrefix}-type`}
              label={t("netWorth.type")}
              options={typeOptions}
            />
          )}
        </form.Field>

        <form.Field name="amount">
          {(field) => <field.MoneyInputField id={`${idPrefix}-amount`} label={amountLabel} />}
        </form.Field>

        {withInterestRate ? (
          <form.Field name="interestRate">
            {(field) => (
              <field.MoneyInputField
                id={`${idPrefix}-rate`}
                label={t("netWorth.interestRate")}
                placeholder="0.0"
              />
            )}
          </form.Field>
        ) : null}

        {withAsOf ? (
          <form.Field name="asOf">
            {(field) => <field.DateField id={`${idPrefix}-as-of`} label={t("netWorth.asOf")} />}
          </form.Field>
        ) : null}

        <FormError error={error} />

        <div className="col-span-full flex items-end justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={pending}>
            {initialValues ? t("actions.save") : t("actions.add")}
          </form.SubmitButton>
        </div>
      </form.FormShell>
    </form.AppForm>
  );
}
