import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  getBudgetSuggestionsSuspenseQueryOptions,
  useBudgetSuggestionsSuspense,
  useCreateBudget,
  useHouseholdsSuspense,
  useUpdateBudget,
} from "@/api/generated";
import {
  BudgetPeriod,
  type BudgetResponse,
  type BudgetSuggestionsResponse,
  type CategoryResponse,
  type Scope,
  type TagResponse,
} from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { FormActions } from "@/components/form/form-actions/form-actions";
import { SharingFields, sharingFieldCount } from "@/components/sharing-fields/sharing-fields";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { TextLink } from "@/components/ui/text-link/text-link";
import { budgetPeriodOptions } from "@/features/budgets/budget-periods";
import { useDecimalMark, useMoney } from "@/hooks/use-formatters";
import { silentMutation, upsert } from "@/lib/mutations";
import { namedOptions } from "@/lib/options";
import { silentQuery } from "@/lib/query-client";
import {
  normalizeMoney,
  positiveMoney,
  refineSharing,
  sharingPayload,
  sharingShape,
} from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

type BudgetTarget = "category" | "tag";

interface FormValues {
  target: BudgetTarget;
  categoryId: string;
  tagId: string;
  limitAmount: string;
  period: BudgetPeriod;
  rolloverEnabled: boolean;
  scope: Scope;
  householdId: string;
}

function suggestionOf(suggestions: BudgetSuggestionsResponse | undefined, categoryId: string) {
  return suggestions?.categories.find((item) => item.categoryId === categoryId);
}

function suggestedLimit(suggestions: BudgetSuggestionsResponse | undefined, categoryId: string) {
  return suggestionOf(suggestions, categoryId)?.suggestedLimit ?? "";
}

interface HintProps {
  categoryId: string;
  period: BudgetPeriod;
}

function BudgetHistoryHint({ categoryId, period }: Readonly<HintProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const suggestions = useQuery({
    ...getBudgetSuggestionsSuspenseQueryOptions({ period }),
    ...silentQuery,
  });

  if (!suggestions.data) {
    return null;
  }

  const suggestion = suggestionOf(suggestions.data, categoryId);
  if (!suggestion?.median) {
    return t("budgets.historyHintNone");
  }

  return (
    <>
      <span className="block">
        {t(`budgets.historyHint.${period}`, {
          number: suggestion.windows.length,
          amount: money.format(Number(suggestion.median)),
        })}
      </span>
      <span className="block tabular-nums">
        {t("budgets.historyAmounts", {
          amounts: suggestion.windows
            .map((window) => money.format(Number(window.spent)))
            .join(" · "),
        })}
      </span>
    </>
  );
}

interface Props {
  categories: CategoryResponse[];
  tags: TagResponse[];
  initial?: BudgetResponse;
  onClose: () => void;
}

export function BudgetForm({ categories, tags, initial, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const decimalMark = useDecimalMark();

  function moneyDraft(amount: string) {
    return amount.replace(".", decimalMark);
  }
  const monthly = useBudgetSuggestionsSuspense({ period: "monthly" });
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const firstCategoryId = expenseCategories[0]?.id ?? "";
  const households = useHouseholdsSuspense().data;
  const sharing = useSharingDefaults(households, initial);

  const schema = refineSharing(
    z
      .object({
        target: z.enum(["category", "tag"]),
        categoryId: z.string(),
        tagId: z.string(),
        limitAmount: positiveMoney(t),
        period: z.enum(BudgetPeriod),
        rolloverEnabled: z.boolean(),
        ...sharingShape(),
      })
      .superRefine((value, ctx) => {
        const field = value.target === "tag" ? "tagId" : "categoryId";
        if (!value[field]) {
          ctx.addIssue({ code: "custom", message: t("validation.required"), path: [field] });
        }
      }),
    t,
  );

  const { create, update, pending, error } = upsert(
    useCreateBudget({ mutation: { ...silentMutation, onSuccess: onClose } }),
    useUpdateBudget({ mutation: { ...silentMutation, onSuccess: onClose } }),
  );

  const defaultValues: FormValues = {
    target: initial?.tagId ? "tag" : "category",
    categoryId: initial?.categoryId ?? firstCategoryId,
    tagId: initial?.tagId ?? tags[0]?.id ?? "",
    limitAmount: moneyDraft(initial?.limitAmount ?? suggestedLimit(monthly.data, firstCategoryId)),
    period: initial?.period ?? "monthly",
    rolloverEnabled: initial?.rolloverEnabled ?? false,
    ...sharing,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: ({ target, categoryId, tagId, scope, householdId, ...rest }) => {
      const data = {
        ...rest,
        limitAmount: normalizeMoney(rest.limitAmount),
        categoryId: target === "category" ? categoryId : null,
        tagId: target === "tag" ? tagId : null,
        ...sharingPayload({ scope, householdId }),
      };
      return initial
        ? update({ id: initial.id, data: { ...data, version: initial.version } })
        : create({ data });
    },
  });

  async function refillLimit(typed: () => boolean) {
    const period = form.getFieldValue("period");
    if (initial || typed() || form.getFieldValue("target") === "tag") {
      return;
    }
    const suggestions = await queryClient
      .query({ ...getBudgetSuggestionsSuspenseQueryOptions({ period }), ...silentQuery })
      .catch(() => undefined);
    const limit = moneyDraft(suggestedLimit(suggestions, form.getFieldValue("categoryId")));
    if (
      typed() ||
      form.getFieldValue("period") !== period ||
      form.getFieldValue("limitAmount") === limit
    ) {
      return;
    }
    form.setFieldValue("limitAmount", limit, {
      markAsTouched: false,
      markAsDirty: false,
      causeValidation: limit !== "",
    });
  }

  if (expenseCategories.length === 0 && tags.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyText size="sm">
          {t("budgets.needCategory")} <TextLink to="/categories">{t("nav.categories")}</TextLink>
        </EmptyText>
        <FormActions onCancel={onClose} />
      </div>
    );
  }

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <FormGrid>
          {tags.length > 0 ? (
            <form.Field name="target">
              {(field) => (
                <field.SelectFieldControl
                  id="budget-target"
                  kind="segments"
                  label={t("budgets.target")}
                  className="col-span-full"
                  options={[
                    { value: "category", label: t("budgets.category") },
                    { value: "tag", label: t("budgets.tag") },
                  ]}
                />
              )}
            </form.Field>
          ) : null}

          <form.Subscribe selector={(state) => state.values.target}>
            {(target) =>
              target === "tag" ? (
                <form.Field name="tagId">
                  {(field) => (
                    <field.SelectFieldControl
                      id="budget-tag"
                      kind="search"
                      label={t("budgets.tag")}
                      options={namedOptions(tags)}
                    />
                  )}
                </form.Field>
              ) : (
                <form.Field name="categoryId">
                  {(field) => (
                    <field.SelectFieldControl
                      id="budget-category"
                      kind="search"
                      label={t("budgets.category")}
                      options={namedOptions(expenseCategories)}
                    />
                  )}
                </form.Field>
              )
            }
          </form.Subscribe>

          <form.Subscribe
            selector={(state) =>
              [state.values.target, state.values.categoryId, state.values.period] as const
            }
          >
            {([target, categoryId, period]) => (
              <form.Field
                name="limitAmount"
                listeners={[
                  {
                    triggers: ["change"],
                    watchFields: ["categoryId", "period", "target"],
                    run: ({ fieldApi }) => void refillLimit(() => fieldApi.meta.isDirty),
                  },
                ]}
              >
                {(field) => (
                  <field.MoneyInputField
                    id="budget-limit"
                    label={t("budgets.limit")}
                    hint={
                      target === "tag" ? (
                        t("budgets.tagHint")
                      ) : (
                        <BudgetHistoryHint categoryId={categoryId} period={period} />
                      )
                    }
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>

          <form.Subscribe selector={(state) => state.values.scope}>
            {(scope) => (
              <form.Field name="period">
                {(field) => (
                  <field.SelectFieldControl
                    id="budget-period"
                    label={t("budgets.period")}
                    options={budgetPeriodOptions(t)}
                    className={
                      sharingFieldCount(households.length, initial, scope) % 2 === 0
                        ? "col-span-full"
                        : undefined
                    }
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>

          <SharingFields
            form={form}
            fields={{ scope: "scope", householdId: "householdId" }}
            idPrefix="budget"
            record={initial}
          />

          <form.Field name="rolloverEnabled">
            {(field) => (
              <field.CheckboxField
                id="budget-rollover"
                label={t("budgets.rollover")}
                hint={t("budgets.rolloverHint")}
                className="col-span-full"
              />
            )}
          </form.Field>
        </FormGrid>

        <FormError error={error} />

        <form.FormActions
          pending={pending}
          submitLabel={t(initial ? "actions.save" : "budgets.add")}
          onCancel={onClose}
        />
      </form.FormShell>
    </form.AppForm>
  );
}
