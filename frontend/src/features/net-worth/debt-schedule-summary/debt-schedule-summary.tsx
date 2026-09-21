import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUpdateDebt } from "@/api/generated";
import type { DebtResponse, DebtScheduleResponse } from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { Panel } from "@/components/ui/section/section";
import { useIsoDate, useMoney, useRatePercent } from "@/hooks/use-formatters";
import { silent } from "@/lib/mutations";
import { debtFormValues, debtRequest } from "../debts-section/debt-form";

interface Props {
  debt: DebtResponse;
  schedule: DebtScheduleResponse;
}

export function DebtScheduleSummary({ debt, schedule }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const formatRate = useRatePercent();
  const scheduled = money.format(Number(schedule.scheduledBalance));
  const update = useUpdateDebt(
    silent({
      onSuccess: () => toast.success(t("netWorth.schedule.balanceUpdated", { amount: scheduled })),
    }),
  );
  const differs = Number(schedule.scheduledBalance) !== Number(debt.outstandingAmount);

  function applyScheduledBalance() {
    update.mutate({
      id: debt.id,
      data: {
        ...debtRequest(debtFormValues(debt)),
        outstandingAmount: schedule.scheduledBalance,
        asOf: schedule.asOf,
      },
    });
  }

  const stats = [
    {
      label: t("netWorth.schedule.regularPayment"),
      value: money.format(Number(schedule.regularPayment)),
    },
    { label: t("netWorth.interestRate"), value: formatRate(schedule.interestRate) },
    {
      label: t("netWorth.schedule.totalInterest"),
      value: money.format(Number(schedule.plan.totalInterest)),
    },
    {
      label: t("netWorth.schedule.totalPaid"),
      value: money.format(Number(schedule.plan.totalPaid)),
    },
  ];

  return (
    <Panel className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end">
      <dl className="min-w-0">
        <dt className="text-sm text-muted-foreground">{t("netWorth.schedule.payoffDate")}</dt>
        <dd className="mt-1 font-serif text-stat font-semibold lining-nums tabular-nums">
          {formatDate(schedule.plan.payoffDate)}
        </dd>
        <dd className="mt-1.5 text-sm text-muted-foreground">
          {t(`netWorth.repayment.amortizationTypes.${schedule.amortizationType}`)} ·{" "}
          {t("netWorth.schedule.paymentsMade", {
            made: schedule.paymentsMade,
            count: schedule.plan.payments,
          })}
        </dd>
      </dl>
      <div className="grid min-w-0 gap-6">
        <dl className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="text-sm text-muted-foreground">{stat.label}</dt>
              <dd className="mt-0.5 text-xl font-semibold wrap-break-word tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-end justify-between gap-3 border-t pt-4">
          <dl className="min-w-0">
            <dt className="text-sm text-muted-foreground">
              {t("netWorth.schedule.scheduledBalance")}
            </dt>
            <dd className="mt-0.5 text-xl font-semibold text-expense tabular-nums">{scheduled}</dd>
            <dd className="mt-1 text-xs text-muted-foreground tabular-nums">
              {t("netWorth.schedule.recorded", {
                amount: money.format(Number(debt.outstandingAmount)),
                date: formatDate(debt.asOf),
              })}
            </dd>
          </dl>
          {differs ? (
            <Button
              variant="outline"
              size="sm"
              pending={update.isPending}
              onClick={applyScheduledBalance}
            >
              {t("netWorth.schedule.useScheduled")}
            </Button>
          ) : null}
        </div>
        <FormError error={update.error} />
      </div>
    </Panel>
  );
}
