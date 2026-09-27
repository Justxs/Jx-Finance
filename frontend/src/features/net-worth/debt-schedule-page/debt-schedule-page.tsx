import { ArrowLeft } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useDebtPaymentsSuspense,
  useDebtScheduleSuspense,
  useDebtsSuspense,
} from "@/api/generated";
import type { DebtResponse, DebtScheduleResponse } from "@/api/generated/model";
import { PageHeader } from "@/components/page-header/page-header";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section, SectionTitle, TitledSection } from "@/components/ui/section/section";
import { SectionSkeleton, StatsSkeleton } from "@/components/ui/skeleton/skeleton";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { TextLink } from "@/components/ui/text-link/text-link";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { DebtBalanceChart } from "../debt-balance-chart";
import {
  DebtExtraPayments,
  type ExtraPaymentDraft,
  extraPaymentParams,
  noExtraPayments,
} from "../debt-extra-payments/debt-extra-payments";
import { DebtPaymentSplitChart } from "../debt-payment-split-chart";
import { DebtPayments } from "../debt-payments/debt-payments";
import { DebtScheduleSummary } from "../debt-schedule-summary/debt-schedule-summary";
import { DebtScheduleTable } from "../debt-schedule-table/debt-schedule-table";

interface Props {
  debtId: string;
}

export function DebtSchedulePage({ debtId }: Readonly<Props>) {
  const { t } = useTranslation();
  const debts = useDebtsSuspense();
  const debt = debts.data.find((item) => item.id === debtId);

  let content: ReactNode;
  if (debt) {
    content = (
      <QueryBoundary
        fallback={
          <div className="space-y-5">
            <StatsSkeleton />
            <SectionSkeleton rows={6} />
          </div>
        }
        errorSubject={t("netWorth.schedule.table")}
      >
        <div className="space-y-5">
          {debt.payoffDate === null ? (
            <Section>
              <EmptyText>{t("netWorth.schedule.incomplete")}</EmptyText>
            </Section>
          ) : (
            <DebtScheduleView debt={debt} />
          )}
          {debt.tracksPayments ? <DebtPayments debt={debt} /> : null}
        </div>
      </QueryBoundary>
    );
  } else {
    content = <EmptyText>{t("netWorth.schedule.notFound")}</EmptyText>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm">
        <TextLink to="/net-worth" className="inline-flex items-center">
          <ArrowLeft className="mr-1 size-4" aria-hidden="true" />
          {t("netWorth.schedule.back")}
        </TextLink>
      </p>
      <PageHeader title={debt?.name ?? t("netWorth.debts")} />
      {content}
    </div>
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
