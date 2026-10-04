import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Rows } from "@/components/ui/rows/rows";
import { Tag } from "@/components/ui/tag/tag";
import { ShowcaseCard, useSampleMoney } from "@/features/landing/showcase/showcase";
import { useMonthName, useShortDayIso } from "@/hooks/use-formatters";
import type { TranslationKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface SampleRow {
  date: string;
  payee: string | { key: TranslationKey };
  category: TranslationKey;
  account: TranslationKey;
  amount: number;
}

export const SAMPLE_MONTH = "2026-09";

export const sampleRows: readonly SampleRow[] = [
  {
    date: "2026-09-01",
    payee: { key: "landing.sample.salary" },
    category: "landing.sample.wages",
    account: "landing.sample.mainAccount",
    amount: 2840,
  },
  {
    date: "2026-09-03",
    payee: "Maxima",
    category: "landing.sample.groceries",
    account: "landing.sample.mainAccount",
    amount: -64.18,
  },
  {
    date: "2026-09-05",
    payee: "Ignitis",
    category: "landing.sample.utilities",
    account: "landing.sample.mainAccount",
    amount: -58.4,
  },
  {
    date: "2026-09-10",
    payee: { key: "landing.sample.rent" },
    category: "landing.sample.housing",
    account: "landing.sample.jointAccount",
    amount: -650,
  },
  {
    date: "2026-09-18",
    payee: "Lidl Žirmūnai",
    category: "landing.sample.groceries",
    account: "landing.sample.jointAccount",
    amount: -41.27,
  },
  {
    date: "2026-09-24",
    payee: "Bolt",
    category: "landing.sample.transport",
    account: "landing.sample.mainAccount",
    amount: -12.6,
  },
];

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

export function SampleLedger({
  className,
  delay,
}: Readonly<{ className?: string; delay?: number }>) {
  const { t } = useTranslation();
  const titleId = useId();
  const money = useSampleMoney();
  const day = useShortDayIso();
  const monthName = useMonthName();

  const amounts = sampleRows.map((row) => row.amount);
  const income = sum(amounts.filter((amount) => amount > 0));
  const expenses = sum(amounts.filter((amount) => amount < 0));
  const net = income + expenses;

  const format = money.signed;

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p id={titleId} className="text-sm font-semibold">
          {t("landing.sample.title", { month: monthName(SAMPLE_MONTH) })}
        </p>
        <Tag>{t("landing.sample.tag")}</Tag>
      </div>

      <Rows aria-label={t("landing.sample.label")} className="mt-3">
        {sampleRows.map((row, index) => (
          <li
            key={row.date}
            style={{ "--row": index }}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 py-2.5 motion-safe:animate-settle-in @sm:grid-cols-[4rem_minmax(0,1fr)_auto] @sm:items-baseline"
          >
            <span className="hidden text-xs text-muted-foreground tabular-nums @sm:block">
              {day(row.date)}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">
                {typeof row.payee === "string" ? row.payee : t(row.payee.key)}
              </span>
              <span className="block text-xs text-muted-foreground">
                <span className="tabular-nums @sm:hidden">{day(row.date)} · </span>
                {t(row.category)} · {t(row.account)}
              </span>
            </span>
            <span
              className={cn(
                "text-right text-sm font-semibold whitespace-nowrap tabular-nums",
                row.amount > 0 && "text-income",
              )}
            >
              {format(row.amount)}
            </span>
          </li>
        ))}
      </Rows>

      <p className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-0.5 border-t pt-2.5 text-sm text-muted-foreground tabular-nums @sm:gap-x-2">
        <span className="whitespace-nowrap">
          {t("transactions.count", { count: sampleRows.length })}
        </span>
        <span aria-hidden="true" className="hidden @sm:inline">
          ·
        </span>
        <span className="whitespace-nowrap">
          <span className="font-semibold text-income">{format(income)}</span>{" "}
          {t("transactions.totalIncome")}
        </span>
        <span aria-hidden="true" className="hidden @sm:inline">
          ·
        </span>
        <span className="whitespace-nowrap">
          <span className="font-semibold text-foreground">{format(expenses)}</span>{" "}
          {t("transactions.totalExpense")}
        </span>
      </p>

      <div className="mt-6 flex items-end justify-between gap-4">
        <span className="pb-1.5 text-sm font-medium text-muted-foreground">
          {t("landing.sample.net")}
        </span>
        <span className="min-w-0">
          <span className="block text-right font-serif text-stat font-semibold whitespace-nowrap text-income tabular-nums">
            {format(net)}
          </span>
          <span
            aria-hidden="true"
            className="mt-1 block h-0.75 origin-left border-y border-rule motion-safe:animate-rule-draw"
          />
        </span>
      </div>
    </ShowcaseCard>
  );
}
