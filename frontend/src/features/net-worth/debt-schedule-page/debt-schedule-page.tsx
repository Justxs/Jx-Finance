import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useDebtPaymentsSuspense,
  useDebtScheduleSuspense,
  useDebtsSuspense,
} from "@/api/generated";
import type { DebtResponse, DebtScheduleResponse } from "@/api/generated/model";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section, SectionTitle, TitledSection } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { ValuationsSkeleton } from "@/features/net-worth/asset-page/asset-page-pending";
import { DebtBalanceChart } from "@/features/net-worth/debt-balance-chart";
import { DebtBalances } from "@/features/net-worth/debt-balances/debt-balances";
import {
  DebtExtraPayments,
  type ExtraPaymentDraft,
  extraPaymentParams,
  noExtraPayments,
} from "@/features/net-worth/debt-extra-payments/debt-extra-payments";
import { DebtPaymentSplitChart } from "@/features/net-worth/debt-payment-split-chart";
import { DebtPayments } from "@/features/net-worth/debt-payments/debt-payments";
import { DebtScheduleSummary } from "@/features/net-worth/debt-schedule-summary/debt-schedule-summary";
import { DebtScheduleTable } from "@/features/net-worth/debt-schedule-table/debt-schedule-table";
import { DetailPage } from "@/features/net-worth/detail-page/detail-page";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { DebtScheduleSkeleton } from "./debt-schedule-page-pending";

interface Props {
  debtId: string;
}

export function DebtSchedulePage({ debtId }: Readonly<Props>) {
  const { t } = useTranslation();
  const debt = useDebtsSuspense().data.find((item) => item.id === debtId);

  return (
    <DetailPage
      item={debt}
      fallbackTitle={t("netWorth.debts")}
      notFound={t("netWorth.schedule.notFound")}
    >
      {(found) => (
        <>
          <QueryBoundary
            fallback={<DebtScheduleSkeleton tracked={found.tracksPayments} />}
            errorSubject={t("netWorth.schedule.table")}
          >
            <div className="space-y-5">
              {found.payoffDate === null ? (
                <Section>
                  <EmptyText>{t("netWorth.schedule.incomplete")}</EmptyText>
                </Section>
              ) : (
                <DebtScheduleView debt={found} />
              )}
              {found.tracksPayments ? <DebtPayments debt={found} /> : null}
            </div>
          </QueryBoundary>
          <QueryBoundary
            fallback={<ValuationsSkeleton />}
            errorSubject={t("netWorth.debtBalances.title")}
          >
            <DebtBalances debt={found} />
          </QueryBoundary>
        </>
      )}
    </DetailPage>
  );
}

function DebtScheduleView({ debt }: Readonly<{ debt: DebtResponse }>) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ExtraPaymentDraft>(noExtraPayments);
  const [params, stale] = useDeferredParams(extraPaymentParams(draft));
  const query = Object.keys(params).length > 0 ? params : undefined;
  const schedule = useDebtScheduleSuspense(debt.id, query).data;
  const shownPlan = schedule.withExtra ?? schedule.plan;

  function change(field: keyof ExtraPaymentDraft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  return (
    <StaleRegion stale={stale} className="space-y-5">
      <DebtScheduleSummary debt={debt} schedule={schedule} />

      <TitledSection
        title={t("netWorth.schedule.extraTitle")}
        description={t("netWorth.schedule.extraHint")}
        bodyGap="md"
      >
        <DebtExtraPayments
          idPrefix={`extra-${debt.id}`}
          draft={draft}
          schedule={schedule}
          currency={debt.currency}
          onChange={change}
        />
      </TitledSection>

      <div className="grid gap-5 lg:grid-cols-2">
        <TitledSection title={t("netWorth.schedule.balanceChart")} bodyGap="md">
          {debt.tracksPayments ? (
            <TrackedBalanceChart debt={debt} schedule={schedule} />
          ) : (
            <DebtBalanceChart
              plan={schedule.plan}
              withExtra={schedule.withExtra}
              currency={debt.currency}
            />
          )}
        </TitledSection>
        <TitledSection title={t("netWorth.schedule.splitChart")} bodyGap="md">
          <DebtPaymentSplitChart plan={shownPlan} />
        </TitledSection>
      </div>

      <Section>
        <SectionTitle className="mb-2">{t("netWorth.schedule.table")}</SectionTitle>
        <DebtScheduleTable
          key={schedule.withExtra ? "extra" : "plan"}
          plan={shownPlan}
          asOf={schedule.asOf}
          currency={debt.currency}
        />
      </Section>
    </StaleRegion>
  );
}

interface TrackedProps {
  debt: DebtResponse;
  schedule: DebtScheduleResponse;
}

function TrackedBalanceChart({ debt, schedule }: Readonly<TrackedProps>) {
  const payments = useDebtPaymentsSuspense(debt.id).data;

  return (
    <DebtBalanceChart
      plan={schedule.plan}
      withExtra={schedule.withExtra}
      currency={debt.currency}
      tracked={{ from: debt.asOf, until: schedule.asOf, opening: debt.outstandingAmount, payments }}
    />
  );
}
