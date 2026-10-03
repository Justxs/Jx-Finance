import { noop, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getUncategorizedSuggestionsSuspenseQueryOptions,
  useBulkCategorizeTransactions,
  useCategoriesSuspense,
  useTransactionsSuspense,
} from "@/api/generated";
import type { CategoryResponse, TransactionResponse } from "@/api/generated/model";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { FormError } from "@/components/form-error/form-error";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RowTransition } from "@/components/row-transition/row-transition";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { TitledSection } from "@/components/ui/section/section";
import { RowsSkeleton } from "@/components/ui/skeleton/skeleton";
import { Tag } from "@/components/ui/tag/tag";
import { TextLink } from "@/components/ui/text-link/text-link";
import { CategorySuggestion } from "@/features/transactions/category-suggestion/category-suggestion";
import { TransactionAmount } from "@/features/transactions/transaction-amount/transaction-amount";
import { transactionName } from "@/features/transactions/transaction-amount/transaction-row";
import {
  CategoryCell,
  useInlineCategory,
} from "@/features/transactions/transactions-table/category-cell";
import { useIsoDate } from "@/hooks/use-formatters";
import { useFeature } from "@/hooks/use-settings";
import { monthBounds, monthDate } from "@/lib/calendar";
import { silentMutation } from "@/lib/mutations";
import { silentQuery } from "@/lib/query-client";
import { cn } from "@/lib/utils";
import { DoneLine, lineClass } from "./done-line";
import { uncategorizedParams } from "./month-queries";

interface BulkProps {
  rows: readonly TransactionResponse[];
  categories: readonly CategoryResponse[];
}

function BulkCategory({ rows, categories }: Readonly<BulkProps>) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState("");
  const bulk = useBulkCategorizeTransactions({
    mutation: {
      ...silentMutation,
      onSuccess: (result) => {
        toast.success(
          t("transactions.uncategorizedSuggestions.applied", { count: result.updated }),
        );
        setChoice("");
      },
    },
  });
  const types = new Set(rows.map((row) => row.type));
  const offered = categories.filter((category) => types.has(category.type));
  const chosen = offered.find((category) => category.id === choice);
  const targets = chosen ? rows.filter((row) => row.type === chosen.type) : rows;

  function apply() {
    if (chosen) {
      bulk.mutate({
        data: {
          transactionIds: targets.map((row) => row.id),
          categoryId: chosen.id,
          onlyUncategorized: true,
        },
      });
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="w-56 max-w-full">
          <ComboboxField
            aria-label={t("monthClose.page.bulkCategory")}
            placeholder={t("monthClose.page.bulkCategory")}
            value={chosen ? choice : ""}
            onChange={setChoice}
            disabled={bulk.isPending}
            options={offered.map((category) => ({
              value: category.id,
              label:
                types.size > 1
                  ? `${category.name} · ${t(`transactions.${category.type}`)}`
                  : category.name,
            }))}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          pending={bulk.isPending}
          disabled={!chosen}
          onClick={apply}
        >
          {t("monthClose.page.bulkApply", { count: targets.length })}
        </Button>
      </div>
      <FormError error={bulk.error} />
    </div>
  );
}

interface Props {
  month: string;
  count: number;
}

function UncategorizedRows({ month, count }: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const learned = useFeature("learnedCategories");
  const range = monthBounds(monthDate(month));
  const categories = useCategoriesSuspense().data;
  const rows = useTransactionsSuspense(uncategorizedParams(month)).data.items;
  const suggestions = useQuery({
    ...getUncategorizedSuggestionsSuspenseQueryOptions({ ...range, uncategorized: true }),
    ...silentQuery,
    enabled: learned,
  });
  const { categorize, pendingCategoryIds } = useInlineCategory(noop);
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const suggestionFor = new Map(
    (suggestions.data ?? []).map((suggestion) => [suggestion.transaction.id, suggestion]),
  );
  const unsplit = rows.filter((row) => !row.isSplit);

  return (
    <>
      <Rows>
        {rows.map((row) => {
          const name = transactionName(row, categoryById, t);
          const suggestion = suggestionFor.get(row.id);
          return (
            <RowTransition key={row.id}>
              <li
                tabIndex={-1}
                data-open-line=""
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 md:grid-cols-[5.5rem_minmax(0,1fr)_auto_14rem]",
                  lineClass,
                )}
              >
                <span className="min-w-0 space-y-1.5">
                  <span className="block font-medium wrap-break-word">{name}</span>
                  {suggestion ? (
                    <CategorySuggestion
                      suggestion={suggestion}
                      categories={categories}
                      onApply={(categoryId) => categorize(row, categoryId)}
                    />
                  ) : null}
                </span>
                <TransactionAmount transaction={row} showReporting className="text-right" />
                <span className="col-span-2 text-xs text-muted-foreground tabular-nums md:order-first md:col-span-1 md:text-sm">
                  {formatDate(row.date)}
                </span>
                <span data-line-control="" className="col-span-2 min-w-0 md:col-span-1">
                  {row.isSplit ? (
                    <Tag>{t("transactions.split")}</Tag>
                  ) : (
                    <CategoryCell
                      transaction={row}
                      categories={categories}
                      label={name}
                      pendingCategoryId={pendingCategoryIds.get(row.id)}
                      onChange={(categoryId) => categorize(row, categoryId)}
                    />
                  )}
                </span>
              </li>
            </RowTransition>
          );
        })}
      </Rows>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        {count > rows.length ? (
          <p className="py-2 text-sm">
            <TextLink to="/transactions" search={{ page: 1, ...range, uncategorized: true }}>
              {t("monthClose.page.showAll", { count })}
            </TextLink>
          </p>
        ) : null}
        {unsplit.length > 1 ? (
          <div className="ml-auto">
            <BulkCategory rows={unsplit} categories={categories} />
          </div>
        ) : null}
      </div>
    </>
  );
}

export function UncategorizedLines({ month, count }: Readonly<Props>) {
  const { t } = useTranslation();
  const title = t("monthClose.page.uncategorized");

  return (
    <TitledSection
      bodyGap="sm"
      title={
        <>
          {title}
          {count > 0 ? " " : null}
          {count > 0 ? (
            <span className="font-normal text-muted-foreground tabular-nums">{count}</span>
          ) : null}
        </>
      }
    >
      {count === 0 ? (
        <DoneLine>{t("monthClose.checklist.noUncategorized")}</DoneLine>
      ) : (
        <QueryBoundary fallback={<RowsSkeleton rows={Math.min(count, 3)} />} errorSubject={title}>
          <UncategorizedRows month={month} count={count} />
        </QueryBoundary>
      )}
    </TitledSection>
  );
}
