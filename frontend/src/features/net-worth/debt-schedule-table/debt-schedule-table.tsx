import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Currency, DebtSchedulePlan } from "@/api/generated/model";
import { Pagination } from "@/components/pagination/pagination";
import { Rows } from "@/components/ui/rows/rows";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";
import { usePageClamp } from "@/hooks/use-paged-list";
import { cn } from "@/lib/utils";

export const SCHEDULE_PAGE_SIZE = 12;

interface Props {
  plan: DebtSchedulePlan;
  asOf: string;
  currency: Currency;
}

export function firstPageToShow(plan: DebtSchedulePlan, asOf: string) {
  const next = plan.rows.findIndex((row) => row.date > asOf);
  const index = next === -1 ? plan.rows.length - 1 : next;
  return Math.floor(Math.max(0, index) / SCHEDULE_PAGE_SIZE) + 1;
}

export function DebtScheduleTable({ plan, asOf, currency }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [page, setPage] = useState(() => firstPageToShow(plan, asOf));
  const pages = usePageClamp({ page, setPage }, plan.rows.length, SCHEDULE_PAGE_SIZE);
  const withExtra = plan.rows.some((row) => Number(row.extra) > 0);
  const start = (page - 1) * SCHEDULE_PAGE_SIZE;
  const rows = plan.rows.slice(start, start + SCHEDULE_PAGE_SIZE);

  function amount(value: string) {
    return money.format(Number(value), currency);
  }

  function isPaid(date: string) {
    return date <= asOf;
  }

  function figures(row: (typeof rows)[number]) {
    return [
      ["interest", row.interest],
      ["principal", row.principal],
      ...(withExtra ? ([["extra", row.extra]] as const) : []),
      ["balance", row.balance],
    ] as const;
  }

  return (
    <>
      <div className="hidden sm:block">
        <Table label={t("netWorth.schedule.table")}>
          <TableHeader>
            <TableRow>
              <TableHead numeric>{t("netWorth.schedule.number")}</TableHead>
              <TableHead>{t("netWorth.schedule.date")}</TableHead>
              <TableHead numeric>{t("netWorth.schedule.payment")}</TableHead>
              <TableHead numeric>{t("netWorth.schedule.interest")}</TableHead>
              <TableHead numeric>{t("netWorth.schedule.principal")}</TableHead>
              {withExtra ? <TableHead numeric>{t("netWorth.schedule.extra")}</TableHead> : null}
              <TableHead numeric>{t("netWorth.schedule.balance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.number}
                className={cn(isPaid(row.date) && "text-muted-foreground")}
              >
                <TableCell numeric>{row.number}</TableCell>
                <TableCell className="tabular-nums">
                  {formatDate(row.date)}
                  {isPaid(row.date) ? (
                    <span className="sr-only"> · {t("netWorth.schedule.paid")}</span>
                  ) : null}
                </TableCell>
                <TableCell numeric className="font-medium">
                  {amount(row.payment)}
                </TableCell>
                <TableCell numeric>{amount(row.interest)}</TableCell>
                <TableCell numeric>{amount(row.principal)}</TableCell>
                {withExtra ? <TableCell numeric>{amount(row.extra)}</TableCell> : null}
                <TableCell numeric>{amount(row.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Rows className="sm:hidden" aria-label={t("netWorth.schedule.table")}>
        {rows.map((row) => (
          <li
            key={row.number}
            className={cn("py-2.5 text-sm", isPaid(row.date) && "text-muted-foreground")}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="tabular-nums">
                <span className="text-muted-foreground">{row.number}.</span> {formatDate(row.date)}
                {isPaid(row.date) ? (
                  <span className="sr-only"> · {t("netWorth.schedule.paid")}</span>
                ) : null}
              </p>
              <p className="font-medium whitespace-nowrap tabular-nums">
                <span className="sr-only">{t("netWorth.schedule.payment")}: </span>
                {amount(row.payment)}
              </p>
            </div>
            <dl className="mt-1 grid grid-cols-2 gap-x-6 gap-y-0.5 text-xs">
              {figures(row).map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t(`netWorth.schedule.${key}`)}</dt>
                  <dd className="whitespace-nowrap tabular-nums">{amount(value)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </Rows>
      <Pagination
        page={page}
        pages={pages}
        range={{ total: plan.rows.length, pageSize: SCHEDULE_PAGE_SIZE }}
        onPageChange={setPage}
      />
    </>
  );
}
