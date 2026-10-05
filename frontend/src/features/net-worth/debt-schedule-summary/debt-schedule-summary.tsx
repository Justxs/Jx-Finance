import { useTranslation } from "react-i18next";
import { useUpdateDebt } from "@/api/generated";
import type { DebtResponse, DebtScheduleResponse } from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { Button } from "@/components/ui/button/button";
import { debtFormValues, debtRequest } from "@/features/net-worth/debts-section/debt-form";
import { useIsoDate, useMoney, useRatePercent } from "@/hooks/use-formatters";
import { EXPENSE_TONE } from "@/lib/tone";

interface Props {
  debt: DebtResponse;
  schedule: DebtScheduleResponse;
}

export function DebtScheduleSummary({ debt, schedule }: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const formatRate = useRatePercent();
  const scheduled = money.format(Number(schedule.scheduledBalance), debt.currency);
  const update = useUpdateDebt({
    mutation: {
      meta: { silent: true, success: t("netWorth.schedule.balanceUpdated", { amount: scheduled }) },
    },
  });
  const differs =
    Number(schedule.scheduledBalance) !== Number(debt.trackedBalance ?? debt.outstandingAmount);

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
      label: t("netWorth.schedule.payoffDate"),
      value: undefined,
      text: formatDate(schedule.plan.payoffDate),
      detail: `${t(`netWorth.repayment.amortizationTypes.${schedule.amortizationType}`)} · ${t(
        "netWorth.schedule.paymentsMade",
        { made: schedule.paymentsMade, count: schedule.plan.payments },
      )}`,
    },
    { label: t("netWorth.schedule.regularPayment"), value: schedule.regularPayment },
    {
      label: t("netWorth.interestRate"),
      value: undefined,
      text: formatRate(schedule.interestRate),
    },
    { label: t("netWorth.schedule.totalInterest"), value: schedule.plan.totalInterest },
    { label: t("netWorth.schedule.totalPaid"), value: schedule.plan.totalPaid },
    {
      label: t("netWorth.schedule.scheduledBalance"),
      value: schedule.scheduledBalance,
      tone: EXPENSE_TONE,
      sign: "−" as const,
      detail: t("netWorth.schedule.recorded", {
        amount: money.format(Number(debt.outstandingAmount), debt.currency),
        date: formatDate(debt.asOf),
      }),
      note: differs ? (
        <div className="space-y-2">
          <Button
            variant="outline"
            size="sm"
            pending={update.isPending}
            onClick={applyScheduledBalance}
          >
            {t("netWorth.schedule.useScheduled")}
          </Button>
          <FormError error={update.error} />
        </div>
      ) : undefined,
    },
    ...(debt.trackedBalance === null
      ? []
      : [
          {
            label: t("netWorth.schedule.trackedBalance"),
            value: debt.trackedBalance,
            tone: EXPENSE_TONE,
            sign: "−" as const,
          },
        ]),
  ];

  return <SummaryStats items={stats} currency={debt.currency} />;
}
