import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { DebtSchedulePlan } from "@/api/generated/model";
import { Pagination } from "@/components/pagination/pagination";
import {
  ScrollRegion,
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
}

export function firstPageToShow(plan: DebtSchedulePlan, asOf: string) {
  const next = plan.rows.findIndex((row) => row.date > asOf);
  const index = next === -1 ? plan.rows.length - 1 : next;
  return Math.floor(Math.max(0, index) / SCHEDULE_PAGE_SIZE) + 1;
}

const numericHead = "text-right";
const numericCell = "text-right tabular-nums";

export function DebtScheduleTable({ plan, asOf }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [page, setPage] = useState(() => firstPageToShow(plan, asOf));
  const pages = usePageClamp({ page, setPage }, plan.rows.length, SCHEDULE_PAGE_SIZE);
  const withExtra = plan.rows.some((row) => Number(row.extra) > 0);
  const start = (page - 1) * SCHEDULE_PAGE_SIZE;
  const rows = plan.rows.slice(start, start + SCHEDULE_PAGE_SIZE);

  function amount(value: string) {
    return money.format(Number(value));
  }

  return (
    <>
      <ScrollRegion className="-mx-3" aria-label={t("netWorth.schedule.table")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={numericHead}>{t("netWorth.schedule.number")}</TableHead>
              <TableHead>{t("netWorth.schedule.date")}</TableHead>
              <TableHead className={numericHead}>{t("netWorth.schedule.payment")}</TableHead>
              <TableHead className={numericHead}>{t("netWorth.schedule.interest")}</TableHead>
              <TableHead className={numericHead}>{t("netWorth.schedule.principal")}</TableHead>
              {withExtra ? (
                <TableHead className={numericHead}>{t("netWorth.schedule.extra")}</TableHead>
              ) : null}
              <TableHead className={numericHead}>{t("netWorth.schedule.balance")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.number}
                className={cn(row.date <= asOf && "text-muted-foreground")}
              >
                <TableCell className={numericCell}>{row.number}</TableCell>
                <TableCell className="tabular-nums">{formatDate(row.date)}</TableCell>
                <TableCell className={cn(numericCell, "font-medium")}>
                  {amount(row.payment)}
                </TableCell>
                <TableCell className={numericCell}>{amount(row.interest)}</TableCell>
                <TableCell className={numericCell}>{amount(row.principal)}</TableCell>
                {withExtra ? (
                  <TableCell className={numericCell}>{amount(row.extra)}</TableCell>
                ) : null}
                <TableCell className={numericCell}>{amount(row.balance)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollRegion>
      <Pagination page={page} pages={pages} onPageChange={setPage} />
    </>
  );
}
