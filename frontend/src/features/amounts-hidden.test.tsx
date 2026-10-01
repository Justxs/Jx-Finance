import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from "@tanstack/react-router";
import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, expect, test } from "vitest";
import { getNetWorthHistoryQueryKey, getReceiptItemsQueryKey } from "@/api/generated";
import type { MonthDrift } from "@/api/generated/model";
import { BreakdownList } from "@/components/breakdown-list/breakdown-list";
import { ChartTooltip } from "@/components/chart/chart-tooltip";
import { ShareBars } from "@/components/share-bars/share-bars";
import { SummaryStats } from "@/components/summary-stats/summary-stats";
import { ForecastWhatIf } from "@/features/accounts/forecast-what-if/forecast-what-if";
import { AllocationSection } from "@/features/investments/allocation-section/allocation-section";
import { PortfolioSummary } from "@/features/investments/portfolio-summary/portfolio-summary";
import { PositionsTable } from "@/features/investments/positions-section/positions-table";
import { DriftPanel } from "@/features/month-close/drift-panel/drift-panel";
import { NetWorthPace } from "@/features/net-worth/net-worth-pace/net-worth-pace";
import { ReceiptItems } from "@/features/reports/receipt-items/receipt-items";
import { YearReview } from "@/features/reports/year-review/year-review";
import { TransactionAmount } from "@/features/transactions/transaction-amount/transaction-amount";
import { i18n } from "@/lib/i18n";
import { AMOUNT_MASK } from "@/lib/mask-amount";
import { savePreferences } from "@/stores/preferences";
import {
  closedChangedMonthReview,
  longDescriptionTransaction,
  netWorthHistory,
  portfolio,
  receiptItems,
  reportSummaryYear,
} from "@/storybook/fixtures";
import { createQueryWrapper } from "@/test/query";

const receiptRange = { dateFrom: "2026-01-01", dateTo: "2026-12-31" };

const receiptItemName = "Pienas Dvaro 2,5 % 1 l";

const digitBesideCurrency = /(?:[€$£]|USD)\s?\d|\d\s?(?:[€$£]|USD)/u;

function driftOf(): MonthDrift {
  if (!closedChangedMonthReview.drift) {
    throw new Error("The fixture has no drift.");
  }
  return closedChangedMonthReview.drift;
}

function noop() {}

async function renderRouted(ui: ReactElement) {
  const { client, Wrapper } = createQueryWrapper({
    currencies: { reportingCurrency: "eur", currencies: ["eur", "usd"], ratesAsOf: null },
  });
  client.setQueryData(
    getReceiptItemsQueryKey({ ...receiptRange, search: undefined }),
    receiptItems,
  );
  client.setQueryData(getNetWorthHistoryQueryKey(), netWorthHistory);
  const rootRoute = createRootRoute({ component: () => ui });
  const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory() });
  await router.load();
  render(<RouterProvider router={router} />, { wrapper: Wrapper });
}

function everyAmount() {
  return (
    <>
      <TransactionAmount transaction={longDescriptionTransaction} />
      <SummaryStats
        items={[
          { label: "Income", value: "2850", lead: true },
          { label: "Spent", value: "1234.56", sign: "−" },
          { label: "Net", value: "-812.4", sign: "auto" },
        ]}
      />
      <BreakdownList
        rows={[
          { key: "food", name: "Food", amount: 412.35, comparisonAmount: "380.10" },
          { key: "refund", name: "Refunds", amount: -24.5, comparisonAmount: null },
        ]}
      />
      <ShareBars
        rows={[
          { id: "one", name: "Rūta", amount: 1520.4 },
          { id: "two", name: "Jonas", amount: 980 },
        ]}
      />
      <ChartTooltip
        active
        label="Sep 2026"
        payload={[
          { dataKey: "income", value: 2850 },
          { dataKey: "net", value: -312.5 },
        ]}
        series={[
          { key: "income", label: "Income", color: "var(--chart-1)" },
          { key: "net", label: "Net", color: "var(--chart-2)", sign: "auto" },
        ]}
      />
      <YearReview
        trend={reportSummaryYear.trend}
        expenseByCategory={reportSummaryYear.expenseByCategory}
        compared={false}
        onCompare={noop}
      />
      <PositionsTable
        label="Open positions"
        holdings={portfolio.holdings}
        reportingCurrency="eur"
        accountNames={new Map()}
        sharedSecurityIds={new Set()}
        onEditPrice={noop}
      />
      <ReceiptItems {...receiptRange} />
      <PortfolioSummary portfolio={portfolio} />
      <AllocationSection
        holdings={portfolio.holdings}
        byType={portfolio.byType ?? []}
        byCurrency={portfolio.byCurrency ?? []}
        currency={portfolio.reportingCurrency}
      />
      <ForecastWhatIf
        accountId="account"
        accountName="Swedbank einamoji"
        currency="eur"
        today="2026-09-18"
        whatIf={{ accountId: "account", amount: -1400, date: "2026-10-03" }}
        onChange={noop}
      />
      <DriftPanel drift={driftOf()} figures={closedChangedMonthReview.figures} />
      <NetWorthPace />
    </>
  );
}

function shownTexts() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const texts: string[] = [];
  while (walker.nextNode()) {
    texts.push(walker.currentNode.textContent ?? "");
  }
  return texts;
}

function moneyDigits() {
  return shownTexts().filter((text) => digitBesideCurrency.test(text));
}

function maskedTexts() {
  return shownTexts().filter((text) => text.includes(AMOUNT_MASK));
}

beforeEach(() => {
  savePreferences({ amountsHidden: true });
});

afterEach(() => {
  savePreferences({ amountsHidden: false });
});

test.each(["en", "lt"])("no money digit is left on screen in %s", async (language) => {
  await i18n.changeLanguage(language);
  await renderRouted(everyAmount());
  await screen.findByText(receiptItemName);

  expect(maskedTexts().length).toBeGreaterThan(50);
  expect(moneyDigits()).toEqual([]);
});

test("the same screen shows its amounts once the mode is off", async () => {
  savePreferences({ amountsHidden: false });
  await renderRouted(everyAmount());
  await screen.findByText(receiptItemName);

  expect(maskedTexts()).toEqual([]);
  expect(moneyDigits().length).toBeGreaterThan(50);
});
