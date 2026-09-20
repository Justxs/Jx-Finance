import type {
  BrokerConnectionResponse,
  BrokerImportResponse,
  Currency,
  HoldingResponse,
  InvestmentSource,
  InvestmentTransactionResponse,
  InvestmentTransactionType,
  PortfolioResponse,
  ProblemDetails,
  SecurityResponse,
} from "@/api/generated/model";
import { brokerAccount, checkingAccount, savingsAccount } from "./fixtures";

function securityId(n: number): string {
  return `eeeeeeee-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function entryId(n: number): string {
  return `ffffffff-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

export const worldEtf: SecurityResponse = {
  id: securityId(1),
  symbol: "VWCE",
  name: "Vanguard FTSE All-World UCITS ETF (USD) Accumulating",
  isin: "IE00BK5BQT80",
  exchange: "XETRA",
  type: "etf",
  currency: "eur",
  lastPrice: "128.46",
  lastPriceDate: "2026-09-17",
};

export const usStock: SecurityResponse = {
  id: securityId(2),
  symbol: "MSFT",
  name: "Microsoft Corporation",
  isin: "US5949181045",
  exchange: "NASDAQ",
  type: "stock",
  currency: "usd",
  lastPrice: "462.18",
  lastPriceDate: "2026-09-17",
};

const closedStock: SecurityResponse = {
  id: securityId(3),
  symbol: "ASML",
  name: "ASML Holding N.V.",
  isin: "NL0010273215",
  exchange: "AEB",
  type: "stock",
  currency: "eur",
  lastPrice: "742.30",
  lastPriceDate: "2026-09-17",
};

export const unpricedStock: SecurityResponse = {
  id: securityId(4),
  symbol: "IGN1L",
  name: "Ignitis grupė",
  isin: "LT0000115768",
  exchange: "Nasdaq Vilnius",
  type: "stock",
  currency: "eur",
  lastPrice: null,
  lastPriceDate: null,
};

export const securities: SecurityResponse[] = [closedStock, unpricedStock, usStock, worldEtf];

const worldEtfHolding: HoldingResponse = {
  accountId: brokerAccount.id,
  security: worldEtf,
  quantity: "42.5",
  averageCost: "104.2135",
  costBasis: "4429.07",
  marketValue: "5459.55",
  unrealizedGain: "1030.48",
  unrealizedPercent: "23.27",
  marketValueReporting: "5459.55",
  realizedGain: "0.00",
  dividends: "0.00",
};

const usStockHolding: HoldingResponse = {
  accountId: brokerAccount.id,
  security: usStock,
  quantity: "12",
  averageCost: "398.25",
  costBasis: "4779.00",
  marketValue: "5546.16",
  unrealizedGain: "767.16",
  unrealizedPercent: "16.05",
  marketValueReporting: "5115.44",
  realizedGain: "214.30",
  dividends: "38.16",
};

export const closedHolding: HoldingResponse = {
  accountId: brokerAccount.id,
  security: closedStock,
  quantity: "0",
  averageCost: "0",
  costBasis: "0.00",
  marketValue: "0.00",
  unrealizedGain: "0.00",
  unrealizedPercent: null,
  marketValueReporting: "0.00",
  realizedGain: "386.40",
  dividends: "12.80",
};

const unpricedHolding: HoldingResponse = {
  accountId: brokerAccount.id,
  security: unpricedStock,
  quantity: "150",
  averageCost: "19.84",
  costBasis: "2976.00",
  marketValue: null,
  unrealizedGain: null,
  unrealizedPercent: null,
  marketValueReporting: null,
  realizedGain: "0.00",
  dividends: "186.00",
};

export const losingHolding: HoldingResponse = {
  ...worldEtfHolding,
  accountId: savingsAccount.id,
  quantity: "10",
  averageCost: "131.90",
  costBasis: "1319.00",
  marketValue: "1284.60",
  unrealizedGain: "-34.40",
  unrealizedPercent: "-2.61",
  marketValueReporting: "1284.60",
};

export const portfolio: PortfolioResponse = {
  reportingCurrency: "eur",
  marketValue: "10574.99",
  costBasis: "8836.93",
  unrealizedGain: "1738.06",
  realizedGain: "584.06",
  dividends: "48.00",
  withholdingTax: "7.20",
  fees: "14.85",
  isComplete: true,
  holdings: [worldEtfHolding, usStockHolding, closedHolding],
  years: [
    {
      year: 2025,
      dividends: "18.40",
      withholdingTax: "2.76",
      interest: "4.12",
      fees: "6.50",
      realizedGain: "386.40",
    },
    {
      year: 2026,
      dividends: "29.60",
      withholdingTax: "4.44",
      interest: "6.31",
      fees: "8.35",
      realizedGain: "197.66",
    },
  ],
};

export const incompletePortfolio: PortfolioResponse = {
  ...portfolio,
  costBasis: "11812.93",
  dividends: "234.00",
  withholdingTax: "35.10",
  isComplete: false,
  holdings: [worldEtfHolding, usStockHolding, unpricedHolding, closedHolding],
};

export const emptyPortfolio: PortfolioResponse = {
  reportingCurrency: "eur",
  marketValue: "0.00",
  costBasis: "0.00",
  unrealizedGain: "0.00",
  realizedGain: "0.00",
  dividends: "0.00",
  withholdingTax: "0.00",
  fees: "0.00",
  isComplete: true,
  holdings: [],
  years: [],
};

interface EntrySeed {
  type: InvestmentTransactionType;
  date: string;
  security?: SecurityResponse;
  quantity?: string;
  price?: string;
  fee?: string;
  cashAmount: string;
  currency?: Currency;
  description?: string;
  source?: InvestmentSource;
}

function entry(n: number, seed: EntrySeed): InvestmentTransactionResponse {
  return {
    id: entryId(n),
    accountId: brokerAccount.id,
    securityId: seed.security?.id ?? null,
    symbol: seed.security?.symbol ?? null,
    type: seed.type,
    date: seed.date,
    quantity: seed.quantity ?? "0",
    price: seed.price ?? "0",
    fee: seed.fee ?? "0.00",
    cashAmount: seed.cashAmount,
    currency: seed.currency ?? seed.security?.currency ?? "eur",
    description: seed.description ?? null,
    source: seed.source ?? "interactiveBrokers",
    createdAt: `${seed.date}T18:05:00Z`,
  };
}

const entrySeeds: EntrySeed[] = [
  {
    type: "dividend",
    date: "2026-09-12",
    security: usStock,
    cashAmount: "9.96",
    description: "MSFT cash dividend USD 0.83 per share",
  },
  { type: "withholdingTax", date: "2026-09-12", security: usStock, cashAmount: "-1.49" },
  {
    type: "buy",
    date: "2026-09-03",
    security: worldEtf,
    quantity: "4",
    price: "127.12",
    fee: "1.25",
    cashAmount: "-509.73",
  },
  {
    type: "interest",
    date: "2026-08-05",
    cashAmount: "2.14",
    description: "EUR credit interest for July",
  },
  {
    type: "fee",
    date: "2026-08-04",
    cashAmount: "-1.50",
    currency: "usd",
    description: "Market data subscription",
  },
  {
    type: "sell",
    date: "2026-07-15",
    security: usStock,
    quantity: "3",
    price: "468.90",
    fee: "1.00",
    cashAmount: "1405.70",
  },
  { type: "dividend", date: "2026-06-11", security: usStock, cashAmount: "12.45" },
  { type: "withholdingTax", date: "2026-06-11", security: usStock, cashAmount: "-1.87" },
  {
    type: "buy",
    date: "2026-06-02",
    security: worldEtf,
    quantity: "8.5",
    price: "121.40",
    fee: "1.25",
    cashAmount: "-1033.15",
  },
  { type: "dividend", date: "2026-03-12", security: usStock, cashAmount: "12.45" },
  { type: "withholdingTax", date: "2026-03-12", security: usStock, cashAmount: "-1.87" },
  {
    type: "buy",
    date: "2026-03-02",
    security: worldEtf,
    quantity: "10",
    price: "112.30",
    fee: "1.25",
    cashAmount: "-1124.25",
    source: "manual",
    description: "Kovo mėnesio įmoka",
  },
  {
    type: "buy",
    date: "2026-01-15",
    security: usStock,
    quantity: "5",
    price: "421.30",
    fee: "1.00",
    cashAmount: "-2107.50",
  },
  {
    type: "sell",
    date: "2025-11-20",
    security: closedStock,
    quantity: "6",
    price: "702.40",
    fee: "2.00",
    cashAmount: "4212.40",
  },
  { type: "dividend", date: "2025-10-02", security: closedStock, cashAmount: "12.80" },
  { type: "withholdingTax", date: "2025-10-02", security: closedStock, cashAmount: "-1.92" },
  {
    type: "buy",
    date: "2025-08-14",
    security: usStock,
    quantity: "10",
    price: "386.73",
    fee: "1.00",
    cashAmount: "-3868.30",
  },
  {
    type: "buy",
    date: "2025-06-10",
    security: closedStock,
    quantity: "6",
    price: "637.67",
    fee: "2.00",
    cashAmount: "-3828.02",
  },
  {
    type: "buy",
    date: "2025-05-22",
    security: worldEtf,
    quantity: "20",
    price: "98.42",
    fee: "1.25",
    cashAmount: "-1969.65",
    source: "manual",
    description: "Pirmas pirkimas",
  },
];

export const investmentTransactions: InvestmentTransactionResponse[] = entrySeeds.map(
  (seed, index) => entry(index + 1, seed),
);

export const splitEntry: InvestmentTransactionResponse = entry(90, {
  type: "split",
  date: "2026-04-01",
  security: usStock,
  quantity: "2",
  cashAmount: "0.00",
  source: "manual",
});

const brokerConnection: BrokerConnectionResponse = {
  accountId: brokerAccount.id,
  fundingAccountId: checkingAccount.id,
  queryId: "1284467",
  isEnabled: true,
  lastSyncAt: "2026-09-18T04:10:00Z",
  lastError: null,
};

export const failedBrokerConnection: BrokerConnectionResponse = {
  ...brokerConnection,
  lastSyncAt: "2026-09-16T04:10:00Z",
  lastError:
    "Interactive Brokers rejected the request: the token has expired (code 1012). Create a new token in Flex Web Service and save it here.",
};

export const brokerConnections: BrokerConnectionResponse[] = [brokerConnection];

export const brokerImportResult: BrokerImportResponse = {
  trades: 14,
  cashEntries: 9,
  conversions: 2,
  transfers: 3,
  duplicates: 21,
  skipped: 1,
  securitiesCreated: 1,
  pricesUpdated: 3,
  splits: 0,
  skippedCorporateActions: [],
  positionMismatches: null,
};

export const brokerImportWithWarnings: BrokerImportResponse = {
  ...brokerImportResult,
  splits: 2,
  skippedCorporateActions: [
    { type: "TC", count: 1 },
    { type: "SO", count: 2 },
    { type: "XX", count: 1 },
  ],
  positionMismatches: [
    { symbol: "NVDA", brokerQuantity: "40", replayedQuantity: "4" },
    { symbol: "VWCE", brokerQuantity: "12.5", replayedQuantity: "12" },
  ],
};

export const brokerImportNothingNew: BrokerImportResponse = {
  trades: 0,
  cashEntries: 0,
  conversions: 0,
  transfers: 0,
  duplicates: 27,
  skipped: 0,
  securitiesCreated: 0,
  pricesUpdated: 0,
  splits: 0,
  skippedCorporateActions: [],
  positionMismatches: null,
};

export const oversellProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/investments/transactions",
  detail: "You cannot sell more than you hold: 12 MSFT on this account on that date.",
};

export const duplicateSecurityProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.8",
  title: "Conflict",
  status: 409,
  instance: "/api/investments/securities",
  code: "conflict.duplicate",
  detail: "A security with this symbol and currency already exists.",
};

export const securityNotHeldProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.3",
  title: "Forbidden",
  status: 403,
  instance: "/api/investments/securities/price",
  code: "security.notHeld",
  detail: "Only a holder of the security or an administrator can set its price.",
};

export const brokerSyncProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/investments/connections/sync",
  detail:
    "Interactive Brokers rejected the request: the token has expired (code 1012). Create a new token in Flex Web Service and save it here.",
};
