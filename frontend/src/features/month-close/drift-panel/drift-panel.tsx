import { Link } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { MonthDrift, MonthDriftRow, ReportSummaryResponse } from "@/api/generated/model";
import { ChangeBadge } from "@/components/change-badge/change-badge";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
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
import { Tag } from "@/components/ui/tag/tag";
import { useCategoryName } from "@/hooks/use-category-name";
import { useDateTime, useIsoDate, useMoney, useNumberFormat } from "@/hooks/use-formatters";
import { changeOf } from "@/lib/comparison";
import { EXPENSE_TONE } from "@/lib/tone";

const linkClass = "min-w-0 font-medium wrap-break-word underline-offset-4 hover:underline";

function RowTarget({ row, children }: Readonly<{ row: MonthDriftRow; children: ReactNode }>) {
  if (row.kind === "investmentEntry") {
    return (
      <Link to="/investments" className={linkClass}>
        {children}
      </Link>
    );
  }
  if (row.change === "deleted") {
    return (
      <Link to="/profile" search={{ section: "trash" }} className={linkClass}>
        {children}
      </Link>
    );
  }
  return (
    <Link
      to="/transactions"
      search={{ page: 1, dateFrom: row.date, dateTo: row.date }}
      className={linkClass}
    >
      {children}
    </Link>
  );
}

interface Props {
  drift: MonthDrift;
  figures: ReportSummaryResponse;
}

export function DriftPanel({ drift, figures }: Readonly<Props>) {
  const { t } = useTranslation();
  const categoryName = useCategoryName();
  const money = useMoney();
  const count = useNumberFormat();
  const isoDate = useIsoDate();
  const dateTime = useDateTime();
  const { totals } = drift;

  if (drift.currencyChanged) {
    return (
      <TitledSection title={t("monthClose.drift.title")}>
        <p role="alert" className="mt-2 flex max-w-prose items-start gap-2 text-sm">
          <TriangleAlert aria-hidden="true" className={`mt-0.5 size-4 shrink-0 ${EXPENSE_TONE}`} />
          {t("monthClose.drift.currencyChanged", { currency: drift.closedCurrency.toUpperCase() })}
        </p>
      </TitledSection>
    );
  }

  const figureRows = totals
    ? ([
        { key: "income", closed: totals.closedIncome, now: figures.totalIncome, good: "up" },
        { key: "expense", closed: totals.closedExpense, now: figures.totalExpense, good: "down" },
        { key: "net", closed: totals.closedNet, now: figures.net, good: "up" },
      ] as const)
    : [];
  const changed = figureRows.filter((row) => Number(row.closed) !== Number(row.now));
  const countChanged = totals !== null && totals.closedCount !== totals.currentCount;
  const figuresUnchanged = totals !== null && changed.length === 0 && drift.categories.length === 0;

  return (
    <TitledSection
      title={t("monthClose.drift.title")}
      description={t("monthClose.drift.description")}
    >
      <div className="mt-4 space-y-6">
        {figuresUnchanged ? (
          <p className="text-sm text-muted-foreground">{t("monthClose.drift.figuresUnchanged")}</p>
        ) : null}
        {changed.length > 0 || countChanged ? (
          <ScrollRegion aria-label={t("monthClose.drift.description")}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <span className="sr-only">{t("monthClose.drift.figure")}</span>
                  </TableHead>
                  <TableHead numeric>{t("monthClose.drift.closed")}</TableHead>
                  <TableHead numeric>{t("monthClose.drift.now")}</TableHead>
                  <TableHead numeric>{t("monthClose.drift.difference")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {changed.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">
                      {t(`monthClose.drift.${row.key}`)}
                    </TableCell>
                    <TableCell numeric>{money.format(Number(row.closed))}</TableCell>
                    <TableCell numeric>{money.format(Number(row.now))}</TableCell>
                    <TableCell numeric>
                      <ChangeBadge change={changeOf(row.now, row.closed)} good={row.good} />
                    </TableCell>
                  </TableRow>
                ))}
                {totals && countChanged ? (
                  <TableRow>
                    <TableCell className="font-medium">{t("monthClose.drift.count")}</TableCell>
                    <TableCell numeric>{count.format(totals.closedCount)}</TableCell>
                    <TableCell numeric>{count.format(totals.currentCount)}</TableCell>
                    <TableCell numeric className="text-muted-foreground">
                      {count.format(totals.currentCount - totals.closedCount)}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </ScrollRegion>
        ) : null}

        {drift.categories.length > 0 ? (
          <div>
            <h3 className="text-sm font-medium">{t("monthClose.drift.categories")}</h3>
            <Rows className="mt-1">
              {drift.categories.map((category) => (
                <li
                  key={`${category.type}-${category.categoryId ?? category.syntheticGroup ?? "none"}`}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
                >
                  <span className="min-w-0 text-sm wrap-break-word">{categoryName(category)}</span>
                  <span className="flex flex-wrap items-baseline justify-end gap-x-2 text-sm tabular-nums">
                    <span className="text-muted-foreground">
                      {money.format(Number(category.closedAmount))} →
                    </span>
                    <span>{money.format(Number(category.currentAmount))}</span>
                    <ChangeBadge
                      change={changeOf(category.currentAmount, category.closedAmount)}
                      good={category.type === "income" ? "up" : "down"}
                    />
                  </span>
                </li>
              ))}
            </Rows>
          </div>
        ) : null}

        <div>
          <h3 className="text-sm font-medium">{t("monthClose.drift.rows")}</h3>
          {drift.rows.length === 0 ? (
            <EmptyText>{t("monthClose.drift.noRows")}</EmptyText>
          ) : (
            <>
              <Rows className="mt-1">
                {drift.rows.map((row) => (
                  <li
                    key={row.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-0.5 py-2.5 text-sm"
                  >
                    <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                      <RowTarget row={row}>
                        {row.description ??
                          (row.kind === "investmentEntry"
                            ? t("monthClose.drift.investmentEntry")
                            : t("monthClose.drift.noDescription"))}
                      </RowTarget>
                      <Tag tone="accent">{t(`monthClose.drift.change.${row.change}`)}</Tag>
                    </span>
                    <span className="text-right tabular-nums">
                      {money.format(Number(row.amount), row.currency)}
                    </span>
                    <span className="col-span-2 text-xs text-muted-foreground tabular-nums">
                      {isoDate(row.date)} ·{" "}
                      {t("monthClose.drift.changedOn", { date: dateTime(row.changedAt) })}
                    </span>
                  </li>
                ))}
              </Rows>
              {drift.rowCount > drift.rows.length ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("monthClose.drift.moreRows", {
                    shown: drift.rows.length,
                    count: drift.rowCount,
                  })}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </TitledSection>
  );
}
