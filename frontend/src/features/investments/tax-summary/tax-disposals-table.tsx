import { useTranslation } from "react-i18next";
import type { Currency, TaxDisposalResponse } from "@/api/generated/model";
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
import { useIsoDate, useMoney, useQuantityFormat } from "@/hooks/use-formatters";
import { gainTone } from "@/lib/tone";
import { cn } from "@/lib/utils";

interface Props {
  disposals: readonly TaxDisposalResponse[];
  reportingCurrency: Currency;
  accountNames: ReadonlyMap<string, string>;
}

const numericHead = "h-auto py-2 text-right align-bottom whitespace-normal";

export function TaxDisposalsTable({ disposals, reportingCurrency, accountNames }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const quantity = useQuantityFormat();

  function amount(reporting: string, original: string, currency: Currency) {
    return (
      <span className="whitespace-nowrap tabular-nums">
        {money.format(Number(reporting), reportingCurrency)}
        {currency === reportingCurrency ? null : (
          <span className="block text-xs font-normal text-muted-foreground">
            {money.format(Number(original), currency)}
          </span>
        )}
      </span>
    );
  }

  function gain(disposal: TaxDisposalResponse) {
    const value = Number(disposal.reportingGain);

    return (
      <span className={cn("font-semibold whitespace-nowrap tabular-nums", gainTone(value))}>
        {money.formatSigned(value, "auto", reportingCurrency)}
        {disposal.currency === reportingCurrency ? null : (
          <span className="block text-xs font-normal text-muted-foreground">
            {money.formatSigned(Number(disposal.gain), "auto", disposal.currency)}
          </span>
        )}
      </span>
    );
  }

  function lotList(disposal: TaxDisposalResponse) {
    return (
      <ul className="space-y-0.5">
        {disposal.lots.map((lot) => (
          <li key={`${lot.acquiredOn}:${lot.quantity}:${lot.cost}`} className="whitespace-nowrap">
            {t("investments.tax.lot", {
              date: formatDate(lot.acquiredOn),
              quantity: quantity.format(Number(lot.quantity)),
              cost: money.format(Number(lot.reportingCost), reportingCurrency),
            })}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <ScrollRegion className="-mx-3 hidden lg:block" aria-label={t("investments.tax.disposals")}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="align-bottom">{t("investments.tax.soldOn")}</TableHead>
              <TableHead className="align-bottom">{t("investments.tax.security")}</TableHead>
              <TableHead className={numericHead}>{t("investments.tax.quantity")}</TableHead>
              <TableHead className={numericHead}>{t("investments.tax.proceeds")}</TableHead>
              <TableHead className={numericHead}>{t("investments.tax.costBasis")}</TableHead>
              <TableHead className={numericHead}>{t("investments.tax.gain")}</TableHead>
              <TableHead className="align-bottom">{t("investments.tax.lots")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {disposals.length === 0 ? (
              <TableEmptyRow colSpan={7}>{t("investments.tax.noDisposals")}</TableEmptyRow>
            ) : (
              disposals.map((disposal) => (
                <TableRow key={disposal.id}>
                  <TableCell className="tabular-nums">{formatDate(disposal.date)}</TableCell>
                  <TableCell className="max-w-64 whitespace-normal">
                    <p className="font-semibold">{disposal.symbol}</p>
                    <p className="truncate text-xs text-muted-foreground" title={disposal.name}>
                      {disposal.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {accountNames.get(disposal.accountId) ?? ""}
                    </p>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {quantity.format(Number(disposal.quantity))}
                  </TableCell>
                  <TableCell className="text-right">
                    {amount(disposal.reportingProceeds, disposal.proceeds, disposal.currency)}
                  </TableCell>
                  <TableCell className="text-right">
                    {amount(disposal.reportingCostBasis, disposal.costBasis, disposal.currency)}
                  </TableCell>
                  <TableCell className="text-right">{gain(disposal)}</TableCell>
                  <TableCell className="text-xs whitespace-normal text-muted-foreground">
                    {lotList(disposal)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ScrollRegion>

      {disposals.length === 0 ? (
        <EmptyText className="lg:hidden">{t("investments.tax.noDisposals")}</EmptyText>
      ) : null}
      <Rows className="lg:hidden" aria-label={t("investments.tax.disposals")}>
        {disposals.map((disposal) => (
          <li key={disposal.id} className="py-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{disposal.symbol}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatDate(disposal.date)} · {quantity.format(Number(disposal.quantity))}
                </p>
              </div>
              <div className="shrink-0 text-right">{gain(disposal)}</div>
            </div>
            <dl className="mt-1 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5 text-xs">
              <dt className="text-muted-foreground">{t("investments.tax.proceeds")}</dt>
              <dd className="text-right">
                {amount(disposal.reportingProceeds, disposal.proceeds, disposal.currency)}
              </dd>
              <dt className="text-muted-foreground">{t("investments.tax.costBasis")}</dt>
              <dd className="text-right">
                {amount(disposal.reportingCostBasis, disposal.costBasis, disposal.currency)}
              </dd>
              <dt className="text-muted-foreground">{t("investments.tax.lots")}</dt>
              <dd className="text-right text-muted-foreground">{lotList(disposal)}</dd>
            </dl>
          </li>
        ))}
      </Rows>
    </>
  );
}
