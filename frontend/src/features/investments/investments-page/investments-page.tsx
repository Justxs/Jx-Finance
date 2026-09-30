import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowLeft, FileUp, Library, Plus, ReceiptText } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAccountsSuspense, usePortfolioSuspense } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { PageHeader } from "@/components/page-header/page-header";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { SelectField } from "@/components/select-field/select-field";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { TitledSection } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { ActivitySection } from "@/features/investments/activity-section/activity-section";
import { AllocationSection } from "@/features/investments/allocation-section/allocation-section";
import { BrokerImportDialog } from "@/features/investments/broker-import-dialog/broker-import-dialog";
import { IncomeByYear } from "@/features/investments/income-by-year/income-by-year";
import { InvestmentEntryModal } from "@/features/investments/investment-entry-form/investment-entry-modal";
import { portfolioParams } from "@/features/investments/investment-queries";
import { PortfolioSummary } from "@/features/investments/portfolio-summary/portfolio-summary";
import { PositionsSection } from "@/features/investments/positions-section/positions-section";
import { SecuritiesDialog } from "@/features/investments/securities-dialog/securities-dialog";
import { TaxSummarySection } from "@/features/investments/tax-summary/tax-summary-section";
import { ValueChartSection } from "@/features/investments/value-chart/value-chart-section";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { namedOptions } from "@/lib/options";
import { cn } from "@/lib/utils";
import { ActivitySkeleton, InvestmentsBodySkeleton } from "./investments-page-pending";

interface OverviewProps {
  accounts: readonly AccountResponse[];
  accountId?: string;
  onAddEntry: () => void;
  onImport: () => void;
}

function InvestmentsOverview({
  accounts,
  accountId,
  onAddEntry,
  onImport,
}: Readonly<OverviewProps>) {
  const { t } = useTranslation();
  const [shown, stale] = useDeferredParams({ accountId: accountId ?? "" });
  const shownAccountId = shown.accountId || undefined;
  const portfolio = usePortfolioSuspense(portfolioParams(shownAccountId));
  const firstRun =
    shownAccountId === undefined &&
    portfolio.data.holdings.length === 0 &&
    portfolio.data.years.length === 0;

  if (firstRun) {
    return (
      <TitledSection
        title={t("investments.empty.title")}
        description={t("investments.empty.description")}
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={onAddEntry} disabled={accounts.length === 0}>
            <Plus />
            {t("investments.empty.addFirst")}
          </Button>
          <Button variant="outline" onClick={onImport} disabled={accounts.length === 0}>
            <FileUp />
            {t("investments.empty.import")}
          </Button>
        </div>
        {accounts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{t("investments.import.noAccounts")}</p>
        ) : null}
      </TitledSection>
    );
  }

  return (
    <StaleRegion stale={stale} className="space-y-5">
      <PortfolioSummary portfolio={portfolio.data} />
      <ValueChartSection accountId={shownAccountId} />
      <AllocationSection
        holdings={portfolio.data.holdings}
        byType={portfolio.data.byType ?? []}
        byCurrency={portfolio.data.byCurrency ?? []}
        currency={portfolio.data.reportingCurrency}
      />
      <PositionsSection
        holdings={portfolio.data.holdings}
        reportingCurrency={portfolio.data.reportingCurrency}
        accounts={accounts}
      />
      <IncomeByYear years={portfolio.data.years} currency={portfolio.data.reportingCurrency} />
      <QueryBoundary fallback={<ActivitySkeleton />}>
        <ActivitySection key={shownAccountId} accounts={accounts} accountId={shownAccountId} />
      </QueryBoundary>
    </StaleRegion>
  );
}

interface ViewProps {
  accounts: readonly AccountResponse[];
  accountId?: string;
}

function TaxSummaryView({ accounts, accountId }: Readonly<ViewProps>) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <PageHeader title={t("investments.tax.title")} description={t("investments.tax.description")}>
        <Link
          to="/investments"
          search={{ accountId }}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "print:hidden")}
        >
          <ArrowLeft />
          {t("investments.tax.back")}
        </Link>
      </PageHeader>
      <QueryBoundary
        errorSubject={t("investments.tax.title")}
        fallback={<InvestmentsBodySkeleton taxView />}
      >
        <TaxSummarySection accounts={accounts} />
      </QueryBoundary>
    </div>
  );
}

function PortfolioView({ accounts, accountId }: Readonly<ViewProps>) {
  const { t } = useTranslation();
  const navigate = useNavigate({ from: "/investments" });
  const [entryOpen, setEntryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [securitiesOpen, setSecuritiesOpen] = useState(false);
  const noAccounts = accounts.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader title={t("investments.title")} description={t("investments.description")}>
        <Link
          to="/investments"
          search={{ view: "taxSummary" }}
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <ReceiptText />
          {t("investments.tax.open")}
        </Link>
        <Button variant="outline" size="sm" onClick={() => setSecuritiesOpen(true)}>
          <Library />
          {t("investments.securities.title")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={noAccounts}
          onClick={() => setImportOpen(true)}
        >
          <FileUp />
          {t("investments.import.open")}
        </Button>
        <Button disabled={noAccounts} onClick={() => setEntryOpen(true)}>
          <Plus />
          {t("investments.entry.add")}
        </Button>
      </PageHeader>

      {accounts.length > 1 ? (
        <div className="mb-4 w-full sm:w-56">
          <SelectField
            aria-label={t("investments.accountFilter")}
            value={accountId ?? ""}
            onChange={(value) =>
              void navigate({ search: { accountId: value || undefined }, replace: true })
            }
            options={namedOptions(accounts, t("investments.allAccounts"))}
          />
        </div>
      ) : null}

      <QueryBoundary
        errorSubject={t("investments.title")}
        fallback={<InvestmentsBodySkeleton taxView={false} />}
      >
        <InvestmentsOverview
          accounts={accounts}
          accountId={accountId}
          onAddEntry={() => setEntryOpen(true)}
          onImport={() => setImportOpen(true)}
        />
      </QueryBoundary>

      <InvestmentEntryModal
        open={entryOpen}
        onOpenChange={setEntryOpen}
        accounts={accounts}
        accountId={accountId}
      />
      <BrokerImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={accounts}
        accountId={accountId}
      />
      <SecuritiesDialog open={securitiesOpen} onOpenChange={setSecuritiesOpen} />
    </div>
  );
}

export function InvestmentsPage() {
  const search = useSearch({ from: "/investments" });
  const accounts = useAccountsSuspense().data;

  return search.view === "taxSummary" ? (
    <TaxSummaryView accounts={accounts} accountId={search.accountId} />
  ) : (
    <PortfolioView accounts={accounts} accountId={search.accountId} />
  );
}
