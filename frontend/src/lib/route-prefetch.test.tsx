import { act, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import type {
  CurrenciesResponse,
  PagedResponseOfTransactionResponse,
  TransactionsSummaryResponse,
} from "@/api/generated/model";
import { setAuthenticated, setSetupNeeded } from "@/lib/auth-gate";
import { currentUser } from "@/storybook/fixtures";
import { APP_TEST_TIMEOUT, appWait, mountApp, settled } from "@/test/app-router";
import { settingsFixture } from "@/test/settings";

vi.setConfig({ testTimeout: APP_TEST_TIMEOUT });

const currencies: CurrenciesResponse = {
  reportingCurrency: "eur",
  currencies: ["eur", "usd"],
  ratesAsOf: null,
};

const summary: TransactionsSummaryResponse = {
  count: 0,
  totalIncome: "0.00",
  totalExpense: "0.00",
};

function emptyPage(url: URL): PagedResponseOfTransactionResponse {
  return {
    items: [],
    page: Number(url.searchParams.get("page")),
    pageSize: Number(url.searchParams.get("pageSize")),
    total: 0,
  };
}

function bodyFor(url: URL): unknown {
  switch (url.pathname) {
    case "/api/auth/me":
      return currentUser;
    case "/api/settings":
    case "/api/settings/public":
      return settingsFixture();
    case "/api/currencies":
      return currencies;
    case "/api/transactions":
      return emptyPage(url);
    case "/api/transactions/summary":
      return summary;
    default:
      return [];
  }
}

let requested: string[] = [];
let failing: ReadonlySet<string> = new Set();

function networkTurn() {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });
}

async function respond(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input, "http://localhost");
  url.searchParams.sort();
  requested.push(`${url.pathname}${url.search}`);
  await networkTurn();
  if (failing.has(url.pathname)) {
    return Response.json({ title: "Broken" }, { status: 500 });
  }
  return Response.json(bodyFor(url));
}

function requestsTo(pathname: string) {
  return requested.filter((entry) => entry.split("?")[0] === pathname);
}

beforeEach(() => {
  requested = [];
  failing = new Set();
  setSetupNeeded(false);
  setAuthenticated(true);
  vi.stubGlobal("fetch", vi.fn(respond));
});

test("the transactions route asks for each primary endpoint once", async () => {
  const { queryClient } = mountApp("/transactions?type=expense");

  await screen.findByRole("heading", { level: 1, name: "Transactions" }, appWait);
  await settled(queryClient);

  expect(requestsTo("/api/transactions")).toEqual([
    "/api/transactions?page=1&pageSize=20&type=expense",
  ]);
  expect(requestsTo("/api/transactions/summary")).toEqual([
    "/api/transactions/summary?type=expense",
  ]);
  expect(requestsTo("/api/accounts")).toHaveLength(1);
  expect(requestsTo("/api/categories")).toHaveLength(1);
  expect(requestsTo("/api/settings")).toHaveLength(1);
  expect(requestsTo("/api/notifications")).toHaveLength(1);
});

test("changing the page asks only for the new page", async () => {
  const { queryClient, router } = mountApp("/transactions");
  await screen.findByRole("heading", { level: 1, name: "Transactions" }, appWait);
  await settled(queryClient);
  requested = [];

  await act(() => router.navigate({ to: "/transactions", search: { page: 2 } }));
  await settled(queryClient);

  expect(requestsTo("/api/transactions")).toEqual(["/api/transactions?page=2&pageSize=20"]);
  expect(requestsTo("/api/accounts")).toHaveLength(0);
  expect(requestsTo("/api/categories")).toHaveLength(0);
});

test("a failing endpoint leaves the route loaded and the failure to the page", async () => {
  failing = new Set(["/api/transactions"]);
  const { queryClient, router } = mountApp("/transactions");

  await settled(queryClient);
  await waitFor(() => expect(router.state.status).toBe("idle"), appWait);

  expect(router.state.matches.map((match) => match.status)).toEqual(["success", "success"]);
  expect(requestsTo("/api/transactions")).toHaveLength(1);
});
