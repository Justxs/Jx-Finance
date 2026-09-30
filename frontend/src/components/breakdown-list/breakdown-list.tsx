import { useTranslation } from "react-i18next";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { ShareRow } from "@/components/share-row/share-row";
import { TransactionsLink } from "@/components/transactions-link/transactions-link";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { CategoryIcon } from "@/lib/category-icons";
import { changeOf } from "@/lib/comparison";
import { shareOf } from "@/lib/share";
import { cn } from "@/lib/utils";

export interface BreakdownRow {
  key: string;
  name: string;
  amount: number;
  comparisonAmount?: string | number | null;
  filter?: { categoryId?: string; tagIds?: string; payee?: string };
  icon?: string | null;
  muted?: boolean;
}

interface Props {
  rows: readonly BreakdownRow[];
  type?: "expense" | "income";
  dateFrom?: string;
  dateTo?: string;
}

export function BreakdownList({ rows, type = "expense", dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();

  const shares = shareOf(
    rows.map((row) => Math.max(0, row.amount)),
    (fraction) => percent.format(fraction),
  );
  const compared = rows.some((row) => row.comparisonAmount != null);

  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <ShareRow
          key={row.key}
          icon={
            row.icon === undefined ? null : (
              <CategoryIcon
                icon={row.icon}
                className="shrink-0 translate-y-0.5 self-start text-muted-foreground"
              />
            )
          }
          name={
            row.filter ? (
              <TransactionsLink
                name={row.name}
                filter={{ ...row.filter, type, dateFrom, dateTo }}
                className="min-w-0 flex-1 wrap-break-word"
              />
            ) : (
              <span
                className={cn(
                  "min-w-0 flex-1 wrap-break-word",
                  row.muted && "text-muted-foreground",
                )}
              >
                {row.name}
              </span>
            )
          }
          share={shares.share(row.amount)}
          amount={row.amount < 0 ? money.formatSigned(row.amount) : money.format(row.amount)}
          value={row.amount}
          max={shares.max}
        >
          {compared ? (
            <div className="mt-1 flex items-baseline justify-end gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">
                {t("reports.comparison.was", {
                  amount: money.format(Number(row.comparisonAmount ?? 0)),
                })}
              </span>
              <ChangeBadge
                change={changeOf(row.amount, row.comparisonAmount ?? 0)}
                good={type === "income" ? "up" : "down"}
              />
            </div>
          ) : null}
        </ShareRow>
      ))}
    </ul>
  );
}
