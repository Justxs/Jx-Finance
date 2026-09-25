import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateRecurringBill, useUpdateRecurringBill } from "@/api/generated";
import {
  type AccountResponse,
  type CategoryResponse,
  RecurringBillCadence,
  RecurringBillKind,
  type RecurringBillResponse,
  RecurringBillShape,
} from "@/api/generated/model";
import {
  updateRecurringBillBodyNameMax,
  updateRecurringBillBodyRemindDaysBeforeMax,
  updateRecurringBillBodyRemindDaysBeforeMin,
} from "@/api/schemas/recurring-bills/recurring-bills.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useToday } from "@/hooks/use-settings";
import { silent, upsert } from "@/lib/mutations";
import { namedOptions } from "@/lib/options";
import { isPositiveMoney, requiredText, requiredValue, wholeNumberBetween } from "@/lib/validation";

interface FormValues {
  name: string;
  shape: RecurringBillShape;
  kind: RecurringBillKind;
  amount: string;
  categoryId: string;
  accountId: string;
  toAccountId: string;
  cadence: RecurringBillCadence;
  nextDueDate: string;
  remindDaysBefore: string;
  isActive: boolean;
}

type RecurringBillDraft = Partial<Omit<RecurringBillResponse, "id">>;

interface Props {
  bill?: RecurringBillResponse;
  draft?: RecurringBillDraft;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onClose: () => void;
}

export function RecurringBillForm({ bill, draft, accounts, categories, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const fieldId = bill ? `bill-${bill.id}` : "bill";

  const schema = z
    .object({
      name: requiredText(t, updateRecurringBillBodyNameMax),
      shape: z.enum(RecurringBillShape),
      kind: z.enum(RecurringBillKind),
      amount: z.string(),
      categoryId: z.string(),
      accountId: z.string(),
      toAccountId: z.string(),
      cadence: z.enum(RecurringBillCadence),
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
      if (value.shape !== "transfer") {
        return;
      }
      if (!value.accountId) {
        ctx.addIssue({ code: "custom", message: t("validation.required"), path: ["accountId"] });
      }
      if (!value.toAccountId) {
        ctx.addIssue({ code: "custom", message: t("validation.required"), path: ["toAccountId"] });
      } else if (value.toAccountId === value.accountId) {
        ctx.addIssue({
          code: "custom",
          message: t("transfers.sameAccountError"),
          path: ["toAccountId"],
        });
      }
    });

  const { create, update, pending, error } = upsert(
    useCreateRecurringBill(silent({ onSuccess: onClose })),
    useUpdateRecurringBill(silent({ onSuccess: onClose })),
  );

  const seed: RecurringBillDraft = bill ?? draft ?? {};
  const defaultValues: FormValues = {
    name: seed.name ?? "",
    shape: seed.shape ?? "expense",
    kind: seed.kind ?? "fixed",
    amount: seed.amount ?? "",
    categoryId: seed.categoryId ?? "",
    accountId: seed.accountId ?? "",
    toAccountId: seed.toAccountId ?? "",
    cadence: seed.cadence ?? "monthly",
    nextDueDate: seed.nextDueDate ?? today,
    remindDaysBefore: String(seed.remindDaysBefore ?? 3),
    isActive: seed.isActive ?? true,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const isTransfer = value.shape === "transfer";
      const data = {
        name: value.name.trim(),
        shape: value.shape,
        kind: value.kind,
        amount: value.kind === "fixed" ? value.amount : null,
        categoryId: isTransfer ? null : value.categoryId || null,
        accountId: value.accountId || null,
        toAccountId: isTransfer ? value.toAccountId : null,
        cadence: value.cadence,
        nextDueDate: value.nextDueDate,
        remindDaysBefore: Number(value.remindDaysBefore),
      };

      return bill
        ? update({ id: bill.id, data: { ...data, isActive: value.isActive } })
        : create({ data });
    },
  });

  if (!bill && accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("recurringBills.needAccount")}</p>;
  }

  const accountOptions = namedOptions(accounts, t("recurringBills.noAccount"));

  function categoryOptionsFor(shape: RecurringBillShape) {
    return namedOptions(
      categories.filter((category) => category.type === shape),
      t("recurringBills.noCategory"),
    );
  }

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="name">
          {(field) => (
            <field.TextField
              id={`${fieldId}-name`}
              label={t("recurringBills.name")}
              placeholder={bill ? undefined : t("recurringBills.namePlaceholder")}
            />
          )}
        </form.Field>

        <form.Field name="shape">
          {(field) => (
            <field.SelectFieldControl
              id={`${fieldId}-shape`}
              label={t("recurringBills.shape")}
              options={[
                { value: "expense", label: t("recurringBills.shapes.expense") },
                { value: "income", label: t("recurringBills.shapes.income") },
                { value: "transfer", label: t("recurringBills.shapes.transfer") },
              ]}
            />
          )}
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

        <form.Subscribe selector={(state) => state.values.shape}>
          {(shape) => (
            <>
              <form.Field name="categoryId">
                {(field) =>
                  shape === "transfer" ? (
                    <p className="pt-6 text-xs text-muted-foreground">
                      {t("recurringBills.transferNoCategory")}
                    </p>
                  ) : (
                    <field.SelectFieldControl
                      id={`${fieldId}-category`}
                      label={t("recurringBills.category")}
                      options={categoryOptionsFor(shape)}
                    />
                  )
                }
              </form.Field>

              <form.Field name="accountId">
                {(field) => (
                  <field.SelectFieldControl
                    id={`${fieldId}-account`}
                    label={
                      shape === "transfer"
                        ? t("recurringBills.fromAccount")
                        : t("recurringBills.account")
                    }
                    placeholder={
                      shape === "transfer" ? t("recurringBills.chooseAccount") : undefined
                    }
                    options={shape === "transfer" ? namedOptions(accounts) : accountOptions}
                  />
                )}
              </form.Field>

              {shape === "transfer" ? (
                <form.Field name="toAccountId">
                  {(field) => (
                    <field.SelectFieldControl
                      id={`${fieldId}-to-account`}
                      label={t("recurringBills.toAccount")}
                      placeholder={t("recurringBills.chooseAccount")}
                      options={namedOptions(accounts)}
                    />
                  )}
                </form.Field>
              ) : null}
            </>
          )}
        </form.Subscribe>

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

        {bill ? (
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
        ) : null}

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={bill ? t("actions.save") : t("recurringBills.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
