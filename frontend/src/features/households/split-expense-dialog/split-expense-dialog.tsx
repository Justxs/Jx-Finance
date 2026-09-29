import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  useCreateSharedExpense,
  useHouseholdsSuspense,
  useUpdateSharedExpense,
} from "@/api/generated";
import { SplitMethod, type TransactionResponse } from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FieldError } from "@/components/ui/field-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { userName } from "@/features/users/user-queries";
import { useMoney } from "@/hooks/use-formatters";
import { silent, upsert } from "@/lib/mutations";
import { namedOptions, optionsOf } from "@/lib/options";
import { isNonNegativeMoney, normalizeMoney } from "@/lib/validation";
import { useActiveHouseholdId } from "@/stores/active-household-store";
import { allocateShares } from "../share-allocation";

const methods = Object.values(SplitMethod);
const MAX_WEIGHT = 100;

interface MemberValue {
  userId: string;
  name: string;
  included: boolean;
  weight: string;
  amount: string;
}

interface Props {
  transaction: TransactionResponse;
  onClose: () => void;
}

function isWeight(value: string) {
  return /^\d+$/.test(value.trim()) && Number(value) >= 1 && Number(value) <= MAX_WEIGHT;
}

export function SplitExpenseForm({ transaction, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const households = useHouseholdsSuspense().data;
  const activeHouseholdId = useActiveHouseholdId();
  const existing = transaction.sharedExpense ?? null;
  const { create, update, pending, error } = upsert(
    useCreateSharedExpense(silent({ onSuccess: onClose })),
    useUpdateSharedExpense(silent({ onSuccess: onClose })),
  );
  const firstHousehold =
    existing?.householdId ??
    households.find((household) => household.id === activeHouseholdId)?.id ??
    households[0]?.id ??
    "";

  function membersOf(householdId: string): MemberValue[] {
    const current =
      households
        .find((household) => household.id === householdId)
        ?.members.map((member) => ({ userId: member.userId, name: userName(member) })) ?? [];
    const shares = existing?.householdId === householdId ? existing.shares : [];
    const former = shares
      .filter((share) => !current.some((member) => member.userId === share.userId))
      .map((share) => ({ userId: share.userId, name: share.name }));
    return [...current, ...former].map((person) => {
      const share = shares.find((item) => item.userId === person.userId);
      return {
        ...person,
        included: existing ? share !== undefined : true,
        weight: String(share?.weight ?? 1),
        amount: existing?.method === "exact" && share ? share.amount : "",
      };
    });
  }

  const schema = z
    .object({
      householdId: z.string().min(1, t("validation.required")),
      method: z.enum(SplitMethod),
      members: z.array(
        z.object({
          userId: z.string(),
          name: z.string(),
          included: z.boolean(),
          weight: z.string(),
          amount: z.string(),
        }),
      ),
    })
    .superRefine((value, ctx) => {
      if (!value.members.some((member) => member.included)) {
        ctx.addIssue({ code: "custom", message: t("households.split.nobody"), path: ["members"] });
      }
      for (const [index, member] of value.members.entries()) {
        if (!member.included) {
          continue;
        }
        if (value.method === "shares" && !isWeight(member.weight)) {
          ctx.addIssue({
            code: "custom",
            message: t("validation.wholeNumberBetween", { min: 1, max: MAX_WEIGHT }),
            path: ["members", index, "weight"],
          });
        }
        if (value.method === "exact" && !isNonNegativeMoney(member.amount)) {
          ctx.addIssue({
            code: "custom",
            message: t("validation.money"),
            path: ["members", index, "amount"],
          });
        }
      }
    });

  const form = useServerForm({
    defaultValues: {
      householdId: firstHousehold,
      method: existing?.method ?? SplitMethod.equal,
      members: membersOf(firstHousehold),
    },
    schema,
    submit: (value) => {
      const shares = value.members
        .filter((member) => member.included)
        .map((member) => ({
          userId: member.userId,
          weight: value.method === "shares" ? Number(member.weight) : null,
          amount: value.method === "exact" ? normalizeMoney(member.amount) : null,
        }));
      return existing
        ? update({
            id: existing.householdId,
            expenseId: existing.id,
            data: { method: value.method, shares, refreshFromTransaction: true },
          })
        : create({
            id: value.householdId,
            data: { transactionId: transaction.id, method: value.method, shares },
          });
    },
  });

  return (
    <form.AppForm>
      <form.FormShell as={FormGrid}>
        <form.Field name="householdId">
          {(field) => (
            <field.SelectFieldControl
              id="split-household"
              label={t("households.split.household")}
              options={namedOptions(households)}
              disabled={existing !== null}
              onValueChange={(householdId) => form.setFieldValue("members", membersOf(householdId))}
            />
          )}
        </form.Field>

        <form.Field name="method">
          {(field) => (
            <field.SelectFieldControl
              id="split-method"
              kind="segments"
              label={t("households.split.method")}
              options={optionsOf(methods, (method) => t(`households.split.methods.${method}`))}
            />
          )}
        </form.Field>

        <form.Subscribe selector={(state) => state.values}>
          {(values) => {
            const included = values.members.filter((member) => member.included);
            const cents = allocateShares(
              transaction.amount,
              values.method,
              included.map((member) => ({ weight: Number(member.weight), amount: member.amount })),
            );
            const assigned = included.reduce(
              (total, member) =>
                total +
                (isNonNegativeMoney(member.amount) ? Number(normalizeMoney(member.amount)) : 0),
              0,
            );

            return (
              <fieldset className="col-span-full space-y-3">
                <legend className="mb-2 text-sm font-medium">
                  {t("households.split.members")}
                </legend>
                <form.Field name="members">
                  {(field) => <FieldError message={field.errors[0]?.message} />}
                </form.Field>
                {values.members.map((member, index) => {
                  const share = cents?.[included.indexOf(member)];
                  return (
                    <div
                      key={member.userId}
                      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_8rem] sm:items-center"
                    >
                      <form.Field name={`members[${index}].included`}>
                        {(field) => (
                          <field.CheckboxField
                            id={`split-member-${index}`}
                            label={t("households.split.include", { name: member.name })}
                            hint={
                              member.included && share !== undefined
                                ? t("households.split.preview", {
                                    name: member.name,
                                    amount: money.format(share / 100, transaction.currency),
                                  })
                                : undefined
                            }
                          />
                        )}
                      </form.Field>
                      {member.included && values.method === "shares" ? (
                        <form.Field name={`members[${index}].weight`}>
                          {(field) => (
                            <field.TextField
                              id={`split-member-${index}-weight`}
                              inputMode="numeric"
                              aria-label={t("households.split.weight", { name: member.name })}
                            />
                          )}
                        </form.Field>
                      ) : null}
                      {member.included && values.method === "exact" ? (
                        <form.Field name={`members[${index}].amount`}>
                          {(field) => (
                            <field.MoneyInputField
                              id={`split-member-${index}-amount`}
                              aria-label={t("households.split.amount", { name: member.name })}
                            />
                          )}
                        </form.Field>
                      ) : null}
                    </div>
                  );
                })}
                {values.method === "exact" && included.length > 0 && cents === null ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    {t("households.split.mismatch", {
                      assigned: money.format(assigned, transaction.currency),
                      total: money.format(Number(transaction.amount), transaction.currency),
                    })}
                  </p>
                ) : null}
              </fieldset>
            );
          }}
        </form.Subscribe>

        <FormError error={error} />

        <form.FormActions
          span
          pending={pending}
          submitLabel={t("actions.save")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
