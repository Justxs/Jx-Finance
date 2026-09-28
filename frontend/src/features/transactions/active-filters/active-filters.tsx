import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { useFilterSummaries } from "../use-filter-summaries";

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
}

export function ActiveFilters({ accounts, categories, tags }: Readonly<Props>) {
  const { t } = useTranslation();
  const { summaries, clearFilters } = useFilterSummaries({ accounts, categories, tags });

  if (summaries.length === 0) {
    return null;
  }

  return (
    <ul aria-label={t("filters.active")} className="flex flex-wrap items-center gap-1.5 text-xs">
      {summaries.map((summary) => (
        <li key={summary.key}>
          <button
            type="button"
            onClick={summary.clear}
            aria-label={t("filters.remove", { column: summary.label, value: summary.value })}
            className="inline-flex max-w-72 items-center gap-1 rounded-full border bg-muted/40 py-0.5 pr-1.5 pl-2.5 leading-5 transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-coarse:min-h-11"
          >
            <span className="shrink-0 text-muted-foreground">{summary.label}</span>
            <span className="truncate font-medium">{summary.value}</span>
            <X aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
          </button>
        </li>
      ))}
      <li>
        <Button type="button" variant="link-muted" size="inline" onClick={clearFilters}>
          {t("transactions.clearFilters")}
        </Button>
      </li>
    </ul>
  );
}
