import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateGoal, useUpdateGoal } from "@/api/generated";
import { type AccountResponse, GoalFunding, type GoalResponse } from "@/api/generated/model";
import {
  createGoalBodyFundingSharePercentMax,
  createGoalBodyNameMax,
} from "@/api/schemas/goals/goals.zod";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { silent, upsert } from "@/lib/mutations";
import { namedOptions, withMissingOption } from "@/lib/options";
import {
  optionalNonNegativeMoney,
  positiveMoney,
  requiredText,
  wholeNumberBetween,
} from "@/lib/validation";

const SHARE_MIN = 1;

interface FormValues {
  name: string;
  targetAmount: string;
  currentAmount: string;
  targetDate: string;
  funding: GoalFunding;
  fundingAccountId: string;
  fundingSharePercent: string;
}

interface Props {
  initial?: GoalResponse;
  accounts: AccountResponse[];
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateGoalForm({ initial, accounts, onCreated, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z
    .object({
      name: requiredText(t, createGoalBodyNameMax),
      targetAmount: positiveMoney(t),
      currentAmount: optionalNonNegativeMoney(t),
      targetDate: z.string(),
      funding: z.enum(GoalFunding),
      fundingAccountId: z.string(),
      fundingSharePercent: wholeNumberBetween(t, SHARE_MIN, createGoalBodyFundingSharePercentMax),
    })
    .superRefine((value, ctx) => {
      if (value.funding === "account" && value.fundingAccountId === "") {
        ctx.addIssue({
          code: "custom",
          message: t("validation.required"),
          path: ["fundingAccountId"],
        });
      }
    });

  const { create, update, pending, error } = upsert(
    useCreateGoal(silent({ onSuccess: onCreated })),
    useUpdateGoal(silent({ onSuccess: onCreated })),
  );

  const defaultValues: FormValues = {
    name: initial?.name ?? "",
    targetAmount: initial?.targetAmount ?? "",
    currentAmount: initial?.currentAmount ?? "",
    targetDate: initial?.targetDate ?? "",
    funding: initial?.funding ?? "manual",
    fundingAccountId: initial?.fundingAccountId ?? "",
    fundingSharePercent: String(initial?.fundingSharePercent ?? 100),
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
      };

      return initial?.id
        ? update({
            id: initial.id,
            data: { ...data, currentAmount: fromAccount ? null : value.currentAmount || "0" },
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
              />
            )}
          </form.Field>

          <form.Field name="targetAmount">
            {(field) => <field.MoneyInputField id="goal-target" label={t("goals.targetAmount")} />}
          </form.Field>

          <form.Field name="funding">
            {(field) => (
              <field.SelectFieldControl
                id="goal-funding"
                label={t("goals.funding")}
                options={[
                  { value: "manual", label: t("goals.fundingModes.manual") },
                  { value: "account", label: t("goals.fundingModes.account") },
                ]}
              />
            )}
          </form.Field>

          <form.Subscribe selector={(state) => state.values.funding}>
            {(funding) =>
              funding === "manual" ? (
                <form.Field name="currentAmount">
                  {(field) => (
                    <field.MoneyInputField
                      id="goal-current"
                      label={t("goals.currentAmount")}
                      hint={t("goals.manualHint")}
                    />
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

          <form.Field name="targetDate">
            {(field) => <field.DateField id="goal-date" label={t("goals.targetDate")} />}
          </form.Field>
        </FormGrid>

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={initial ? t("actions.save") : t("goals.add")}
          onCancel={onCancel}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
