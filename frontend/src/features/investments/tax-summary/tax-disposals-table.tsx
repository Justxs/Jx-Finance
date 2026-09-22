import { useTranslation } from "react-i18next";
import type { Currency, TaxDisposalResponse } from "@/api/generated/model";
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
import { useIsoDate, useMoney, useQuantityFormat } from "@/hooks/use-formatters";

interface Props {
  disposals: readonly TaxDisposalResponse[];
  reportingCurrency: Currency;
  accountNames: ReadonlyMap<string, string>;
}

export function TaxDisposalsTable({ disposals, reportingCurrency, accountNames }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const quantity = useQuantityFormat();

  function amount(reporting: string, original: string, currency: Currency) {
    return (
      <DualCurrencyAmount
        value={Number(reporting)}
        currency={reportingCurrency}
        secondaryValue={Number(original)}
        secondaryCurrency={currency}
      />
    );
  }

  function gain(disposal: TaxDisposalResponse) {
    return (
      <DualCurrencyAmount
        value={Number(disposal.reportingGain)}
        currency={reportingCurrency}
        secondaryValue={Number(disposal.gain)}
        secondaryCurrency={disposal.currency}
        signed
        strong
      />
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
              <TableHead numeric wrap>
                {t("investments.tax.quantity")}
              </TableHead>
              <TableHead numeric wrap>
                {t("investments.tax.proceeds")}
              </TableHead>
              <TableHead numeric wrap>
                {t("investments.tax.costBasis")}
              </TableHead>
              <TableHead numeric wrap>
                {t("investments.tax.gain")}
              </TableHead>
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
                  <TableCell numeric>{quantity.format(Number(disposal.quantity))}</TableCell>
                  <TableCell numeric>
                    {amount(disposal.reportingProceeds, disposal.proceeds, disposal.currency)}
                  </TableCell>
                  <TableCell numeric>
                    {amount(disposal.reportingCostBasis, disposal.costBasis, disposal.currency)}
                  </TableCell>
                  <TableCell numeric>{gain(disposal)}</TableCell>
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
