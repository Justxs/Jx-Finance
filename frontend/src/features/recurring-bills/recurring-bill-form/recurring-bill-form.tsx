import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  getDebtsSuspenseQueryOptions,
  useCreateRecurringBill,
  useHouseholdsSuspense,
  useUpdateRecurringBill,
} from "@/api/generated";
import {
  type AccountResponse,
  type CategoryResponse,
  RecurringBillCadence,
  RecurringBillKind,
  type RecurringBillResponse,
  RecurringBillShape,
  type Scope,
} from "@/api/generated/model";
import {
  updateRecurringBillBodyMatchKeyMax,
  updateRecurringBillBodyNameMax,
  updateRecurringBillBodyRemindDaysBeforeMax,
  updateRecurringBillBodyRemindDaysBeforeMin,
} from "@/api/schemas/recurring-bills/recurring-bills.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useFeature, useToday } from "@/hooks/use-settings";
import { silentMutation, upsert } from "@/lib/mutations";
import { namedOptions, optionsOf } from "@/lib/options";
import {
  isPositiveMoney,
  optionalText,
  refineSharing,
  requiredText,
  requiredValue,
  sharingPayload,
  sharingShape,
  wholeNumberBetween,
} from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

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
  matchKey: string;
  debtId: string;
  scope: Scope;
  householdId: string;
}

type RecurringBillDraft = Partial<Omit<RecurringBillResponse, "id">>;

interface Props {
  initial?: RecurringBillResponse;
  draft?: RecurringBillDraft;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onClose: () => void;
}

export function RecurringBillForm({
  initial,
  draft,
  accounts,
  categories,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const netWorth = useFeature("netWorth");
  const debtsQuery = useQuery({ ...getDebtsSuspenseQueryOptions(), enabled: netWorth });
  const debts = debtsQuery.data ?? [];
  const fieldId = initial ? `bill-${initial.id}` : "bill";
  const sharing = useSharingDefaults(useHouseholdsSuspense().data, initial);

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
      matchKey: optionalText(t, updateRecurringBillBodyMatchKeyMax),
      debtId: z.string(),
      ...sharingShape(),
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
  const sharedSchema = refineSharing(schema, t);

  const { create, update, pending, error } = upsert(
    useCreateRecurringBill({ mutation: { ...silentMutation, onSuccess: onClose } }),
    useUpdateRecurringBill({ mutation: { ...silentMutation, onSuccess: onClose } }),
  );

  const seed: RecurringBillDraft = initial ?? draft ?? {};
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
    matchKey: seed.matchKey ?? "",
    debtId:
      netWorth && debtsQuery.isSuccess && !debts.some((debt) => debt.id === seed.debtId)
        ? ""
        : (seed.debtId ?? ""),
    ...sharing,
  };
  const payableDebts = debts.filter((debt) => debt.tracksPayments || debt.id === seed.debtId);

  const form = useServerForm({
    defaultValues,
    schema: sharedSchema,
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
        matchKey: value.matchKey.trim() || null,
        debtId: value.shape === "expense" ? value.debtId || null : null,
        ...sharingPayload(value),
      };

      return initial
        ? update({ id: initial.id, data: { ...data, isActive: value.isActive } })
        : create({ data });
    },
  });

  if (!initial && accounts.length === 0) {
    return <EmptyText size="sm">{t("recurringBills.needAccount")}</EmptyText>;
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
              placeholder={initial ? undefined : t("recurringBills.namePlaceholder")}
            />
          )}
        </form.Field>

        <form.Field name="shape">
          {(field) => (
            <field.SelectFieldControl
              id={`${fieldId}-shape`}
              kind="segments"
              label={t("recurringBills.shape")}
              options={optionsOf(Object.values(RecurringBillShape), (shape) =>
                t(`recurringBills.shapes.${shape}`),
              )}
            />
          )}
        </form.Field>

        <form.Field name="kind">
          {(field) => (
            <field.SelectFieldControl
              id={`${fieldId}-kind`}
              label={t("recurringBills.kind")}
              options={optionsOf(Object.values(RecurringBillKind), (kind) =>
                t(`recurringBills.kinds.${kind}`),
              )}
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
              options={optionsOf(Object.values(RecurringBillCadence), (cadence) =>
                t(`recurringBills.cadences.${cadence}`),
              )}
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
                      kind="search"
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

              <form.Field name="matchKey">
                {(field) => (
                  <field.TextField
                    id={`${fieldId}-match-key`}
                    label={t("recurringBills.matchKey")}
                    hint={t("recurringBills.matchKeyHint")}
                  />
                )}
              </form.Field>

              {shape === "expense" && payableDebts.length > 0 ? (
                <form.Field name="debtId">
                  {(field) => (
                    <field.SelectFieldControl
                      id={`${fieldId}-debt`}
                      label={t("recurringBills.debt")}
                      hint={t("recurringBills.debtHint")}
                      options={namedOptions(payableDebts, t("recurringBills.noDebt"))}
                    />
                  )}
                </form.Field>
              ) : null}

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

        {initial ? (
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

        <SharingFields
          form={form}
          fields={{ scope: "scope", householdId: "householdId" }}
          idPrefix={fieldId}
        />

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("recurringBills.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
