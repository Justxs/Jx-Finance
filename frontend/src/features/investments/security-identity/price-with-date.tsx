import type { SecurityResponse } from "@/api/generated/model";
import { useIsoDate, usePriceFormat } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

interface Props {
  price: number;
  currency: SecurityResponse["currency"];
  date: SecurityResponse["lastPriceDate"];
  linked?: boolean;
}

export function PriceWithDate({ price, currency, date, linked = false }: Readonly<Props>) {
  const formatDate = useIsoDate();
  const formatPrice = usePriceFormat();

  return (
    <>
      <span
        className={cn(
          "block whitespace-nowrap tabular-nums",
          linked &&
            "underline decoration-muted-foreground/70 decoration-dotted underline-offset-4 group-hover/price:decoration-foreground group-hover/price:decoration-solid",
        )}
      >
        {formatPrice(price, currency)}
      </span>
      <span className="block text-xs whitespace-nowrap text-muted-foreground tabular-nums">
        {formatDate(date)}
      </span>
    </>
  );
}
