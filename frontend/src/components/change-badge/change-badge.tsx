import { ArrowDownRight, ArrowUpRight, Equal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import type { Change, ChangeDirection } from "@/lib/comparison";
import { EXPENSE_TONE, INCOME_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

type ChangeGood = "up" | "down" | "neither";

interface Props {
  change: Change | null;
  good?: ChangeGood;
  currency?: string;
  className?: string;
}

const icons = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: Equal,
} as const;

const tones = {
  better: INCOME_TONE,
  worse: EXPENSE_TONE,
  same: "text-muted-foreground",
} as const;

function verdictOf(direction: ChangeDirection, good: ChangeGood) {
  if (direction === "flat" || good === "neither") {
    return "same";
  }
  return direction === good ? "better" : "worse";
}

export function ChangeBadge({ change, good = "neither", currency, className }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();

  if (!change) {
    return null;
  }

  function share(value: number) {
    if (value === 0) {
      return percent.format(0);
    }
    return (value < 0 ? "−" : "+") + percent.format(Math.abs(value));
  }

  const verdict = verdictOf(change.direction, good);
  const Icon = icons[change.direction];

  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-1 text-xs font-medium tabular-nums",
        tones[verdict],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-3 shrink-0 translate-y-0.5 self-start" />
      <span>{money.formatSigned(change.amount, "auto", currency)}</span>
      <span className="font-normal text-muted-foreground">
        {change.percent === null ? t("reports.comparison.noBase") : `(${share(change.percent)})`}
      </span>
      <span className="sr-only">{t(`reports.comparison.verdict.${verdict}`)}</span>
    </span>
  );
}
