import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateRecurringBill } from "@/api/generated";
import type {
  AccountResponse,
  CategoryResponse,
  RecurringBillCadence,
  RecurringBillKind,
} from "@/api/generated/model";
import { createRecurringBillBodyNameMax } from "@/api/schemas/recurring-bills/recurring-bills.zod";
import { useAppForm } from "@/components/form";
import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { useToday } from "@/hooks/use-settings";
import { submitToServer } from "@/lib/form-server-errors";
import { isPositiveMoney, requiredText, requiredValue } from "@/lib/validation";

interface FormValues {
  name: string;
  kind: RecurringBillKind;
  amount: string;
  categoryId: string;
  accountId: string;
  cadence: RecurringBillCadence;
  nextDueDate: string;
  remindDaysBefore: string;
}

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateRecurringBillForm({
  accounts,
  categories,
  onCreated,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const schema = z
    .object({
      name: requiredText(t, createRecurringBillBodyNameMax),
      kind: z.enum(["fixed", "variable"]),
      amount: z.string(),
      categoryId: z.string(),
      accountId: z.string(),
      cadence: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
      nextDueDate: requiredValue(t),
      remindDaysBefore: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0),
    })
    .superRefine((value, ctx) => {
      if (value.kind === "fixed" && !isPositiveMoney(value.amount)) {
        ctx.addIssue({ code: "custom", message: t("validation.positiveMoney"), path: ["amount"] });
      }
    });

  const createMutation = useCreateRecurringBill({
    mutation: { meta: { silent: true }, onSuccess: onCreated },
  });

  const defaultValues: FormValues = {
    name: "",
    kind: "fixed",
    amount: "",
    categoryId: "",
    accountId: "",
    cadence: "monthly",
    nextDueDate: today,
    remindDaysBefore: "3",
  };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;

      return submitToServer(submission, () =>
        createMutation.mutateAsync({
          data: {
            name: value.name.trim(),
            kind: value.kind,
            amount: value.kind === "fixed" ? value.amount : null,
            categoryId: value.categoryId || null,
            accountId: value.accountId || null,
            cadence: value.cadence,
            nextDueDate: value.nextDueDate,
            remindDaysBefore: Number(value.remindDaysBefore),
          },
        }),
      );
    },
  });

  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("recurringBills.needAccount")}</p>;
  }

  return (
    <form.AppForm>
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
            <field.TextField
              id="bill-name"
              label={t("recurringBills.name")}
              placeholder={t("recurringBills.namePlaceholder")}
            />
          )}
        </form.Field>

        <form.Field name="kind">
          {(field) => (
            <field.SelectFieldControl
              id="bill-kind"
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
                  <field.MoneyInputField id="bill-amount" label={t("recurringBills.amount")} />
                ) : (
                  <p className="pt-6 text-xs text-muted-foreground">
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
              id="bill-cadence"
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
              id="bill-category"
              label={t("recurringBills.category")}
              options={[
                { value: "", label: t("recurringBills.noCategory") },
                ...expenseCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />
          )}
        </form.Field>

        <form.Field name="accountId">
          {(field) => (
            <field.SelectFieldControl
              id="bill-account"
              label={t("recurringBills.account")}
              options={[
                { value: "", label: t("recurringBills.noAccount") },
                ...accounts.map((account) => ({ value: account.id, label: account.name })),
              ]}
            />
          )}
        </form.Field>

        <form.Field name="nextDueDate">
          {(field) => (
            <field.DateField id="bill-due-date" label={t("recurringBills.nextDueDate")} />
          )}
        </form.Field>

        <form.Field name="remindDaysBefore">
          {(field) => (
            <field.TextField
              id="bill-remind"
              label={t("recurringBills.remindDaysBefore")}
              type="number"
              min={0}
            />
          )}
        </form.Field>

        <FormError error={createMutation.error} />

        <div className="col-span-full flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
          <form.SubmitButton pending={createMutation.isPending}>
            {t("recurringBills.add")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
