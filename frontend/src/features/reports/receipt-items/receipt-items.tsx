import { useDeferredValue, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReceiptItemsSuspense } from "@/api/generated";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Input } from "@/components/ui/input/input";
import { TitledSection } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableSkeleton,
} from "@/components/ui/table/table";
import { useDebouncedDraft } from "@/hooks/use-debounced-draft";
import { useIsoDate, useMoney } from "@/hooks/use-formatters";

const SEARCH_WAIT_MS = 300;

interface RangeProps {
  dateFrom: string;
  dateTo: string;
}

function ItemsTable({ dateFrom, dateTo, search }: Readonly<RangeProps & { search: string }>) {
  const { t } = useTranslation();
  const money = useMoney();
  const isoDate = useIsoDate();
  const { items, receipts } = useReceiptItemsSuspense({
    dateFrom,
    dateTo,
    search: search || undefined,
  }).data;

  if (items.length === 0) {
    return (
      <EmptyText size="sm">
        {receipts === 0
          ? t("reports.receiptItems.noReceipts")
          : t("reports.receiptItems.noMatches")}
      </EmptyText>
    );
  }

  return (
    <Table label={t("reports.receiptItems.table")} className="min-w-100">
      <TableHeader>
        <TableRow>
          <TableHead>{t("reports.receiptItems.item")}</TableHead>
          <TableHead numeric>{t("reports.receiptItems.bought")}</TableHead>
          <TableHead numeric>{t("reports.receiptItems.amount")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow key={`${item.key}-${item.currency}`}>
            <TableCell className="whitespace-normal">
              <span className="block font-medium">{item.name}</span>
              <span className="block text-xs text-muted-foreground">
                {t("reports.receiptItems.last", { date: isoDate(item.lastBought) })}
              </span>
            </TableCell>
            <TableCell numeric>{t("reports.receiptItems.times", { count: item.count })}</TableCell>
            <TableCell numeric>{money.format(Number(item.amount), item.currency)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function ReceiptItems({ dateFrom, dateTo }: Readonly<RangeProps>) {
  const { t } = useTranslation();
  const searchId = useId();
  const [search, setSearch] = useState("");
  const text = useDebouncedDraft(search, setSearch, SEARCH_WAIT_MS);
  const shownSearch = useDeferredValue(search);

  return (
    <TitledSection title={t("reports.receiptItems.title")} bodyGap="md">
      <p className="text-sm text-muted-foreground">{t("reports.receiptItems.hint")}</p>
      <FieldShell id={searchId} label={t("reports.receiptItems.search")} className="max-w-xs">
        <Input
          id={searchId}
          type="search"
          value={text.draft}
          onChange={(event) => text.change(event.target.value)}
        />
      </FieldShell>
      <QueryBoundary
        fallback={<TableSkeleton rows={5} columns={3} lines={2} />}
        errorSubject={t("reports.receiptItems.title")}
      >
        <StaleRegion stale={shownSearch !== search}>
          <ItemsTable dateFrom={dateFrom} dateTo={dateTo} search={shownSearch} />
        </StaleRegion>
      </QueryBoundary>
    </TitledSection>
  );
}
