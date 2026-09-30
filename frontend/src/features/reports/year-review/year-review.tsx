import { useTranslation } from "react-i18next";
import type { CategoryBreakdownItem, ReportTrendPoint } from "@/api/generated/model";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { Button } from "@/components/ui/button/button";
import { TitledSection } from "@/components/ui/section/section";
import {
  ScrollRegion,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { useCategoryName } from "@/hooks/use-category-name";
import { EMPTY_VALUE, useMoney, useMonthName, useNumberFormat } from "@/hooks/use-formatters";
import { changeOf } from "@/lib/comparison";
import { cn } from "@/lib/utils";
import { biggestChanges, monthRows } from "./year-review-rows";

interface Props {
  trend: readonly ReportTrendPoint[];
  expenseByCategory: readonly CategoryBreakdownItem[];
  compared: boolean;
  onCompare: () => void;
}

function Changes({ items }: Readonly<{ items: readonly CategoryBreakdownItem[] }>) {
  const { t } = useTranslation();
  const money = useMoney();
  const nameOf = useCategoryName();

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("reports.yearReview.noChanges")}</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.categoryId ?? "uncategorized"}
          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"
        >
          <span className="min-w-0 font-medium">{nameOf(item)}</span>
          <span className="flex items-baseline gap-2 tabular-nums">
            {t("reports.yearReview.was", {
              now: money.format(Number(item.amount)),
              was: money.format(Number(item.comparisonAmount ?? 0)),
            })}
            <ChangeBadge change={changeOf(item.amount, item.comparisonAmount)} good="down" />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function YearReview({ trend, expenseByCategory, compared, onCompare }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const monthName = useMonthName();
  const percent = useNumberFormat({ style: "percent", maximumFractionDigits: 0 });
  const rows = monthRows(trend);
  const changes = biggestChanges(expenseByCategory);

  return (
    <TitledSection title={t("reports.yearReview.title")} bodyGap="md">
      <ScrollRegion aria-label={t("reports.yearReview.months")} className="-mx-3">
        <Table className="min-w-120" aria-label={t("reports.yearReview.months")}>
          <TableHeader>
            <TableRow>
              <TableHead>{t("reports.yearReview.month")}</TableHead>
              <TableHead numeric>{t("reports.yearReview.income")}</TableHead>
              <TableHead numeric>{t("reports.yearReview.expenses")}</TableHead>
              <TableHead numeric>{t("reports.net")}</TableHead>
              <TableHead numeric>{t("reports.yearReview.saved")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.month}>
                <TableCell>{monthName(row.month)}</TableCell>
                <TableCell numeric>{money.format(row.income)}</TableCell>
                <TableCell numeric>{money.format(row.expense)}</TableCell>
                <TableCell numeric className={cn(row.net < 0 && "text-expense")}>
                  {money.formatSigned(row.net, "auto")}
                </TableCell>
                <TableCell numeric>
                  {row.savedShare === null ? EMPTY_VALUE : percent.format(row.savedShare)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollRegion>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">{t("reports.yearReview.changes")}</h3>
        {compared ? (
          <Changes items={changes} />
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={onCompare}>
            {t("reports.yearReview.compare")}
          </Button>
        )}
      </div>
    </TitledSection>
  );
}
