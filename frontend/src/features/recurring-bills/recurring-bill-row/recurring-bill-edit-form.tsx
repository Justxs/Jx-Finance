import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useUpdateRecurringBill } from "@/api/generated";
import type {
  AccountResponse,
  CategoryResponse,
  RecurringBillCadence,
  RecurringBillKind,
  RecurringBillResponse,
} from "@/api/generated/model";
import {
  updateRecurringBillBodyNameMax,
  updateRecurringBillBodyRemindDaysBeforeMax,
  updateRecurringBillBodyRemindDaysBeforeMin,
} from "@/api/schemas/recurring-bills/recurring-bills.zod";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { submitToServer } from "@/lib/form-server-errors";
import { isPositiveMoney, requiredText, requiredValue, wholeNumberBetween } from "@/lib/validation";

interface FormValues {
  name: string;
  kind: RecurringBillKind;
  amount: string;
  categoryId: string;
  accountId: string;
  cadence: RecurringBillCadence;
  nextDueDate: string;
  remindDaysBefore: string;
  isActive: boolean;
}

interface Props {
  bill: RecurringBillResponse;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onDone: () => void;
}

export function RecurringBillEditForm({ bill, accounts, categories, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const fieldId = `bill-${bill.id}`;

  const schema = z
    .object({
      name: requiredText(t, updateRecurringBillBodyNameMax),
      kind: z.enum(["fixed", "variable"]),
      amount: z.string(),
      categoryId: z.string(),
      accountId: z.string(),
      cadence: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
      nextDueDate: requiredValue(t),
      remindDaysBefore: wholeNumberBetween(
        t,
        updateRecurringBillBodyRemindDaysBeforeMin,
        updateRecurringBillBodyRemindDaysBeforeMax,
      ),
      isActive: z.boolean(),
    })
    .superRefine((value, ctx) => {
      if (value.kind === "fixed" && !isPositiveMoney(value.amount)) {
        ctx.addIssue({ code: "custom", message: t("validation.positiveMoney"), path: ["amount"] });
      }
    });

  const updateMutation = useUpdateRecurringBill({
    mutation: { meta: { silent: true }, onSuccess: onDone },
  });

  const defaultValues: FormValues = {
    name: bill.name,
    kind: bill.kind,
    amount: bill.amount ?? "",
    categoryId: bill.categoryId ?? "",
    accountId: bill.accountId ?? "",
    cadence: bill.cadence,
    nextDueDate: bill.nextDueDate,
    remindDaysBefore: String(bill.remindDaysBefore),
    isActive: bill.isActive,
  };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;

      return submitToServer(submission, () =>
        updateMutation.mutateAsync({
          id: bill.id,
          data: {
            name: value.name.trim(),
            kind: value.kind,
            amount: value.kind === "fixed" ? value.amount : null,
            categoryId: value.categoryId || null,
            accountId: value.accountId || null,
            cadence: value.cadence,
            nextDueDate: value.nextDueDate,
            remindDaysBefore: Number(value.remindDaysBefore),
            isActive: value.isActive,
          },
        }),
      );
    },
  });

  const categoryOptions = [
    { value: "", label: t("recurringBills.noCategory") },
    ...categories
      .filter((category) => category.type === "expense")
      .map((category) => ({ value: category.id, label: category.name })),
  ];
  const accountOptions = [
    { value: "", label: t("recurringBills.noAccount") },
    ...accounts.map((account) => ({ value: account.id, label: account.name })),
  ];

  return (
    <form.AppForm>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
        className="grid items-start gap-4 *:min-w-0 sm:grid-cols-2"
      >
        <form.Field name="name">
          {(field) => <field.TextField id={`${fieldId}-name`} label={t("recurringBills.name")} />}
        </form.Field>

        <form.Field name="kind">
          {(field) => (
            <field.SelectFieldControl
              id={`${fieldId}-kind`}
              label={t("recurringBills.kind")}
              options={[
                { value: "fixed", label: t("recurringBills.kinds.fixed") },
                { value: "variable", label: t("recurringBills.kinds.variable") },
              ]}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values.kind}>
          {(kind) => (
            <form.Field name="amount">
              {(field) =>
                kind === "fixed" ? (
                  <field.MoneyInputField
                    id={`${fieldId}-amount`}
                    label={t("recurringBills.amount")}
                  />
                ) : (
                  <p className="text-xs text-muted-foreground sm:pt-6">
                    {t("recurringBills.variableAmountHint")}
                  </p>
                )
              }
            </form.Field>
          )}
        </form.Subscribe>

        <form.Field name="cadence">
          {(field) => (
            <field.SelectFieldControl
              id={`${fieldId}-cadence`}
              label={t("recurringBills.cadence")}
              options={[
                { value: "weekly", label: t("recurringBills.cadences.weekly") },
                { value: "monthly", label: t("recurringBills.cadences.monthly") },
                { value: "quarterly", label: t("recurringBills.cadences.quarterly") },
                { value: "yearly", label: t("recurringBills.cadences.yearly") },
              ]}
            />
          )}
        </form.Field>

        <form.Field name="categoryId">
          {(field) => (
            <field.SelectFieldControl
              id={`${fieldId}-category`}
              label={t("recurringBills.category")}
              options={categoryOptions}
            />
          )}
        </form.Field>

        <form.Field name="accountId">
          {(field) => (
            <field.SelectFieldControl
              id={`${fieldId}-account`}
              label={t("recurringBills.account")}
              options={accountOptions}
            />
          )}
        </form.Field>

        <form.Field name="nextDueDate">
          {(field) => (
            <field.DateField id={`${fieldId}-due-date`} label={t("recurringBills.nextDueDate")} />
          )}
        </form.Field>

        <form.Field name="remindDaysBefore">
          {(field) => (
            <field.TextField
              id={`${fieldId}-remind`}
              label={t("recurringBills.remindDaysBefore")}
              type="number"
              inputMode="numeric"
              min={updateRecurringBillBodyRemindDaysBeforeMin}
              max={updateRecurringBillBodyRemindDaysBeforeMax}
            />
          )}
        </form.Field>

        <form.Field name="isActive">
          {(field) => (
            <field.CheckboxField
              id={`${fieldId}-active`}
              label={t("recurringBills.active")}
              hint={t("recurringBills.activeHint")}
              className="col-span-full"
            />
          )}
        </form.Field>

        <FormError error={updateMutation.error} />

        <div className="col-span-full flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onDone}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={updateMutation.isPending}>
            {t("actions.save")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
