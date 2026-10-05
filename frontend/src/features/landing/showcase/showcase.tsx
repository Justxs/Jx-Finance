import { BellRing, Fingerprint, Smartphone } from "lucide-react";
import { type ComponentProps, useId } from "react";
import { useTranslation } from "react-i18next";
import { Meter } from "@/components/ui/meter/meter";
import { Rows } from "@/components/ui/rows/rows";
import { Tag } from "@/components/ui/tag/tag";
import { signed, useDateFormat, useNumberFormat } from "@/hooks/use-formatters";
import { parseIso } from "@/lib/calendar";
import { cn } from "@/lib/utils";

export function useSampleMoney() {
  const money = useNumberFormat({ style: "currency", currency: "EUR" });
  const whole = useNumberFormat({
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return {
    format: (value: number) => money.format(value),
    whole: (value: number) => whole.format(value),
    signed: (value: number) => signed(value, (magnitude) => money.format(magnitude)),
    signedWhole: (value: number) => signed(value, (magnitude) => whole.format(magnitude)),
  };
}

type CardProps = ComponentProps<"section"> & { delay?: number };

export function ShowcaseCard({ className, delay = 0, style, ...props }: Readonly<CardProps>) {
  return (
    <section
      data-slot="showcase-card"
      style={{ "--card-delay": `${delay}ms`, ...style }}
      className={cn(
        "@container min-w-0 rounded-lg bg-card p-5 text-card-foreground shadow-xl ring-1 ring-foreground/10 motion-safe:animate-card-in motion-safe:meters-grow sm:p-6 dark:ring-foreground/20",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ id, children }: Readonly<{ id: string; children: string }>) {
  return (
    <p id={id} className="text-sm font-semibold">
      {children}
    </p>
  );
}

const budgets = [
  { key: "groceries", spent: 315, limit: 400 },
  { key: "eatingOut", spent: 132, limit: 120 },
  { key: "transport", spent: 48, limit: 80 },
] as const;

export function BudgetCard({ className, delay }: Readonly<{ className?: string; delay?: number }>) {
  const { t } = useTranslation();
  const titleId = useId();
  const money = useSampleMoney();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <CardTitle id={titleId}>{t("landing.showcase.budgets")}</CardTitle>
      <ul className="mt-3 space-y-3">
        {budgets.map((budget) => {
          const over = budget.spent > budget.limit;
          return (
            <li key={budget.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0">{t(`landing.showcase.${budget.key}`)}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                  <span className={cn("font-semibold", over ? "text-expense" : "text-foreground")}>
                    {money.whole(budget.spent)}
                  </span>{" "}
                  {t("landing.showcase.of", { limit: money.whole(budget.limit) })}
                  {over ? (
                    <span className="text-expense">
                      {" · "}
                      {t("landing.showcase.over", {
                        amount: money.whole(budget.spent - budget.limit),
                      })}
                    </span>
                  ) : null}
                </span>
              </div>
              <Meter
                value={budget.spent}
                max={budget.limit}
                tone={over ? "negative" : "primary"}
                className="mt-1.5"
              />
            </li>
          );
        })}
      </ul>
    </ShowcaseCard>
  );
}

const netWorthMonths = [
  "2026-04-01",
  "2026-05-01",
  "2026-06-01",
  "2026-07-01",
  "2026-08-01",
  "2026-09-01",
];
const netWorthValues = [79100, 80400, 81900, 83000, 85180, 86420];

function linePoints(values: readonly number[], width: number, height: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / (max - min)) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function NetWorthCard({
  className,
  delay,
}: Readonly<{ className?: string; delay?: number }>) {
  const { t } = useTranslation();
  const titleId = useId();
  const money = useSampleMoney();
  const month = useDateFormat({ month: "long" });
  const latest = netWorthValues.at(-1) ?? 0;
  const change = latest - (netWorthValues.at(-2) ?? 0);
  const first = parseIso(netWorthMonths[0] ?? "");
  const last = parseIso(netWorthMonths.at(-1) ?? "");

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <CardTitle id={titleId}>{t("landing.showcase.netWorth")}</CardTitle>
      <p className="mt-1 font-serif text-stat font-semibold tabular-nums">{money.whole(latest)}</p>
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-income tabular-nums">{money.signedWhole(change)}</span>{" "}
        {t("landing.showcase.thisMonth")}
      </p>
      <svg
        viewBox="-3 -3 246 70"
        role="img"
        aria-label={t("landing.showcase.netWorthChart")}
        className="mt-4 h-16 w-full overflow-visible"
        preserveAspectRatio="none"
      >
        <line x1="0" x2="240" y1="64" y2="64" className="stroke-border" strokeWidth="1" />
        <polyline
          points={linePoints(netWorthValues, 240, 64)}
          fill="none"
          className="stroke-primary"
          strokeWidth="2"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="mt-1 flex justify-between text-xs text-muted-foreground">
        <span>{first ? month.format(first) : null}</span>
        <span>{last ? month.format(last) : null}</span>
      </div>
    </ShowcaseCard>
  );
}

const importRows = [
  { payee: "Maxima", amount: -64.18, tag: "rule" },
  { payee: { key: "landing.showcase.toSavings" }, amount: -200, tag: "transfer" },
] as const;

export function ImportCard({ className, delay }: Readonly<{ className?: string; delay?: number }>) {
  const { t } = useTranslation();
  const titleId = useId();
  const money = useSampleMoney();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <CardTitle id={titleId}>{t("landing.showcase.statement")}</CardTitle>
      <Rows className="mt-2">
        {importRows.map((row) => (
          <li key={row.tag} className="py-2.5">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate font-medium">
                {typeof row.payee === "string" ? row.payee : t(row.payee.key)}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {money.signed(row.amount)}
              </span>
            </div>
            <Tag tone="accent" className="mt-1.5">
              {t(
                row.tag === "rule" ? "landing.showcase.filledByRule" : "landing.showcase.transfer",
              )}
            </Tag>
          </li>
        ))}
      </Rows>
    </ShowcaseCard>
  );
}

export function SettleUpCard({
  className,
  delay,
}: Readonly<{ className?: string; delay?: number }>) {
  const { t } = useTranslation();
  const titleId = useId();
  const money = useSampleMoney();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <CardTitle id={titleId}>{t("landing.showcase.sharedGroceries")}</CardTitle>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">{t("landing.showcase.youPaid")}</dt>
          <dd className="font-semibold tabular-nums">{money.whole(120)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t("landing.showcase.yourShare")}</dt>
          <dd className="font-semibold tabular-nums">{money.whole(60)}</dd>
        </div>
      </dl>
      <Meter value={60} max={120} tone="positive" mark={0.5} className="mt-3" />
      <p className="mt-3 border-t pt-2.5 text-sm">
        {t("landing.showcase.partnerOwes")}{" "}
        <span className="font-semibold text-income tabular-nums">{money.whole(60)}</span>
      </p>
    </ShowcaseCard>
  );
}

export function ReminderCard({
  className,
  delay,
}: Readonly<{ className?: string; delay?: number }>) {
  const { t } = useTranslation();
  const titleId = useId();
  const money = useSampleMoney();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <CardTitle id={titleId}>{t("landing.showcase.billDue")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("landing.showcase.billName")}</p>
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{money.signed(-24.99)}</span>
      </div>
    </ShowcaseCard>
  );
}

const tripRows = [
  { payee: "Hotel Neiburgs", amount: -384 },
  { payee: "Circle K", amount: -68.4 },
  { payee: "Lido", amount: -23.6 },
] as const;

const tripTotal = -612.4;

export function TripCard({ className, delay }: Readonly<{ className?: string; delay?: number }>) {
  const { t } = useTranslation();
  const titleId = useId();
  const money = useSampleMoney();
  const day = useDateFormat({ day: "numeric", month: "short" });
  const start = parseIso("2026-07-03");
  const end = parseIso("2026-07-17");

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <div className="flex items-baseline justify-between gap-3">
        <CardTitle id={titleId}>{t("landing.showcase.trip")}</CardTitle>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {money.signed(tripTotal)}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {t("landing.showcase.tripPayments", {
          dates: start && end ? day.formatRange(start, end) : "",
        })}
      </p>
      <Rows className="mt-2">
        {tripRows.map((row) => (
          <li key={row.payee} className="flex items-baseline justify-between gap-3 py-2 text-sm">
            <span className="min-w-0 truncate">{row.payee}</span>
            <span className="shrink-0 tabular-nums">{money.signed(row.amount)}</span>
          </li>
        ))}
      </Rows>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Tag tone="accent">{t("landing.showcase.holiday")}</Tag>
        <span className="text-xs text-muted-foreground">{t("landing.showcase.tripMore")}</span>
      </div>
    </ShowcaseCard>
  );
}

const signInMethods = [
  { key: "passkey", Icon: Fingerprint },
  { key: "phoneCode", Icon: Smartphone },
] as const;

export function SignInCard({ className, delay }: Readonly<{ className?: string; delay?: number }>) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <ShowcaseCard aria-labelledby={titleId} className={className} delay={delay}>
      <CardTitle id={titleId}>{t("landing.showcase.signIn")}</CardTitle>
      <Rows className="mt-2">
        {signInMethods.map(({ key, Icon }) => (
          <li key={key} className="flex items-center gap-3 py-2.5 text-sm">
            <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="min-w-0 flex-1">{t(`landing.showcase.${key}`)}</span>
            <Tag tone="positive">{t("landing.showcase.on")}</Tag>
          </li>
        ))}
      </Rows>
    </ShowcaseCard>
  );
}
