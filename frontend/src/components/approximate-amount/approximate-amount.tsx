import { useMoney } from "@/hooks/use-formatters";

interface Props {
  value: number;
  currency?: string;
}

export function ApproximateAmount({ value, currency }: Readonly<Props>) {
  const money = useMoney();

  return (
    <span className="block text-xs font-normal text-muted-foreground">
      ≈ {money.format(value, currency)}
    </span>
  );
}
