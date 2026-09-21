import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { TagBreakdownItem } from "@/api/generated/model";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Meter } from "@/components/ui/meter/meter";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { changeOf } from "@/lib/comparison";

const MAX_ROWS = 8;

interface Props {
  items: TagBreakdownItem[];
  dateFrom?: string;
  dateTo?: string;
}

function weightOf(item: TagBreakdownItem) {
  return item.comparisonAmount == null
    ? Number(item.amount)
    : Math.max(Number(item.amount), Number(item.comparisonAmount));
}

export function TagBreakdown({ items, dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();

  const compared = items.some((item) => item.comparisonAmount != null);
  const rows = items
    .filter((item) => weightOf(item) > 0)
    .toSorted((a, b) => weightOf(b) - weightOf(a))
    .slice(0, MAX_ROWS);

  if (rows.length === 0) {
    return <EmptyText>{t("tags.noSpending")}</EmptyText>;
  }

  const maximum = Math.max(...rows.map((row) => Number(row.amount)));
  const total = rows.reduce((sum, row) => sum + Number(row.amount), 0);

  return (
    <div className="space-y-3">
      <ul className="space-y-3.5">
        {rows.map((row) => {
          const amount = Number(row.amount);
          const earlier = compared ? Number(row.comparisonAmount ?? 0) : null;
          const name = row.tagId ? row.tagName : t("tags.untagged");

          return (
            <li key={row.tagId ?? "untagged"}>
              <div className="flex items-baseline gap-3 text-sm">
                {row.tagId ? (
                  <Tooltip content={t("dashboard.showTransactions", { category: name })}>
                    <Link
                      to="/transactions"
                      search={{ page: 1, tagIds: row.tagId, type: "expense", dateFrom, dateTo }}
                      className="min-w-0 flex-1 wrap-break-word underline-offset-4 hover:underline"
                    >
                      {name}
                    </Link>
                  </Tooltip>
                ) : (
                  <span className="min-w-0 flex-1 wrap-break-word text-muted-foreground">
                    {name}
                  </span>
                )}
                <span className="w-10 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {percent.format(total > 0 ? amount / total : 0)}
                </span>
                <span className="w-24 shrink-0 text-right font-medium tabular-nums">
                  {money.format(amount)}
                </span>
              </div>
              <Meter value={amount} max={maximum} className="mt-1.5" />
              {earlier === null ? null : (
                <div className="mt-1 flex items-baseline justify-end gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t("reports.comparison.was", { amount: money.format(earlier) })}
                  </span>
                  <ChangeBadge change={changeOf(amount, earlier)} good="down" />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-muted-foreground">{t("tags.overlapHint")}</p>
    </div>
  );
}
