import { useTranslation } from "react-i18next";
import { useCashFlowForecastSuspense } from "@/api/generated";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Rows } from "@/components/ui/rows/rows";
import {
  FORECAST_DAYS,
  forecastRisks,
} from "@/features/accounts/cash-flow-forecast/forecast-series";
import { useMoney, useShortDayIso } from "@/hooks/use-formatters";
import { toCents } from "@/lib/money";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";

export function CashFlowCard() {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDay = useShortDayIso();
  const forecast = useCashFlowForecastSuspense({ days: FORECAST_DAYS }).data;

  if (forecast.accounts.length === 0) {
    return <EmptyText>{t("forecast.empty", { days: FORECAST_DAYS })}</EmptyText>;
  }

  return (
    <Rows>
      {forecast.accounts.map((account) => {
        const [risk] = forecastRisks(account);
        return (
          <li key={account.accountId} className="flex items-baseline gap-4 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium" title={account.accountName}>
                {account.accountName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {t("dashboard.cashFlowLowest", {
                  amount: money.format(Number(account.lowestBalance), account.currency),
                  date: formatDay(account.lowestOn),
                })}
              </p>
              {risk ? (
                <p className="text-xs font-medium text-expense">
                  {t(
                    risk.kind === "scheduled"
                      ? "dashboard.cashFlowBelowZero"
                      : "dashboard.cashFlowMayGoBelowZero",
                    { date: formatDay(risk.date) },
                  )}
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "shrink-0 font-medium tabular-nums",
                toCents(account.startBalance) < 0 && EXPENSE_TONE,
              )}
            >
              {money.format(Number(account.startBalance), account.currency)}
            </span>
          </li>
        );
      })}
    </Rows>
  );
}
