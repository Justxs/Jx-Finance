import { useTranslation } from "react-i18next";
import type { CategoryBreakdownItem } from "@/api/generated/model";
import {
  type BreakdownRow,
  BreakdownList,
  breakdownWeight,
} from "@/components/breakdown-list/breakdown-list";
import { EmptyText } from "@/components/ui/empty-text/empty-text";

const MAX_ROWS = 5;

interface Props {
  items: CategoryBreakdownItem[];
  type?: "expense" | "income";
  dateFrom?: string;
  dateTo?: string;
}

export function CategoryBreakdown({ items, type = "expense", dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();

  const compared = items.some((item) => item.comparisonAmount != null);
  const sorted = items.toSorted((a, b) => breakdownWeight(b) - breakdownWeight(a));
  const rest = sorted.slice(MAX_ROWS);
  const restTotal = rest.reduce((sum, item) => sum + Number(item.amount), 0);
  const restEarlier = rest.reduce((sum, item) => sum + Number(item.comparisonAmount ?? 0), 0);

  function nameOf(item: CategoryBreakdownItem) {
    if (item.syntheticGroup) {
      return t(`reports.syntheticGroups.${item.syntheticGroup}`);
    }
    return item.categoryName ?? t("transactions.uncategorized");
  }

  const rows: BreakdownRow[] = [
    ...sorted.slice(0, MAX_ROWS).map((item) => ({
      key: item.categoryId ?? item.syntheticGroup ?? "uncategorized",
      name: nameOf(item),
      amount: Number(item.amount),
      earlier: compared ? Number(item.comparisonAmount ?? 0) : null,
      filter: item.syntheticGroup || !item.categoryId ? undefined : { categoryId: item.categoryId },
      icon: item.categoryIcon,
    })),
    ...(restTotal > 0 || restEarlier > 0
      ? [
          {
            key: "other",
            name: t("dashboard.other"),
            amount: restTotal,
            earlier: compared ? restEarlier : null,
            icon: "shapes",
          },
        ]
      : []),
  ];

  if (rows.length === 0) {
    return (
      <EmptyText>{type === "income" ? t("reports.noIncome") : t("dashboard.noSpending")}</EmptyText>
    );
  }

  return <BreakdownList rows={rows} type={type} dateFrom={dateFrom} dateTo={dateTo} />;
}
