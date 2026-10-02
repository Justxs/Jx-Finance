import { useTranslation } from "react-i18next";
import { useDashboardSummarySuspense } from "@/api/generated";
import { SignedAmount } from "@/components/signed-amount/signed-amount";
import { useMoney, usePercent } from "@/hooks/use-formatters";
import { useTodayDate } from "@/hooks/use-settings";
import { currentMonthKey } from "@/lib/calendar";
import { useShare, withShare } from "@/stores/my-share-store";

const RING_RADIUS = 44;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

interface RingProps {
  share: number;
  overspent: boolean;
  value: string;
  caption: string;
  label: string;
}

function IncomeRing({ share, overspent, value, caption, label }: Readonly<RingProps>) {
  return (
    <div className="relative size-40 shrink-0">
      <svg viewBox="0 0 100 100" role="img" aria-label={label} className="size-full -rotate-90">
        <circle
          cx="50"
          cy="50"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="8"
          className="stroke-border"
        />
        {share > 0 ? (
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            fill="none"
            strokeWidth="8"
            strokeDasharray={`${RING_LENGTH * share} ${RING_LENGTH}`}
            className={overspent ? "stroke-(--chart-3)" : "stroke-(--chart-2)"}
          />
        ) : null}
      </svg>
      <div
        aria-hidden="true"
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="text-3xl font-semibold tabular-nums">{value}</span>
        <span className="max-w-24 text-center text-sm leading-tight text-muted-foreground">
          {caption}
        </span>
      </div>
    </div>
  );
}

interface Props {
  month: string;
}

export function DashboardStats({ month }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const percent = usePercent();
  const summary = useDashboardSummarySuspense(withShare({ month }, useShare()));
  const isCurrent = month === currentMonthKey(useTodayDate());

  const income = Number(summary.data.monthIncome);
  const expense = Number(summary.data.monthExpense);
  const net = income - expense;
  const spent = income > 0 ? expense / income : 0;
  const overspent = net < 0;
  const kept = Math.max(0, 1 - spent);

  function keptCaption() {
    if (overspent) {
      return t("dashboard.ring.spent");
    }
    return isCurrent ? t("dashboard.ring.keptSoFar") : t("dashboard.ring.kept");
  }

  function keptLabel() {
    if (overspent) {
      return t("dashboard.overspent");
    }
    const share = { percent: percent.format(kept) };
    return isCurrent ? t("dashboard.keptShareSoFar", share) : t("dashboard.keptShare", share);
  }

  const rows = [
    { label: t("dashboard.monthIncome"), value: income, sign: "+" },
    { label: t("dashboard.monthExpense"), value: -expense, sign: "auto" },
    { label: t("dashboard.monthNet"), value: net, sign: "auto" },
  ] as const;

  return (
    <div className="flex h-full flex-col gap-6">
      <dl>
        <dt className="text-sm text-muted-foreground">
          {isCurrent ? t("dashboard.totalBalance") : t("dashboard.balanceAtMonthEnd")}
        </dt>
        <dd className="mt-1 max-w-full font-serif text-stat-lg font-semibold wrap-break-word lining-nums tabular-nums">
          {money.format(Number(summary.data.totalBalance))}
        </dd>
      </dl>

      <div className="flex flex-1 flex-wrap items-center justify-center gap-x-8 gap-y-5">
        {income > 0 ? (
          <IncomeRing
            share={overspent ? 1 : kept}
            overspent={overspent}
            value={percent.format(overspent ? spent : kept)}
            caption={keptCaption()}
            label={keptLabel()}
          />
        ) : null}
        <dl className="min-w-48 flex-1 space-y-2.5">
          {rows.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between gap-4">
              <dt className="min-w-0 text-sm text-muted-foreground">{row.label}</dt>
              <dd className="shrink-0 text-lg font-semibold">
                <SignedAmount value={row.value} sign={row.sign} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
