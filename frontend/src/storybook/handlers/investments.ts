import type { RequestHandler } from "msw";
import { z } from "zod";
import {
  getCreateInvestmentTransactionMockHandler,
  getCreateSecurityMockHandler,
  getDeleteBrokerConnectionMockHandler,
  getDeleteInvestmentTransactionMockHandler,
  getBrokerConnectionsMockHandler,
  getInvestmentTransactionsMockHandler,
  getPortfolioMockHandler,
  getSecuritiesMockHandler,
  getImportBrokerReportMockHandler,
  getSaveBrokerConnectionMockHandler,
  getSyncBrokerConnectionMockHandler,
  getUpdateInvestmentTransactionMockHandler,
  getSetSecurityPriceMockHandler,
  getUpdateSecurityMockHandler,
} from "@/api/generated/investments/investments.msw";
import { InvestmentTransactionType, type SecurityResponse } from "@/api/generated/model";
import {
  FIXTURE_TODAY,
  brokerConnections,
  brokerImportResult,
  duplicateSecurityProblem,
  emptyPortfolio,
  investmentTransactions,
  oversellProblem,
  portfolio,
  securities,
} from "@/storybook/fixtures";
import { currencyCode, found, problem, readBody, text } from "./http";
import { CREATED_AT, NEW_ID } from "./ids";
import { byId, emptyPage, paginate } from "./lists";

const investmentType = z.enum(InvestmentTransactionType).catch("buy");

export const investmentHandlers = [
  getPortfolioMockHandler(({ request }) => {
    const accountId = new URL(request.url).searchParams.get("accountId");
    const held = portfolio.holdings.some((holding) => holding.accountId === accountId);
    return !accountId || held ? portfolio : emptyPortfolio;
  }),
  getInvestmentTransactionsMockHandler(({ request }) => {
    const params = new URL(request.url).searchParams;
    const accountId = params.get("accountId");
    const securityId = params.get("securityId");
    const type = params.get("type");
    const items = investmentTransactions.filter(
      (item) =>
        (!accountId || item.accountId === accountId) &&
        (!securityId || item.securityId === securityId) &&
        (!type || item.type === type),
    );
    return paginate(items, params);
  }),
  getCreateInvestmentTransactionMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const security = securities.find((item) => item.id === body.securityId);
    const type = investmentType.parse(body.type);
    const quantity = Number(text(body.quantity) ?? 0);
    const held = portfolio.holdings.find((holding) => holding.security.id === security?.id);
    if (type === "sell" && quantity > Number(held?.quantity ?? 0)) {
      throw problem(oversellProblem, 400);
    }

    const gross = quantity * Number(text(body.price) ?? 0);
    const fee = Number(text(body.fee) ?? 0);
    const amount = Number(text(body.amount) ?? 0);
    const cashByType: Record<InvestmentTransactionType, number> = {
      buy: -(gross + fee),
      sell: gross - fee,
      dividend: amount,
      interest: amount,
      withholdingTax: -amount,
      fee: -amount,
      split: 0,
    };
    return {
      id: NEW_ID,
      accountId: text(body.accountId) ?? "",
      securityId: security?.id ?? null,
      symbol: security?.symbol ?? null,
      type,
      date: text(body.date) ?? FIXTURE_TODAY,
      quantity: text(body.quantity) ?? "0",
      price: text(body.price) ?? "0",
      fee: fee.toFixed(2),
      cashAmount: cashByType[type].toFixed(2),
      currency: security?.currency ?? currencyCode.catch("eur").parse(body.currency),
      description: text(body.description),
      source: "manual",
      createdAt: CREATED_AT,
    };
  }),
  getUpdateInvestmentTransactionMockHandler(({ params }) =>
    found(byId(investmentTransactions, params.id)),
  ),
  getDeleteInvestmentTransactionMockHandler(),
  getSecuritiesMockHandler(({ request }) => {
    const search = new URL(request.url).searchParams.get("search")?.toLowerCase() ?? "";
    return securities.filter((item) =>
      [item.symbol, item.name, item.isin ?? ""].some((value) =>
        value.toLowerCase().includes(search),
      ),
    );
  }),
  getCreateSecurityMockHandler(async ({ request }) => {
    const body = await readBody(request);
    const exists = securities.some(
      (item) => item.symbol === body.symbol && item.currency === body.currency,
    );
    if (exists) {
      throw problem(duplicateSecurityProblem, 409);
    }

    const created: SecurityResponse = {
      id: NEW_ID,
      symbol: "",
      name: "",
      isin: null,
      exchange: null,
      type: "stock",
      currency: "eur",
      lastPrice: null,
      lastPriceDate: null,
      ...body,
    };
    const lastPriceDate = created.lastPrice ? (created.lastPriceDate ?? FIXTURE_TODAY) : null;
    return { ...created, lastPriceDate };
  }),
  getUpdateSecurityMockHandler(async ({ params, request }) => ({
    ...found(byId(securities, params.id)),
    ...(await readBody(request)),
  })),
  getSetSecurityPriceMockHandler(async ({ params, request }) => {
    const body = await readBody(request);
    return {
      ...found(byId(securities, params.id)),
      lastPrice: text(body.lastPrice),
      lastPriceDate: text(body.lastPriceDate) ?? FIXTURE_TODAY,
    };
  }),
  getImportBrokerReportMockHandler(brokerImportResult),
  getBrokerConnectionsMockHandler(brokerConnections),
  getSaveBrokerConnectionMockHandler(async ({ params, request }) => {
    const body = await readBody(request);
    const existing = brokerConnections.find((item) => item.accountId === params.accountId);
    return {
      accountId: String(params.accountId),
      fundingAccountId: text(body.fundingAccountId),
      queryId: text(body.queryId) ?? "",
      isEnabled: body.isEnabled !== false,
      lastSyncAt: existing?.lastSyncAt ?? null,
      lastError: null,
    };
  }),
  getDeleteBrokerConnectionMockHandler(),
  getSyncBrokerConnectionMockHandler(brokerImportResult),
];

export const emptyInvestmentHandlers: RequestHandler[] = [
  getPortfolioMockHandler(emptyPortfolio),
  getInvestmentTransactionsMockHandler(emptyPage),
  getSecuritiesMockHandler([]),
  getBrokerConnectionsMockHandler([]),
];
