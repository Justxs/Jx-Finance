import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateDebt, useUpdateDebt } from "@/api/generated";
import { AmortizationType, DebtType, type DebtResponse } from "@/api/generated/model";
import {
  createDebtBodyNameMax,
  createDebtBodyTermMonthsMax,
} from "@/api/schemas/net-worth/net-worth.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useToday } from "@/hooks/use-settings";
import { silent, upsert } from "@/lib/mutations";
import { optionsOf } from "@/lib/options";
import {
  isRate,
  money,
  normalizeMoney,
  optionalPositiveMoney,
  optionalWholeNumberBetween,
  requiredText,
} from "@/lib/validation";
import type { HoldingFormProps } from "../holdings-section";

const debtTypes = Object.values(DebtType);
const amortizationTypes = Object.values(AmortizationType);
const TERM_MIN = 1;

export interface DebtFormValues {
  name: string;
  type: string;
  amount: string;
  interestRate: string;
  asOf: string;
  loanAmount: string;
  firstPaymentDate: string;
  termMonths: string;
  monthlyPayment: string;
  amortizationType: string;
}

export function debtFormValues(debt: DebtResponse): DebtFormValues {
  return {
    name: debt.name,
    type: debt.type,
    amount: debt.outstandingAmount,
    interestRate: debt.interestRate === null ? "" : String(debt.interestRate),
    asOf: debt.asOf,
    loanAmount: debt.loanAmount ?? "",
    firstPaymentDate: debt.firstPaymentDate ?? "",
    termMonths: debt.termMonths === null ? "" : String(debt.termMonths),
    monthlyPayment: debt.monthlyPayment ?? "",
    amortizationType: debt.amortizationType,
  };
}

export function debtRequest(values: DebtFormValues) {
  const rate = normalizeMoney(values.interestRate);
  const loanAmount = normalizeMoney(values.loanAmount);
  const monthlyPayment = normalizeMoney(values.monthlyPayment);
  const termMonths = values.termMonths.trim();

  return {
    name: values.name.trim(),
    type: debtTypes.find((type) => type === values.type) ?? DebtType.other,
    outstandingAmount: normalizeMoney(values.amount),
    interestRate: rate ? Number(rate) : null,
    asOf: values.asOf,
    loanAmount: loanAmount || null,
    firstPaymentDate: values.firstPaymentDate || null,
    termMonths: termMonths ? Number(termMonths) : null,
    monthlyPayment: monthlyPayment || null,
    amortizationType:
      amortizationTypes.find((type) => type === values.amortizationType) ??
      AmortizationType.annuity,
  };
}

export function DebtForm({ editing, onClose }: Readonly<HoldingFormProps<DebtFormValues>>) {
  const { t } = useTranslation();
  const today = useToday();
  const { create, update, pending, error } = upsert(
    useCreateDebt(silent({ onSuccess: onClose })),
    useUpdateDebt(silent({ onSuccess: onClose })),
  );
  const idPrefix = editing ? "debt-edit" : "debt";

  const schema = z
    .object({
      name: requiredText(t, createDebtBodyNameMax),
      type: z.string(),
      amount: money(t),
      interestRate: z.string().refine(isRate, t("validation.rate")),
      asOf: z.string(),
      loanAmount: optionalPositiveMoney(t),
      firstPaymentDate: z.string(),
      termMonths: optionalWholeNumberBetween(t, TERM_MIN, createDebtBodyTermMonthsMax),
      monthlyPayment: optionalPositiveMoney(t),
      amortizationType: z.string(),
    })
    .refine((value) => !(value.termMonths.trim() && value.monthlyPayment.trim()), {
      message: t("netWorth.repayment.termOrPayment"),
      path: ["monthlyPayment"],
    })
    .refine(
      (value) => value.amortizationType !== AmortizationType.linear || !value.monthlyPayment.trim(),
      { message: t("netWorth.repayment.linearNeedsTerm"), path: ["monthlyPayment"] },
    );

  const defaultValues: DebtFormValues = editing?.values ?? {
    name: "",
    type: DebtType.other,
    amount: "",
    interestRate: "",
    asOf: today,
    loanAmount: "",
    firstPaymentDate: "",
    termMonths: "",
    monthlyPayment: "",
    amortizationType: AmortizationType.annuity,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    aliases: { outstandingAmount: "amount" },
    submit: (value) => {
      const data = debtRequest(value);
      return editing ? update({ id: editing.id, data }) : create({ data });
    },
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
              options={optionsOf(debtTypes, (type) => t(`netWorth.debtTypes.${type}`))}
            />
          )}
        </form.Field>

        <form.Field name="amount">
          {(field) => (
            <field.MoneyInputField
              id={`${idPrefix}-amount`}
              label={t("netWorth.outstandingAmount")}
            />
          )}
        </form.Field>

        <form.Field name="interestRate">
          {(field) => (
            <field.MoneyInputField
              id={`${idPrefix}-rate`}
              label={t("netWorth.interestRate")}
              placeholder="0.0"
            />
          )}
        </form.Field>

        <fieldset className="col-span-full grid gap-4 border-t pt-4 sm:grid-cols-2">
          <legend className="float-left mb-1 w-full text-sm font-semibold">
            {t("netWorth.repayment.title")}
          </legend>
          <p className="col-span-full text-xs text-muted-foreground">
            {t("netWorth.repayment.hint")}
          </p>

          <form.Field name="loanAmount">
            {(field) => (
              <field.MoneyInputField
                id={`${idPrefix}-loan-amount`}
                label={t("netWorth.repayment.loanAmount")}
              />
            )}
          </form.Field>

          <form.Field name="firstPaymentDate">
            {(field) => (
              <field.DateField
                id={`${idPrefix}-first-payment`}
                label={t("netWorth.repayment.firstPaymentDate")}
              />
            )}
          </form.Field>

          <form.Field name="termMonths">
            {(field) => (
              <field.TextField
                id={`${idPrefix}-term`}
                label={t("netWorth.repayment.termMonths")}
                type="number"
                inputMode="numeric"
                min={TERM_MIN}
                max={createDebtBodyTermMonthsMax}
              />
            )}
          </form.Field>

          <form.Field name="monthlyPayment">
            {(field) => (
              <field.MoneyInputField
                id={`${idPrefix}-monthly-payment`}
                label={t("netWorth.repayment.monthlyPayment")}
              />
            )}
          </form.Field>

          <form.Field name="amortizationType">
            {(field) => (
              <field.SelectFieldControl
                id={`${idPrefix}-amortization`}
                label={t("netWorth.repayment.amortizationType")}
                options={optionsOf(amortizationTypes, (type) =>
                  t(`netWorth.repayment.amortizationTypes.${type}`),
                )}
              />
            )}
          </form.Field>
        </fieldset>

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={editing ? t("actions.save") : t("actions.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
