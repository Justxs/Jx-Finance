import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { useDate, useIsoDate, useMonthName } from "@/hooks/use-formatters";
import { monthBounds, parseIso } from "@/lib/calendar";
import { nameById } from "@/lib/options";
import { useTransactionFilters } from "./use-transaction-filters";

export interface FilterSummary {
  key: string;
  label: string;
  value: string;
  clear: () => void;
}

function optionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value;
}

interface Args {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
}

export function useFilterSummaries({ accounts, categories, tags }: Args) {
  const { t } = useTranslation();
  const { fields, columnLabels, clearFilters } = useTransactionFilters({ accounts, categories });
  const date = useDate();
  const formatIso = useIsoDate();
  const formatMonth = useMonthName();
  const tagNames = nameById(tags);

  function dateValue() {
    const { from, to } = fields.date.value;
    const start = parseIso(from);
    const end = parseIso(to);
    if (start && end) {
      const month = monthBounds(start);
      return month.dateFrom === from && month.dateTo === to
        ? formatMonth(from)
        : date.formatRange(start, end);
    }
    return start
      ? t("filters.since", { date: formatIso(from) })
      : t("filters.until", { date: formatIso(to) });
  }

  const summaries: FilterSummary[] = [];
  if (fields.date.active) {
    summaries.push({
      key: "date",
      label: fields.date.label,
      value: dateValue(),
      clear: fields.date.clear,
    });
  }
  if (fields.search.value) {
    summaries.push({
      key: "search",
      label: fields.search.label,
      value: `“${fields.search.value}”`,
      clear: () => fields.search.set(""),
    });
  }
  if (fields.payee.value) {
    summaries.push({
      key: "payee",
      label: fields.payee.label,
      value: fields.payee.value,
      clear: () => fields.payee.set(""),
    });
  }
  if (fields.account.value) {
    summaries.push({
      key: "account",
      label: fields.account.label,
      value: optionLabel(fields.account.options, fields.account.value),
      clear: () => fields.account.set(""),
    });
  }
  if (fields.category.value) {
    summaries.push({
      key: "category",
      label: fields.category.label,
      value: optionLabel(fields.category.options, fields.category.value),
      clear: () => fields.category.set(""),
    });
  }
  if (fields.tags.active) {
    summaries.push({
      key: "tags",
      label: fields.tags.label,
      value: fields.tags.value.map((id) => tagNames.get(id) ?? id).join(", "),
      clear: fields.tags.clear,
    });
  }
  if (fields.type.value) {
    summaries.push({
      key: "type",
      label: fields.type.label,
      value: optionLabel(fields.type.options, fields.type.value),
      clear: () => fields.type.set(""),
    });
  }
  if (fields.unusual.enabled && fields.unusual.value) {
    summaries.push({
      key: "unusual",
      label: columnLabels.amount,
      value: fields.unusual.label,
      clear: () => fields.unusual.set(false),
    });
  }

  function valueOf(...keys: string[]) {
    const values = summaries
      .filter((summary) => keys.includes(summary.key))
      .map((summary) => summary.value);
    return values.length > 0 ? values.join(", ") : undefined;
  }

  return { summaries, valueOf, clearFilters };
}
