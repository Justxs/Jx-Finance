import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateGoal, useHouseholdsSuspense, useUpdateGoal } from "@/api/generated";
import {
  type AccountResponse,
  GoalFunding,
  type GoalResponse,
  type Scope,
} from "@/api/generated/model";
import {
  createGoalBodyFundingSharePercentMax,
  createGoalBodyNameMax,
} from "@/api/schemas/goals/goals.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { SharingFields } from "@/components/sharing-fields/sharing-fields";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silentMutation, upsert } from "@/lib/mutations";
import { namedOptions, optionsOf, withMissingOption } from "@/lib/options";
import {
  optionalNonNegativeMoney,
  positiveMoney,
  refineSharing,
  requiredText,
  sharingPayload,
  sharingShape,
  wholeNumberBetween,
} from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

const SHARE_MIN = 1;

interface FormValues {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  funding: GoalFunding;
  fundingAccountId: string;
  fundingSharePercent: string;
  scope: Scope;
  householdId: string;
}

interface Props {
  initial?: GoalResponse;
  accounts: AccountResponse[];
  onClose: () => void;
}

export function GoalForm({ initial, accounts, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const sharing = useSharingDefaults(useHouseholdsSuspense().data, initial);

  const schema = refineSharing(
    z
      .object({
        name: requiredText(t, createGoalBodyNameMax),
        targetAmount: positiveMoney(t),
        currentAmount: optionalNonNegativeMoney(t),
        targetDate: z.string(),
        funding: z.enum(GoalFunding),
        fundingAccountId: z.string(),
        fundingSharePercent: wholeNumberBetween(t, SHARE_MIN, createGoalBodyFundingSharePercentMax),
        ...sharingShape(),
      })
      .superRefine((value, ctx) => {
        if (value.funding === "account" && value.fundingAccountId === "") {
          ctx.addIssue({
            code: "custom",
            message: t("validation.required"),
            path: ["fundingAccountId"],
          });
        }
      }),
    t,
  );

  const { create, update, pending, error } = upsert(
    useCreateGoal({ mutation: { ...silentMutation, onSuccess: onClose } }),
    useUpdateGoal({ mutation: { ...silentMutation, onSuccess: onClose } }),
  );

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    targetAmount: initial?.targetAmount ?? "",
    currentAmount: initial?.currentAmount ?? "",
    targetDate: initial?.targetDate ?? "",
    funding: initial?.funding ?? "manual",
    fundingAccountId: initial?.fundingAccountId ?? "",
    fundingSharePercent: String(initial?.fundingSharePercent ?? 100),
    ...sharing,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) => {
      const fromAccount = value.funding === "account";
      const data = {
        name: value.name.trim(),
        targetAmount: value.targetAmount,
        targetDate: value.targetDate || null,
        funding: value.funding,
        fundingAccountId: fromAccount ? value.fundingAccountId : null,
        fundingSharePercent: fromAccount ? Number(value.fundingSharePercent) : null,
        ...sharingPayload(value),
      };

      return initial
        ? update({
            id: initial.id,
            data: {
              ...data,
              currentAmount: fromAccount ? null : value.currentAmount || "0",
              version: initial.version,
            },
          })
        : create({
            data: { ...data, currentAmount: fromAccount ? null : value.currentAmount || null },
          });
    },
  });

  const accountOptions = withMissingOption(
    namedOptions(accounts, t("goals.chooseAccount")),
    initial?.fundingAccountId,
    t("goals.unavailableAccount"),
  );

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <FormGrid>
          <form.Field name="name">
            {(field) => (
              <field.TextField
                id="goal-name"
                label={t("goals.name")}
                placeholder={t("goals.namePlaceholder")}
                className="col-span-full"
              />
            )}
          </form.Field>

          <form.Field name="targetAmount">
            {(field) => <field.MoneyInputField id="goal-target" label={t("goals.targetAmount")} />}
          </form.Field>

          <form.Field name="targetDate">
            {(field) => <field.DateField id="goal-date" label={t("goals.targetDate")} />}
          </form.Field>

          <form.Field name="funding">
            {(field) => (
              <field.SelectFieldControl
                id="goal-funding"
                label={t("goals.funding")}
                options={optionsOf(["manual", "account"] as const, (mode) =>
                  t(`goals.fundingModes.${mode}`),
                )}
              />
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.funding}>
            {(funding) =>
              funding === "manual" ? (
                <form.Field name="currentAmount">
                  {(field) => (
                    <field.MoneyInputField id="goal-current" label={t("goals.currentAmount")} />
                  )}
                </form.Field>
              ) : (
                <>
                  <form.Field name="fundingAccountId">
                    {(field) => (
                      <field.SelectFieldControl
                        id="goal-funding-account"
                        label={t("goals.fundingAccount")}
                        hint={accounts.length === 0 ? t("goals.needAccount") : undefined}
                        options={accountOptions}
                      />
                    )}
                  </form.Field>

                  <form.Field name="fundingSharePercent">
                    {(field) => (
                      <field.TextField
                        id="goal-funding-share"
                        label={t("goals.fundingSharePercent")}
                        type="number"
                        inputMode="numeric"
                        min={SHARE_MIN}
                        max={createGoalBodyFundingSharePercentMax}
                      />
                    )}
                  </form.Field>
                </>
              )
            }
          </form.Subscribe>

          <SharingFields
            form={form}
            fields={{ scope: "scope", householdId: "householdId" }}
            idPrefix="goal"
          />
        </FormGrid>

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("goals.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
