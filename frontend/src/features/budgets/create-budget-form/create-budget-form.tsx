import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  getBudgetSuggestionsQueryKey,
  getBudgetSuggestionsSuspenseQueryOptions,
  useBudgetSuggestionsSuspense,
  useCreateBudget,
  useUpdateBudget,
} from "@/api/generated";
import {
  BudgetPeriod,
  type BudgetResponse,
  type BudgetSuggestionsResponse,
  type CategoryResponse,
} from "@/api/generated/model";
import { useServerForm } from "@/components/form";
import { FormError } from "@/components/form-error/form-error";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useMoney } from "@/hooks/use-formatters";
import { silent, silentQuery, upsert } from "@/lib/mutations";
import { positiveMoney, requiredValue } from "@/lib/validation";
import { budgetPeriodOptions, isBudgetPeriod } from "../budget-periods";

interface FormValues {
  categoryId: string;
  limitAmount: string;
  period: BudgetPeriod;
  rolloverEnabled: boolean;
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
  initial?: BudgetResponse;
  onClose: () => void;
}

export function CreateBudgetForm({ categories, initial, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const monthly = useBudgetSuggestionsSuspense({ period: "monthly" });
  const expenseCategories = categories.filter((c) => c.type === "expense");
  const firstCategoryId = expenseCategories[0]?.id ?? "";

  const schema = z.object({
    categoryId: requiredValue(t),
    limitAmount: positiveMoney(t),
    period: z.enum(BudgetPeriod),
    rolloverEnabled: z.boolean(),
  });

  const { create, update, pending, error } = upsert(
    useCreateBudget(silent({ onSuccess: onClose })),
    useUpdateBudget(silent({ onSuccess: onClose })),
  );

  const defaultValues: FormValues = {
    categoryId: initial?.categoryId ?? firstCategoryId,
    limitAmount: initial?.limitAmount ?? suggestedLimit(monthly.data, firstCategoryId),
    period: initial?.period ?? "monthly",
    rolloverEnabled: initial?.rolloverEnabled ?? false,
  };

  const form = useServerForm({
    defaultValues,
    schema,
    submit: (value) =>
      initial?.id ? update({ id: initial.id, data: value }) : create({ data: value }),
  });

  function cachedLimit(period: BudgetPeriod, categoryId: string) {
    return suggestedLimit(
      queryClient.getQueryData(getBudgetSuggestionsQueryKey({ period })),
      categoryId,
    );
  }

  async function refillLimit(categoryId: string, period: BudgetPeriod, shown: string) {
    if (initial || form.getFieldValue("limitAmount") !== shown) {
      return;
    }
    const suggestions = await queryClient
      .query({ ...getBudgetSuggestionsSuspenseQueryOptions({ period }), meta: { silent: true } })
      .catch(() => undefined);
    const limit = suggestedLimit(suggestions, categoryId);
    if (form.getFieldValue("limitAmount") === shown) {
      form.setFieldValue("limitAmount", limit, {
        markAsTouched: false,
        markAsDirty: false,
        causeValidation: limit !== "",
      });
    }
  }

  if (expenseCategories.length === 0) {
    return <EmptyText size="sm">{t("budgets.needCategory")}</EmptyText>;
  }

  return (
    <form.AppForm>
      <form.FormShell className="space-y-4">
        <FormGrid>
          <form.Field name="categoryId">
            {(field) => (
              <field.SelectFieldControl
                id="budget-category"
                kind="search"
                label={t("budgets.category")}
                options={expenseCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
                onValueChange={(next, previous) => {
                  const period = form.getFieldValue("period");
                  void refillLimit(next, period, cachedLimit(period, previous));
                }}
              />
            )}
          </form.Field>

          <form.Subscribe
            selector={(state) => [state.values.categoryId, state.values.period] as const}
          >
            {([categoryId, period]) => (
              <form.Field name="limitAmount">
                {(field) => (
                  <field.MoneyInputField
                    id="budget-limit"
                    label={t("budgets.limit")}
                    hint={<BudgetHistoryHint categoryId={categoryId} period={period} />}
                  />
                )}
              </form.Field>
            )}
          </form.Subscribe>

          <form.Field name="period">
            {(field) => (
              <field.SelectFieldControl
                id="budget-period"
                label={t("budgets.period")}
                options={budgetPeriodOptions(t)}
                onValueChange={(next, previous) => {
                  const categoryId = form.getFieldValue("categoryId");
                  if (isBudgetPeriod(next) && isBudgetPeriod(previous)) {
                    void refillLimit(categoryId, next, cachedLimit(previous, categoryId));
                  }
                }}
              />
            )}
          </form.Field>

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
