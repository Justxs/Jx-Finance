import { useNavigate, useSearch } from "@tanstack/react-router";
import { FileSpreadsheet, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTaxSummarySuspense } from "@/api/generated";
import type { AccountResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { Section, SectionHeader } from "@/components/ui/section/section";
import { StaleRegion } from "@/components/ui/stale-region/stale-region";
import { useDeferredParams } from "@/hooks/use-deferred-params";
import { useExportUrl } from "@/hooks/use-export-url";
import { nameById } from "@/lib/options";
import { gainTone } from "../gain-tone";
import { taxAccountIds, taxSummaryParams, taxYearOptions } from "../investment-queries";
import { TaxAccountPicker } from "./tax-account-picker";
import { TaxCashTable } from "./tax-cash-table";
import { TaxDisposalsTable } from "./tax-disposals-table";

interface Props {
  accounts: readonly AccountResponse[];
}

export function TaxSummarySection({ accounts }: Readonly<Props>) {
  const { t } = useTranslation();
  const search = useSearch({ from: "/investments" });
  const navigate = useNavigate({ from: "/investments" });

  const chosenAccounts = taxAccountIds(
    search.taxAccounts,
    accounts.map((account) => account.id),
  );
  const [shown, stale] = useDeferredParams(taxSummaryParams(search.taxYear, chosenAccounts));
  const summary = useTaxSummarySuspense(shown).data;

  const year = search.taxYear ?? summary.year;
  const years = taxYearOptions(summary.availableYears, year);
  const accountNames = nameById(accounts);
  const exportUrl = useExportUrl("/api/investments/tax-summary/export", {
    year: shown.year ?? summary.year,
    accountIds: shown.accountIds ?? undefined,
  });

  const totals = [
    {
      key: "investments.tax.realizedGain",
      value: summary.totals.realizedGain,
      sign: "auto",
      lead: true,
      tone: gainTone(Number(summary.totals.realizedGain)),
    },
    { key: "investments.tax.dividends", value: summary.totals.dividends },
    { key: "investments.tax.interest", value: summary.totals.interest },
    {
      key: "investments.tax.withholdingTax",
      value: summary.totals.withholdingTax,
      sign: Number(summary.totals.withholdingTax) > 0 ? "−" : undefined,
    },
    {
      key: "investments.tax.fees",
      value: summary.totals.fees,
      sign: Number(summary.totals.fees) > 0 ? "−" : undefined,
    },
  ] as const;

  const income = summary.cashEntries.filter(
    (entry) => entry.type === "dividend" || entry.type === "interest",
  );
  const charges = summary.cashEntries.filter(
    (entry) => entry.type === "withholdingTax" || entry.type === "fee",
  );

  return (
    <div className="space-y-5">
      <Section>
        <SectionHeader title={t("investments.tax.yearTitle", { year })}>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <SelectField
              aria-label={t("investments.tax.year")}
              className="w-28"
              value={String(year)}
              onChange={(value) =>
                void navigate({
                  search: (previous) => ({ ...previous, taxYear: Number(value) }),
                  replace: true,
                })
              }
              options={years.map((value) => ({ value: String(value), label: String(value) }))}
            />
            <TaxAccountPicker
              accounts={accounts}
              value={chosenAccounts}
              onChange={(next) =>
                void navigate({
                  search: (previous) => ({
                    ...previous,
                    taxAccounts: next.length === 0 ? undefined : next.join(","),
                  }),
                  replace: true,
                })
              }
            />
            <a
              href={exportUrl}
              aria-label={`CSV. ${t("investments.tax.exportHint")}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <FileSpreadsheet />
              {t("investments.tax.export")}
            </a>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer />
              {t("investments.tax.print")}
            </Button>
          </div>
        </SectionHeader>
        <p role="note" className="max-w-prose text-sm text-muted-foreground">
          {t("investments.tax.disclaimer")}
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground">
          {t("investments.tax.relatesToReports")}
        </p>
        <p className="mt-2 hidden max-w-prose text-sm text-muted-foreground print:block">
          {t("investments.tax.printedAccounts", {
            accounts:
              chosenAccounts.length === 0
                ? t("investments.tax.allAccounts")
                : summary.accounts.map((account) => account.name).join(", "),
          })}
        </p>
        {summary.isComplete ? null : (
          <p role="note" className="mt-2 max-w-prose text-sm text-muted-foreground">
            {t("investments.tax.incomplete")}
          </p>
        )}
      </Section>

      <StaleRegion stale={stale} className="space-y-5">
        <SummaryStats
          items={totals.map((total) => ({ ...total, label: t(total.key) }))}
          currency={summary.reportingCurrency}
        />

        <Section>
          <SectionHeader title={t("investments.tax.disposals")} />
          <p className="mb-2 max-w-prose text-sm text-muted-foreground">
            {t("investments.tax.disposalsHint")}
          </p>
          <TaxDisposalsTable
            disposals={summary.disposals}
            reportingCurrency={summary.reportingCurrency}
            accountNames={accountNames}
          />
        </Section>

        <Section>
          <SectionHeader title={t("investments.tax.income")} />
          <TaxCashTable
            label={t("investments.tax.income")}
            empty={t("investments.tax.noIncome")}
            entries={income}
            reportingCurrency={summary.reportingCurrency}
            accountNames={accountNames}
          />
        </Section>

        <Section>
          <SectionHeader title={t("investments.tax.charges")} />
          <TaxCashTable
            label={t("investments.tax.charges")}
            empty={t("investments.tax.noCharges")}
            entries={charges}
            reportingCurrency={summary.reportingCurrency}
            accountNames={accountNames}
          />
        </Section>
      </StaleRegion>
    </div>
  );
}
