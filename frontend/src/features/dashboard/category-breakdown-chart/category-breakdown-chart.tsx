import { useTranslation } from "react-i18next";
import { useCategoryBreakdownSuspense } from "@/api/generated";
import { CategoryBreakdown } from "@/components/category-breakdown/category-breakdown";
import { useShortDayIso } from "@/hooks/use-formatters";
import { monthDate, monthBounds } from "@/lib/calendar";
import { useShare, withShare } from "@/stores/my-share-store";

interface Props {
  month: string;
}

export function CategoryBreakdownChart({ month }: Readonly<Props>) {
  const { t } = useTranslation();
  const shortDay = useShortDayIso();
  const breakdown = useCategoryBreakdownSuspense(withShare({ month }, useShare()));
  const { dateFrom, dateTo } = monthBounds(monthDate(month));
  const { items, comparisonStart, comparisonEnd } = breakdown.data;

  return (
    <div className="space-y-3">
      {items.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("reports.comparison.against", {
            from: shortDay(comparisonStart),
            to: shortDay(comparisonEnd),
          })}
        </p>
      ) : null}
      <CategoryBreakdown items={items} dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  );
}
