import { useTranslation } from "react-i18next";
import type { CategoryBreakdownItem } from "@/api/generated/model";
import { type BreakdownRow, BreakdownList } from "@/components/breakdown-list/breakdown-list";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { useCategoryName } from "@/hooks/use-category-name";
import { breakdownCut } from "./category-groups";

interface Props {
  items: CategoryBreakdownItem[];
  type?: "expense" | "income";
  dateFrom?: string;
  dateTo?: string;
}

export function CategoryBreakdown({ items, type = "expense", dateFrom, dateTo }: Readonly<Props>) {
  const { t } = useTranslation();
  const nameOf = useCategoryName();

  const { rows: shown, rest } = breakdownCut(items);
  const restTotal = rest.reduce((sum, item) => sum + Number(item.amount), 0);
  const restEarlier = rest.reduce((sum, item) => sum + Number(item.comparisonAmount ?? 0), 0);

  const rows: BreakdownRow[] = [
    ...shown.map((item) => ({
      key: item.categoryId ?? item.syntheticGroup ?? "uncategorized",
      name: nameOf(item),
      amount: Number(item.amount),
      comparisonAmount: item.comparisonAmount,
      filter: item.syntheticGroup || !item.categoryId ? undefined : { categoryId: item.categoryId },
      icon: item.categoryIcon,
    })),
    ...(restTotal !== 0 || restEarlier !== 0
      ? [
          {
            key: "other",
            name: t("dashboard.other"),
            amount: restTotal,
            comparisonAmount: rest.some((item) => item.comparisonAmount != null)
              ? restEarlier
              : null,
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
