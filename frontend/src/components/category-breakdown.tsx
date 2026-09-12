import { useTranslation } from "react-i18next";
import type { CategoryBreakdownItem } from "@/api/generated/model";
import { useMoney } from "@/hooks/use-formatters";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];
const MAX_SLICES = 5;

interface Props {
  items: CategoryBreakdownItem[];
}

export function CategoryBreakdown({ items }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();

  const sorted = [...items].sort((a, b) => Number(b.amount) - Number(a.amount));
  const top = sorted.slice(0, MAX_SLICES);
  const rest = sorted.slice(MAX_SLICES);
  const restTotal = rest.reduce((sum, item) => sum + Number(item.amount), 0);

  const chartData = [
    ...top.map((item, index) => ({
      name: item.categoryName ?? t("transactions.uncategorized"),
      amount: Number(item.amount),
      fill: CHART_COLORS[index % CHART_COLORS.length],
    })),
    ...(restTotal > 0
      ? [
          {
            name: t("dashboard.other"),
            amount: restTotal,
            fill: CHART_COLORS[MAX_SLICES % CHART_COLORS.length],
          },
        ]
      : []),
  ];

  if (chartData.length === 0) {
    return <p className="px-6 py-8 text-sm text-muted-foreground">{t("dashboard.noSpending")}</p>;
  }

  const maximum = Math.max(...chartData.map((item) => item.amount));

  return (
    <ul className="space-y-4">
      {chartData.map((item) => (
        <li key={item.name} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
            <span className="min-w-0 break-words">{item.name}</span>
            <span className="break-words font-medium tabular-nums">
              {money.format(item.amount)}
            </span>
          </div>
          <div aria-hidden="true" className="h-2 rounded-sm bg-muted">
            <div
              className="h-full rounded-sm"
              style={{
                width: `${maximum > 0 ? (item.amount / maximum) * 100 : 0}%`,
                backgroundColor: item.fill,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
