import { useNavigate, useSearch } from "@tanstack/react-router";
import { FileUp, Plus } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetAccountsSuspense, useGetPortfolioSuspense } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { PageHeader } from "@/components/page-header";
import { QueryBoundary } from "@/components/query-boundary";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { RowsSkeleton, StatsSkeleton } from "@/components/ui/skeleton";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { ActivitySection } from "../activity-section";
import { BrokerImportDialog } from "../broker-import-dialog";
import { IncomeByYear } from "../income-by-year";
import { InvestmentEntryModal } from "../investment-entry-form";
import { PortfolioSummary } from "../portfolio-summary";
import { PositionsSection } from "../positions-section";
import { SecuritiesDialog } from "../securities-dialog";

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
  const portfolio = useGetPortfolioSuspense({ accountId: shownAccountId });
  const firstRun =
    shownAccountId === undefined &&
    portfolio.data.holdings.length === 0 &&
    portfolio.data.years.length === 0;

  if (firstRun) {
    return (
      <section className="section">
        <h2 className="section-title">{t("investments.empty.title")}</h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          {t("investments.empty.description")}
        </p>
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
      </section>
    );
  }

  return (
    <div className={stale ? "is-stale space-y-10" : "space-y-10"} aria-busy={stale}>
      <PortfolioSummary portfolio={portfolio.data} />
      <PositionsSection
        holdings={portfolio.data.holdings}
        reportingCurrency={portfolio.data.reportingCurrency}
        accounts={accounts}
      />
      <IncomeByYear years={portfolio.data.years} currency={portfolio.data.reportingCurrency} />
      <QueryBoundary fallback={<RowsSkeleton rows={5} />}>
        <ActivitySection accounts={accounts} accountId={shownAccountId} />
      </QueryBoundary>
    </div>
  );
}

export function InvestmentsPage() {
  const { t } = useTranslation();
  const search = useSearch({ from: "/investments" });
  const navigate = useNavigate({ from: "/investments" });
  const accounts = useGetAccountsSuspense();
  const accountList = accounts.data ?? [];
  const accountId = accountList.find((account) => account.id === search.accountId)?.id;

  const [entryOpen, setEntryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [securitiesOpen, setSecuritiesOpen] = useState(false);
  const noAccounts = accountList.length === 0;

  return (
    <div className="space-y-10">
      <PageHeader title={t("investments.title")} description={t("investments.description")}>
        <Button variant="ghost" size="sm" onClick={() => setSecuritiesOpen(true)}>
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

      {accountList.length > 1 ? (
        <div className="mb-4 w-full sm:w-56">
          <SelectField
            aria-label={t("investments.accountFilter")}
            value={accountId ?? ""}
            onChange={(value) =>
              void navigate({ search: { accountId: value || undefined }, replace: true })
            }
            options={[
              { value: "", label: t("investments.allAccounts") },
              ...accountList.map((account) => ({ value: account.id, label: account.name })),
            ]}
          />
        </div>
      ) : null}

      <QueryBoundary
        errorSubject={t("investments.title")}
        fallback={
          <div className="space-y-10">
            <StatsSkeleton />
            <RowsSkeleton rows={6} />
          </div>
        }
      >
        <InvestmentsOverview
          accounts={accountList}
          accountId={accountId}
          onAddEntry={() => setEntryOpen(true)}
          onImport={() => setImportOpen(true)}
        />
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
