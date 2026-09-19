import { useTranslation } from "react-i18next";
import type { Currency, HoldingResponse, SecurityResponse } from "@/api/generated/model";
import { ApproximateAmount } from "@/components/approximate-amount";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tag } from "@/components/ui/tag";
import {
  EMPTY_VALUE,
  useIsoDate,
  useMoney,
  usePriceFormat,
  useQuantityFormat,
  useSignedPercent,
} from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";
import { gainTone } from "../gain-tone";

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
  "inline-flex min-h-6 flex-col items-end justify-center rounded-sm text-right underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-11";

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
  const formatDate = useIsoDate();
  const formatPrice = usePriceFormat();
  const quantityFormat = useQuantityFormat();
  const formatPercent = useSignedPercent();

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
          <span className="font-medium text-primary">
            {t("investments.price.set")}
            <span className="sr-only">: {security.symbol}</span>
          </span>
        ) : (
          <>
            <span className="block whitespace-nowrap tabular-nums">
              {formatPrice(Number(security.lastPrice), security.currency)}
            </span>
            <span className="block text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {formatDate(security.lastPriceDate)}
            </span>
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

    const foreign = holding.security.currency !== reportingCurrency;

    return (
      <span className="font-semibold whitespace-nowrap tabular-nums">
        {money.format(Number(holding.marketValue), holding.security.currency)}
        {foreign && holding.marketValueReporting !== null ? (
          <ApproximateAmount
            value={Number(holding.marketValueReporting)}
            currency={reportingCurrency}
          />
        ) : null}
      </span>
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
          <span className="block text-xs">{formatPercent(Number(holding.unrealizedPercent))}</span>
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
      <div
        className="-mx-3 hidden overflow-x-auto lg:block"
        role="region"
        aria-label={label}
        tabIndex={0}
      >
        <Table className={closed ? undefined : "min-w-208"}>
          <TableHeader>
            <TableRow>
              <TableHead>{t("investments.holdings.security")}</TableHead>
              {closed ? null : (
                <>
                  <TableHead className="text-right">{t("investments.holdings.quantity")}</TableHead>
                  <TableHead className="text-right">
                    {t("investments.holdings.averageCost")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("investments.holdings.lastPrice")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("investments.holdings.marketValue")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("investments.holdings.unrealizedGain")}
                  </TableHead>
                </>
              )}
              <TableHead className="text-right">{t("investments.holdings.realizedGain")}</TableHead>
              <TableHead className="text-right">{t("investments.holdings.dividends")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {holdings.map((holding) => {
              const { security } = holding;
              const account = accountName(holding);

              return (
                <TableRow key={rowKey(holding)}>
                  <TableCell className="max-w-64 min-w-44 whitespace-normal">
                    <p className="flex items-center gap-2">
                      <span className="font-semibold">{security.symbol}</span>
                      <Tag>{t(`investments.securityTypes.${security.type}`)}</Tag>
                    </p>
                    <p className="truncate text-xs text-muted-foreground" title={security.name}>
                      {security.name}
                    </p>
                    {account ? (
                      <p className="truncate text-xs text-muted-foreground" title={account}>
                        {account}
                      </p>
                    ) : null}
                  </TableCell>
                  {closed ? null : (
                    <>
                      <TableCell className="text-right tabular-nums">
                        {quantityFormat.format(Number(holding.quantity))}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {formatPrice(Number(holding.averageCost), security.currency)}
                      </TableCell>
                      <TableCell className="text-right">{priceButton(security)}</TableCell>
                      <TableCell className="text-right">{marketValue(holding)}</TableCell>
                      <TableCell className="text-right">{unrealized(holding)}</TableCell>
                    </>
                  )}
                  <TableCell className="text-right">
                    {signedGain(holding.realizedGain, security.currency)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {money.format(Number(holding.dividends), security.currency)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <ul className="rows lg:hidden" aria-label={label}>
        {holdings.map((holding) => {
          const { security } = holding;
          const account = accountName(holding);
          const secondary = [security.name, account].filter(Boolean).join(" · ");

          return (
            <li key={rowKey(holding)} className="py-2.5 text-sm">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2">
                    <span className="font-semibold">{security.symbol}</span>
                    <Tag>{t(`investments.securityTypes.${security.type}`)}</Tag>
                  </p>
                  <p className="truncate text-xs text-muted-foreground" title={secondary}>
                    {secondary}
                  </p>
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
      </ul>
    </>
  );
}
