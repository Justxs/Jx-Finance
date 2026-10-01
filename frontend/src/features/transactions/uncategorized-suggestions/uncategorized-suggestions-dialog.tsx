import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  useBulkCategorizeTransactions,
  useUncategorizedSuggestionsSuspense,
} from "@/api/generated";
import type {
  CategoryResponse,
  UncategorizedSuggestionResponse,
  UncategorizedSuggestionsParams,
} from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { Modal } from "@/components/modal";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RecordRowsSkeleton } from "@/components/record-row/record-row";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { confidencePercent } from "@/features/transactions/category-suggestion/confidence";
import { signedAmount } from "@/features/transactions/transaction-amount/transaction-amount";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { silentMutation } from "@/lib/mutations";

interface SuggestionGroup {
  key: string;
  category: CategoryResponse;
  ruleName: string | null;
  items: UncategorizedSuggestionResponse[];
}

interface ContentProps {
  filter: UncategorizedSuggestionsParams;
  categories: CategoryResponse[];
  onClose: () => void;
}

interface Props extends Omit<ContentProps, "onClose"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function groupSuggestions(
  suggestions: UncategorizedSuggestionResponse[],
  categories: CategoryResponse[],
): SuggestionGroup[] {
  const groups = new Map<string, SuggestionGroup>();
  for (const suggestion of suggestions) {
    const category = categories.find((item) => item.id === suggestion.categoryId);
    if (!category) {
      continue;
    }
    const ruleName = suggestion.source === "rule" ? suggestion.ruleName : null;
    const key = `${category.id}:${ruleName ?? ""}`;
    const group = groups.get(key) ?? { key, category, ruleName, items: [] };
    group.items.push(suggestion);
    groups.set(key, group);
  }
  return [...groups.values()].toSorted(
    (a, b) => b.items.length - a.items.length || a.category.name.localeCompare(b.category.name),
  );
}

function SuggestionGroups({ filter, categories, onClose }: Readonly<ContentProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const { data } = useUncategorizedSuggestionsSuspense(filter);
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  const bulk = useBulkCategorizeTransactions({ mutation: silentMutation });
  const groups = groupSuggestions(data, categories);
  const chosen = groups.filter((group) => ticked.has(group.key));

  function toggle(key: string, selected: boolean) {
    const next = new Set(ticked);
    if (selected) {
      next.add(key);
    } else {
      next.delete(key);
    }
    setTicked(next);
  }

  async function apply() {
    const results = await Promise.all(
      chosen.map((group) =>
        bulk.mutateAsync({
          data: {
            transactionIds: group.items.map((item) => item.transaction.id),
            categoryId: group.category.id,
            onlyUncategorized: true,
          },
        }),
      ),
    ).catch(() => null);
    if (!results) {
      return;
    }
    const updated = results.reduce((total, result) => total + result.updated, 0);
    toast.success(t("transactions.uncategorizedSuggestions.applied", { count: updated }));
    onClose();
  }

  if (groups.length === 0) {
    return <EmptyText>{t("transactions.uncategorizedSuggestions.empty")}</EmptyText>;
  }

  return (
    <div className="space-y-4">
      <ul className="space-y-4">
        {groups.map((group) => (
          <li key={group.key} className="space-y-1">
            <label className="flex items-start gap-2.5 text-sm">
              <Checkbox
                checked={ticked.has(group.key)}
                disabled={bulk.isPending}
                onCheckedChange={(selected) => toggle(group.key, selected)}
              />
              <span className="min-w-0 font-medium wrap-break-word">
                {t("transactions.uncategorizedSuggestions.group", {
                  category: group.category.name,
                  count: group.items.length,
                })}
              </span>
            </label>
            <p className="ml-7 text-xs text-muted-foreground">
              {group.ruleName
                ? t("transactions.categorySuggestion.byRule", { rule: group.ruleName })
                : t("transactions.uncategorizedSuggestions.learned")}
            </p>
            <Rows className="ml-7">
              {group.items.map((item) => (
                <li
                  key={item.transaction.id}
                  className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
                >
                  <span className="min-w-0 wrap-break-word">
                    <span className="mr-2 text-muted-foreground tabular-nums">
                      {formatDate(item.transaction.date)}
                    </span>
                    {item.transaction.payeeName ||
                      item.transaction.payee ||
                      item.transaction.description ||
                      EMPTY_VALUE}
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {signedAmount(money, item.transaction)}
                    {item.source === "learned" ? (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t("transactions.categorySuggestion.sure", {
                          percent: confidencePercent(item.confidence),
                        })}
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </Rows>
          </li>
        ))}
      </ul>

      <FormError error={bulk.error} />

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          {t("actions.cancel")}
        </Button>
        <Button
          type="button"
          disabled={chosen.length === 0}
          pending={bulk.isPending}
          onClick={() => void apply()}
        >
          {t("transactions.uncategorizedSuggestions.apply", {
            count: chosen.reduce((total, group) => total + group.items.length, 0),
          })}
        </Button>
      </div>
    </div>
  );
}

export function UncategorizedSuggestionsDialog({
  filter,
  categories,
  open,
  onOpenChange,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t("transactions.uncategorizedSuggestions.title")}
      description={t("transactions.uncategorizedSuggestions.description")}
      className="sm:max-w-2xl"
    >
      <QueryBoundary
        fallback={<RecordRowsSkeleton rows={3} />}
        errorSubject={t("transactions.uncategorizedSuggestions.title")}
      >
        <SuggestionGroups
          filter={filter}
          categories={categories}
          onClose={() => onOpenChange(false)}
        />
      </QueryBoundary>
    </Modal>
  );
}
