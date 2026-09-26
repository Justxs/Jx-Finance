import { useTranslation } from "react-i18next";
import type { Currency, HoldingResponse, SecurityResponse } from "@/api/generated/model";
import { DualCurrencyAmount } from "@/components/approximate-amount/dual-currency-amount";
import { Rows } from "@/components/ui/rows/rows";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ScrollRegion,
} from "@/components/ui/table/table";
import {
  EMPTY_VALUE,
  signed,
  useMoney,
  useNumberFormat,
  usePriceFormat,
  useQuantityFormat,
} from "@/hooks/use-formatters";
import { gainTone } from "@/lib/tone";
import { cn, metaLine } from "@/lib/utils";
import { PriceWithDate, SecurityIdentity } from "../security-identity";

interface Props {
  label: string;
  holdings: readonly HoldingResponse[];
  reportingCurrency: Currency;
  accountNames: ReadonlyMap<string, string>;
  sharedSecurityIds: ReadonlySet<string>;
  closed?: boolean;
  onEditPrice: (security: SecurityResponse) => void;
}

const priceButtonClass =
  "inline-flex min-h-6 flex-col items-end justify-center group/price rounded-sm text-right outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-11";

function rowKey(holding: HoldingResponse) {
  return `${holding.accountId}:${holding.security.id}`;
}

export function PositionsTable({
  label,
  holdings,
  reportingCurrency,
  accountNames,
  sharedSecurityIds,
  closed = false,
  onEditPrice,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatPrice = usePriceFormat();
  const quantityFormat = useQuantityFormat();
  const percent = useNumberFormat({
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  function accountName(holding: HoldingResponse) {
    return sharedSecurityIds.has(holding.security.id)
      ? (accountNames.get(holding.accountId) ?? null)
      : null;
  }

  function priceButton(security: SecurityResponse) {
    const actionLabel = `${t("investments.price.update")}: ${security.symbol}`;

    return (
      <button type="button" className={priceButtonClass} onClick={() => onEditPrice(security)}>
        {security.lastPrice === null ? (
          <span className="font-medium text-primary underline-offset-4 group-hover/price:underline">
            {t("investments.price.set")}
            <span className="sr-only">: {security.symbol}</span>
          </span>
        ) : (
          <>
            <PriceWithDate
              price={Number(security.lastPrice)}
              currency={security.currency}
              date={security.lastPriceDate}
              linked
            />
            <span className="sr-only">{actionLabel}</span>
          </>
        )}
      </button>
    );
  }

  function marketValue(holding: HoldingResponse) {
    if (holding.marketValue === null) {
      return <span className="text-muted-foreground">{EMPTY_VALUE}</span>;
    }

    return (
      <DualCurrencyAmount
        value={Number(holding.marketValue)}
        currency={holding.security.currency}
        secondaryValue={
          holding.marketValueReporting === null ? null : Number(holding.marketValueReporting)
        }
        secondaryCurrency={reportingCurrency}
        approximate
        strong
      />
    );
  }

  function unrealized(holding: HoldingResponse) {
    if (holding.unrealizedGain === null) {
      return <span className="text-muted-foreground">{EMPTY_VALUE}</span>;
    }

    const gain = Number(holding.unrealizedGain);

    return (
      <span className={cn("whitespace-nowrap tabular-nums", gainTone(gain))}>
        {money.formatSigned(gain, "auto", holding.security.currency)}
        {holding.unrealizedPercent === null ? null : (
          <span className="block text-xs">
            {signed(Number(holding.unrealizedPercent), (magnitude) =>
              percent.format(magnitude / 100),
            )}
          </span>
        )}
      </span>
    );
  }

  function signedGain(value: string, currency: Currency) {
    const gain = Number(value);

    return (
      <span className={cn("whitespace-nowrap tabular-nums", gainTone(gain))}>
        {money.formatSigned(gain, "auto", currency)}
      </span>
    );
  }

  return (
    <>
      <ScrollRegion className="-mx-3 hidden lg:block" aria-label={label}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="align-bottom">{t("investments.holdings.security")}</TableHead>
              {closed ? null : (
                <>
                  <TableHead numeric wrap>
                    {t("investments.holdings.quantity")}
                  </TableHead>
                  <TableHead numeric wrap>
                    {t("investments.holdings.averageCost")}
                  </TableHead>
                  <TableHead numeric wrap>
                    {t("investments.holdings.lastPrice")}
                  </TableHead>
                  <TableHead numeric wrap>
                    {t("investments.holdings.marketValue")}
                  </TableHead>
                  <TableHead numeric wrap>
                    {t("investments.holdings.unrealizedGain")}
                  </TableHead>
                </>
              )}
              <TableHead numeric wrap>
                {t("investments.holdings.realizedGain")}
              </TableHead>
              <TableHead numeric wrap>
                {t("investments.holdings.dividends")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => {
              const { security } = holding;
              const account = accountName(holding);

              return (
                <TableRow key={rowKey(holding)}>
                  <TableCell className="max-w-64 min-w-36 whitespace-normal">
                    <SecurityIdentity security={security} meta={security.name} detail={account} />
                  </TableCell>
                  {closed ? null : (
                    <>
                      <TableCell numeric>
                        {quantityFormat.format(Number(holding.quantity))}
                      </TableCell>
                      <TableCell numeric className="text-muted-foreground">
                        {formatPrice(Number(holding.averageCost), security.currency)}
                      </TableCell>
                      <TableCell numeric>{priceButton(security)}</TableCell>
                      <TableCell numeric>{marketValue(holding)}</TableCell>
                      <TableCell numeric>{unrealized(holding)}</TableCell>
                    </>
                  )}
                  <TableCell numeric>
                    {signedGain(holding.realizedGain, security.currency)}
                  </TableCell>
                  <TableCell numeric>
                    {money.format(Number(holding.dividends), security.currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </ScrollRegion>

      <Rows className="lg:hidden" aria-label={label}>
        {holdings.map((holding) => {
          const { security } = holding;
          const account = accountName(holding);
          const secondary = metaLine(security.name, account);

          return (
            <li key={rowKey(holding)} className="py-2.5 text-sm">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <SecurityIdentity security={security} meta={secondary} />
                </div>
                <div className="shrink-0 text-right">
                  {closed
                    ? signedGain(holding.realizedGain, security.currency)
                    : marketValue(holding)}
                </div>
              </div>
              {closed ? (
                <dl className="mt-1 flex justify-between gap-2 text-xs">
                  <dt className="text-muted-foreground">{t("investments.holdings.dividends")}</dt>
                  <dd className="whitespace-nowrap tabular-nums">
                    {money.format(Number(holding.dividends), security.currency)}
                  </dd>
                </dl>
              ) : (
                <>
                  <div className="mt-1 flex items-start justify-between gap-3 text-xs">
                    <p className="min-w-0 text-muted-foreground tabular-nums">
                      {t("investments.holdings.quantityAtCost", {
                        quantity: quantityFormat.format(Number(holding.quantity)),
                        cost: formatPrice(Number(holding.averageCost), security.currency),
                      })}
                    </p>
                    <div className="shrink-0 text-right text-sm">{unrealized(holding)}</div>
                  </div>
                  <dl className="mt-1 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5 text-xs">
                    <dt className="text-muted-foreground">{t("investments.holdings.lastPrice")}</dt>
                    <dd className="flex justify-end">{priceButton(security)}</dd>
                    <dt className="text-muted-foreground">
                      {t("investments.holdings.realizedGain")}
                    </dt>
                    <dd className="text-right">
                      {signedGain(holding.realizedGain, security.currency)}
                    </dd>
                    <dt className="text-muted-foreground">{t("investments.holdings.dividends")}</dt>
                    <dd className="text-right whitespace-nowrap tabular-nums">
                      {money.format(Number(holding.dividends), security.currency)}
                    </dd>
                  </dl>
                </>
              )}
            </li>
          );
        })}
      </Rows>
    </>
  );
}
