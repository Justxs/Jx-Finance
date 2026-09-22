import { useMoney } from "@/hooks/use-formatters";
import { gainTone } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { ApproximateAmount } from "./approximate-amount";

interface Props {
  value: number;
  currency: string;
  secondaryValue?: number | null;
  secondaryCurrency: string;
  approximate?: boolean;
  signed?: boolean;
  strong?: boolean;
}

export function DualCurrencyAmount({
  value,
  currency,
  secondaryValue = null,
  secondaryCurrency,
  approximate = false,
  signed = false,
  strong = false,
}: Readonly<Props>) {
  const money = useMoney();

  function format(amount: number, amountCurrency: string) {
    return signed
      ? money.formatSigned(amount, "auto", amountCurrency)
      : money.format(amount, amountCurrency);
  }

  function renderSecondary(amount: number) {
    if (approximate) {
      return <ApproximateAmount value={amount} currency={secondaryCurrency} />;
    }

    return (
      <span className="block text-xs font-normal text-muted-foreground">
        {format(amount, secondaryCurrency)}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "whitespace-nowrap tabular-nums",
        strong && "font-semibold",
        signed && gainTone(value),
      )}
    >
      {format(value, currency)}
      {secondaryValue === null || secondaryCurrency === currency
        ? null
        : renderSecondary(secondaryValue)}
    </span>
  );
}
