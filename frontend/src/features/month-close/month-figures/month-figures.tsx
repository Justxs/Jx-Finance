import { Link } from "@tanstack/react-router";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { CategoryBreakdownItem, ReportSummaryResponse } from "@/api/generated/model";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import { Section, SectionTitle, TitledSection } from "@/components/ui/section/section";
import { SplitColumns } from "@/components/ui/split-columns/split-columns";
import { ReportStats } from "@/features/reports/report-stats/report-stats";
import { useCategoryName } from "@/hooks/use-category-name";
import { useIsoDate, useMoney, usePercent } from "@/hooks/use-formatters";
import { monthBounds } from "@/lib/calendar";
import { changeOf } from "@/lib/comparison";
import { monthDate } from "../month-key";

const MAX_MOVERS = 5;

interface Mover {
  key: string;
  item: CategoryBreakdownItem;
  type: "expense" | "income";
  shift: number;
}

function moversOf(figures: ReportSummaryResponse): Mover[] {
  const all = [
    ...figures.expenseByCategory.map((item) => ({ item, type: "expense" as const })),
    ...figures.incomeByCategory.map((item) => ({ item, type: "income" as const })),
  ];

  return all
    .map(({ item, type }) => ({
      key: `${type}-${item.categoryId ?? item.syntheticGroup ?? "uncategorized"}`,
      item,
      type,
      shift: Math.abs(Number(item.amount) - Number(item.comparisonAmount ?? 0)),
    }))
    .filter((mover) => mover.shift >= 0.005)
    .toSorted((a, b) => b.shift - a.shift)
    .slice(0, MAX_MOVERS);
}

function savingsRate(income: string | undefined, net: string | undefined) {
  const earned = Number(income ?? 0);
  return earned > 0 ? Number(net ?? 0) / earned : null;
}

interface Props {
  month: string;
  figures: ReportSummaryResponse;
}

export function MonthFigures({ month, figures }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();
  const isoDate = useIsoDate();
  const titleId = useId();
  const nameOf = useCategoryName();
  const range = monthBounds(monthDate(month));
  const against = figures.comparison;
  const movers = moversOf(figures);

  const rate = savingsRate(figures.totalIncome, figures.net);
  const earlierRate = against ? savingsRate(against.totalIncome, against.net) : null;

  return (
    <section aria-labelledby={titleId} className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <SectionTitle id={titleId}>{t("monthClose.figures.title")}</SectionTitle>
        {against ? (
          <p className="text-sm text-muted-foreground">
            {t("monthClose.figures.against", {
              from: isoDate(against.periodStart),
              to: isoDate(against.periodEnd),
            })}
          </p>
        ) : null}
      </div>

      <ReportStats
        totalIncome={figures.totalIncome}
        totalExpense={figures.totalExpense}
        net={figures.net}
        comparison={against}
      />

      <SplitColumns className="gap-x-5 gap-y-5 lg:items-start">
        <Section>
          <p className="text-sm text-muted-foreground">{t("monthClose.figures.savingsRate")}</p>
          {rate === null ? (
            <p className="mt-1 text-sm">{t("monthClose.figures.noIncome")}</p>
          ) : (
            <>
              <p className="mt-1 font-serif text-stat font-semibold lining-nums tabular-nums">
                {percent.format(rate)}
              </p>
              {earlierRate === null ? null : (
                <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                  {t("reports.comparison.was", { amount: percent.format(earlierRate) })}
                </p>
              )}
            </>
          )}
        </Section>

        <TitledSection title={t("monthClose.figures.movers")} bodyGap="sm">
          {movers.length === 0 ? (
            <EmptyText>{t("monthClose.figures.noMovers")}</EmptyText>
          ) : (
            <Rows>
              {movers.map(({ key, item, type }) => (
                <li
                  key={key}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
                >
                  {item.categoryId && !item.syntheticGroup ? (
                    <Link
                      to="/transactions"
                      search={{ page: 1, ...range, categoryId: item.categoryId, type }}
                      className="min-w-0 text-sm font-medium wrap-break-word underline-offset-4 hover:underline"
                    >
                      {nameOf(item)}
                    </Link>
                  ) : (
                    <span className="min-w-0 text-sm font-medium wrap-break-word">
                      {nameOf(item)}
                    </span>
                  )}
                  <span className="flex flex-wrap items-baseline justify-end gap-x-2">
                    <span className="text-sm tabular-nums">
                      {money.format(Number(item.amount))}
                    </span>
                    <ChangeBadge
                      change={changeOf(item.amount, item.comparisonAmount ?? 0)}
                      good={type === "income" ? "up" : "down"}
                    />
                  </span>
                </li>
              ))}
            </Rows>
          )}
        </TitledSection>
      </SplitColumns>
    </section>
  );
}
