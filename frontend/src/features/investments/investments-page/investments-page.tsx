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
import { RowsSkeleton, StatsSkeleton } from "@/components/ui/skeleton/skeleton";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { namedOptions } from "@/lib/options";
import { cn } from "@/lib/utils";
import { ActivitySection } from "../activity-section/activity-section";
import { AllocationSection } from "../allocation-section/allocation-section";
import { BrokerImportDialog } from "../broker-import-dialog/broker-import-dialog";
import { IncomeByYear } from "../income-by-year/income-by-year";
import { InvestmentEntryModal } from "../investment-entry-form";
import { portfolioParams } from "../investment-queries";
import { PortfolioSummary } from "../portfolio-summary/portfolio-summary";
import { PositionsSection } from "../positions-section";
import { SecuritiesDialog } from "../securities-dialog/securities-dialog";
import { TaxSummarySection } from "../tax-summary/tax-summary-section";
import { ValueChartSection } from "../value-chart/value-chart-section";

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
        currency={portfolio.data.reportingCurrency}
      />
      <PositionsSection
        holdings={portfolio.data.holdings}
        reportingCurrency={portfolio.data.reportingCurrency}
        accounts={accounts}
      />
      <IncomeByYear years={portfolio.data.years} currency={portfolio.data.reportingCurrency} />
      <QueryBoundary fallback={<RowsSkeleton rows={5} />}>
        <ActivitySection accounts={accounts} accountId={shownAccountId} />
      </QueryBoundary>
    </StaleRegion>
  );
}

export function InvestmentsPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/investments" });
  const navigate = useNavigate({ from: "/investments" });
  const accounts = useAccountsSuspense();
  const accountList = accounts.data;
  const accountId = accountList.find((account) => account.id === search.accountId)?.id;

  const [entryOpen, setEntryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [securitiesOpen, setSecuritiesOpen] = useState(false);
  const noAccounts = accountList.length === 0;
  const taxView = search.view === "taxSummary";

  return (
    <div className="space-y-5">
      <PageHeader
        title={taxView ? t("investments.tax.title") : t("investments.title")}
        description={taxView ? t("investments.tax.description") : t("investments.description")}
      >
        {taxView ? (
          <Link
            to="/investments"
            search={{ accountId }}
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "print:hidden")}
          >
            <ArrowLeft />
            {t("investments.tax.back")}
          </Link>
        ) : (
          <>
            <Link
              to="/investments"
              search={{ view: "taxSummary" }}
              className={buttonVariants({ variant: "ghost", size: "sm" })}
            >
              <ReceiptText />
              {t("investments.tax.open")}
            </Link>
            <Button variant="ghost" size="sm" onClick={() => setSecuritiesOpen(true)}>
              <Library />
              {t("investments.securities.title")}
            </Button>
            <Button
              variant="ghost"
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
          </>
        )}
      </PageHeader>

      {!taxView && accountList.length > 1 ? (
        <div className="mb-4 w-full sm:w-56">
          <SelectField
            aria-label={t("investments.accountFilter")}
            value={accountId ?? ""}
            onChange={(value) =>
              void navigate({ search: { accountId: value || undefined }, replace: true })
            }
            options={namedOptions(accountList, t("investments.allAccounts"))}
          />
        </div>
      ) : null}

      <QueryBoundary
        errorSubject={taxView ? t("investments.tax.title") : t("investments.title")}
        fallback={
          <div className="space-y-5">
            <StatsSkeleton />
            <RowsSkeleton rows={6} />
          </div>
        }
      >
        {taxView ? (
          <TaxSummarySection accounts={accountList} />
        ) : (
          <InvestmentsOverview
            accounts={accountList}
            accountId={accountId}
            onAddEntry={() => setEntryOpen(true)}
            onImport={() => setImportOpen(true)}
          />
        )}
      </QueryBoundary>

      <InvestmentEntryModal
        open={entryOpen}
        onOpenChange={setEntryOpen}
        accounts={accountList}
        accountId={accountId}
      />
      <BrokerImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        accounts={accountList}
        accountId={accountId}
      />
      <SecuritiesDialog open={securitiesOpen} onOpenChange={setSecuritiesOpen} />
    </div>
  );
}
