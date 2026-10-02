import type { ReactNode } from "react";
import { type MoneySign, useMoney } from "@/hooks/use-formatters";
import { gainTone } from "@/lib/tone";
import { cn } from "@/lib/utils";

interface Props {
  value: number;
  currency?: string;
  sign?: MoneySign;
  className?: string;
  children?: ReactNode;
}

export function SignedAmount({
  value,
  currency,
  sign = "auto",
  className,
  children,
}: Readonly<Props>) {
  const money = useMoney();

  return (
    <span className={cn("tabular-nums", gainTone(value, sign) ?? "text-foreground", className)}>
      {money.formatSigned(value, sign, currency)}
      {children}
    </span>
  );
}
