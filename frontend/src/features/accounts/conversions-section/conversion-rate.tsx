import { useTranslation } from "react-i18next";
import { useExchangeRate } from "@/api/generated";
import type { Currency } from "@/api/generated/model";
import { EMPTY_VALUE, useIsoDate, useRateFormat } from "@/hooks/use-formatters";
import { silentQuery } from "@/lib/mutations";
import { isPositiveMoney, normalizeMoney } from "@/lib/validation";

interface RateProps {
  fromAmount: string;
  fromCurrency: Currency;
  toAmount: string;
  toCurrency: Currency;
  date: string;
}

export function ConversionRate({
  fromAmount,
  fromCurrency,
  toAmount,
  toCurrency,
  date,
}: Readonly<RateProps>) {
  const { t } = useTranslation();
  const formatDate = useIsoDate();
  const rateFormat = useRateFormat();
  const reference = useExchangeRate(
    { from: fromCurrency, to: toCurrency, date },
    {
      query: { enabled: fromCurrency !== toCurrency && date !== "", ...silentQuery },
    },
  );

  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  const hasAmounts = isPositiveMoney(fromAmount) && isPositiveMoney(toAmount);
  const yourRate = hasAmounts
    ? Number(normalizeMoney(toAmount)) / Number(normalizeMoney(fromAmount))
    : null;

  return (
    <dl className="col-span-full space-y-1 border-y border-rule py-2.5 text-sm">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t("conversions.yourRate")}</dt>
        <dd className="font-semibold tabular-nums">
          {yourRate === null ? EMPTY_VALUE : `1 ${from} = ${rateFormat.format(yourRate)} ${to}`}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">{t("conversions.referenceRate")}</dt>
        <dd className="tabular-nums" aria-busy={reference.isFetching}>
          {reference.data
            ? `1 ${from} = ${rateFormat.format(Number(reference.data.rate))} ${to} · ${formatDate(reference.data.asOf)}`
            : EMPTY_VALUE}
        </dd>
      </div>
    </dl>
  );
}
