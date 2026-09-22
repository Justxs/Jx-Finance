import { useTranslation } from "react-i18next";
import type { TagBreakdownItem } from "@/api/generated/model";
import { BreakdownList, breakdownWeight } from "@/components/breakdown-list/breakdown-list";
import { EmptyText } from "@/components/ui/empty-text/empty-text";

const MAX_ROWS = 8;

interface Props {
  items: TagBreakdownItem[];
  dateFrom?: string;
  dateTo?: string;
}

export function TagBreakdown({ items, dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();

  const compared = items.some((item) => item.comparisonAmount != null);
  const rows = items
    .filter((item) => breakdownWeight(item) > 0)
    .toSorted((a, b) => breakdownWeight(b) - breakdownWeight(a))
    .slice(0, MAX_ROWS);

  if (rows.length === 0) {
    return <EmptyText>{t("tags.noSpending")}</EmptyText>;
  }

  return (
    <div className="space-y-3">
      <BreakdownList
        rows={rows.map((row) => ({
          key: row.tagId ?? "untagged",
          name: row.tagId ? row.tagName : t("tags.untagged"),
          amount: Number(row.amount),
          earlier: compared ? Number(row.comparisonAmount ?? 0) : null,
          filter: row.tagId ? { tagIds: row.tagId } : undefined,
          muted: !row.tagId,
        }))}
        dateFrom={dateFrom}
        dateTo={dateTo}
      />
      <p className="text-xs text-muted-foreground">{t("tags.overlapHint")}</p>
    </div>
  );
}
