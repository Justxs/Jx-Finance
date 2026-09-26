import { useTranslation } from "react-i18next";
import type { Currency, TaxCashEntryResponse } from "@/api/generated/model";
import { DualCurrencyAmount } from "@/components/approximate-amount/dual-currency-amount";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import {
  ScrollRegion,
  Table,
  TableBody,
  TableCell,
  TableEmptyRow,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table/table";
import { useIsoDate } from "@/hooks/use-formatters";
import { metaLine } from "@/lib/utils";

interface Props {
  label: string;
  empty: string;
  entries: readonly TaxCashEntryResponse[];
  reportingCurrency: Currency;
  accountNames: ReadonlyMap<string, string>;
}

export function TaxCashTable({
  label,
  empty,
  entries,
  reportingCurrency,
  accountNames,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();

  function amount(entry: TaxCashEntryResponse) {
    return (
      <DualCurrencyAmount
        value={Number(entry.reportingAmount)}
        currency={reportingCurrency}
        secondaryValue={Number(entry.amount)}
        secondaryCurrency={entry.currency}
        strong
      />
    );
  }

  function source(entry: TaxCashEntryResponse) {
    return metaLine(entry.symbol, entry.description, accountNames.get(entry.accountId));
  }

  return (
    <>
      <ScrollRegion className="-mx-3 hidden sm:block" aria-label={label}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("investments.tax.date")}</TableHead>
              <TableHead>{t("investments.tax.kind")}</TableHead>
              <TableHead>{t("investments.tax.source")}</TableHead>
              <TableHead numeric>{t("investments.tax.amount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 ? (
              <TableEmptyRow colSpan={4}>{empty}</TableEmptyRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="tabular-nums">{formatDate(entry.date)}</TableCell>
                  <TableCell>{t(`investments.types.${entry.type}`)}</TableCell>
                  <TableCell className="max-w-72 truncate" title={source(entry)}>
                    {source(entry)}
                  </TableCell>
                  <TableCell numeric>{amount(entry)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollRegion>

      {entries.length === 0 ? <EmptyText className="sm:hidden">{empty}</EmptyText> : null}
      <Rows className="sm:hidden" aria-label={label}>
        {entries.map((entry) => (
          <li key={entry.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{t(`investments.types.${entry.type}`)}</p>
              <p className="truncate text-xs text-muted-foreground">
                {metaLine(formatDate(entry.date), source(entry))}
              </p>
            </div>
            <div className="shrink-0 text-right">{amount(entry)}</div>
          </li>
        ))}
      </Rows>
    </>
  );
}
