import { ArrowLeft } from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useDebtScheduleSuspense, useDebtsSuspense } from "@/api/generated";
import type { DebtResponse } from "@/api/generated/model";
import { PageHeader } from "@/components/page-header/page-header";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
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
  if (!debt) {
    content = <EmptyText>{t("netWorth.schedule.notFound")}</EmptyText>;
  } else if (debt.payoffDate === null) {
    content = (
      <Section>
        <EmptyText>{t("netWorth.schedule.incomplete")}</EmptyText>
      </Section>
    );
  } else {
    content = (
      <QueryBoundary
        fallback={<Skeleton className="h-96 w-full" />}
        errorSubject={t("netWorth.schedule.table")}
      >
        <DebtScheduleView debt={debt} />
      </QueryBoundary>
    );
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

      <Section>
        <SectionTitle>{t("netWorth.schedule.extraTitle")}</SectionTitle>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          {t("netWorth.schedule.extraHint")}
        </p>
        <DebtExtraPayments
          idPrefix={`extra-${debt.id}`}
          draft={draft}
          schedule={schedule}
          onChange={change}
        />
      </Section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section>
          <SectionTitle className="mb-4">{t("netWorth.schedule.balanceChart")}</SectionTitle>
          <DebtBalanceChart plan={schedule.plan} withExtra={schedule.withExtra} />
        </Section>
        <Section>
          <SectionTitle className="mb-4">{t("netWorth.schedule.splitChart")}</SectionTitle>
          <DebtPaymentSplitChart plan={shownPlan} />
        </Section>
      </div>

      <Section>
        <SectionTitle className="mb-2">{t("netWorth.schedule.table")}</SectionTitle>
        <DebtScheduleTable
          key={schedule.withExtra ? "extra" : "plan"}
          plan={shownPlan}
          asOf={schedule.asOf}
        />
      </Section>
    </StaleRegion>
  );
}
