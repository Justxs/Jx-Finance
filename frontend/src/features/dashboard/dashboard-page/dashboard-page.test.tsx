import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";
import type {
  DashboardLayoutResponse,
  FeatureFlags,
  UserProfileResponse,
} from "@/api/generated/model";
import { DashboardLayoutResponse as layoutSchema } from "@/api/schemas/dashboard/dashboard.zod";
import { setAuthenticated, setSetupNeeded } from "@/lib/auth-gate";
import { APP_TEST_TIMEOUT, appWait, mountApp, settled } from "@/test/app-router";
import { settingsFixture } from "@/test/settings";

await import("@/features/net-worth/net-worth-history-chart/net-worth-history-chart");

vi.setConfig({ testTimeout: APP_TEST_TIMEOUT });

const me: UserProfileResponse = {
  id: "0b0e6c1e-6f0f-4b57-9a53-0d5a3f1f0001",
  email: "ruta@example.lt",
  displayName: "Ruta",
  role: "Member",
  twoFactorEnabled: false,
  isActive: true,
  emailConfirmed: true,
  billReminderEmails: false,
};

const everyCard: DashboardLayoutResponse["order"] = [
  "summary",
  "monthlyTrend",
  "spendingByCategory",
  "spendingPace",
  "budgets",
  "netWorth",
  "accounts",
  "recentTransactions",
  "upcomingBills",
];

const savedShape = layoutSchema.pick({ order: true, hidden: true });

let layout: DashboardLayoutResponse;
let features: FeatureFlags;
let requested: string[] = [];
let saved: unknown[] = [];

function bodyFor(url: URL): unknown {
  switch (url.pathname) {
    case "/api/auth/me":
      return me;
    case "/api/settings":
    case "/api/settings/public":
      return settingsFixture({ features });
    case "/api/users/me/dashboard-layout":
      return layout;
    case "/api/dashboard/summary":
      return {
        totalBalance: "0.00",
        monthIncome: "0.00",
        monthExpense: "0.00",
        monthStart: "2026-09-01",
        monthEnd: "2026-09-30",
      };
    case "/api/dashboard/monthly-trend":
      return { items: [] };
    case "/api/dashboard/category-breakdown":
      return { items: [], periodStart: "2026-09-01", periodEnd: "2026-09-30" };
    default:
      return [];
  }
}

async function respond(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const request =
    input instanceof Request
      ? input
      : new Request(new URL(String(input), "http://localhost"), init);
  const url = new URL(request.url, "http://localhost");
  requested.push(`${request.method} ${url.pathname}`);
  if (request.method === "PUT") {
    const body: unknown = await request.json();
    saved.push(body);
    layout = { ...savedShape.parse(body), isDefault: false };
  }
  return Response.json(bodyFor(url));
}

function fetched(pathname: string) {
  return requested.filter((entry) => entry === `GET ${pathname}`);
}

beforeEach(() => {
  requested = [];
  saved = [];
  layout = { order: everyCard, hidden: [], isDefault: true };
  features = {
    ...settingsFixture().features,
    budgets: true,
    recurringBills: true,
    netWorth: true,
    reports: true,
  };
  setSetupNeeded(false);
  setAuthenticated(true);
  vi.stubGlobal("fetch", vi.fn(respond));
});

test("hidden cards and cards of switched-off features never ask for their data", async () => {
  layout = {
    order: everyCard,
    hidden: ["budgets", "netWorth", "recentTransactions", "accounts"],
    isDefault: false,
  };
  features = { ...features, recurringBills: false, reports: false };
  const { queryClient } = mountApp("/");

  await screen.findByRole("heading", { level: 2, name: "Income vs. expenses" }, appWait);
  await settled(queryClient);

  expect(fetched("/api/users/me/dashboard-layout")).toHaveLength(1);
  expect(fetched("/api/dashboard/summary")).toHaveLength(1);
  expect(fetched("/api/dashboard/monthly-trend")).toHaveLength(1);
  expect(fetched("/api/budgets")).toHaveLength(0);
  expect(fetched("/api/networth/history")).toHaveLength(0);
  expect(fetched("/api/transactions")).toHaveLength(0);
  expect(fetched("/api/recurring-bills")).toHaveLength(0);
  expect(fetched("/api/reports/summary")).toHaveLength(0);
  expect(
    screen.queryByRole("heading", { name: "Budgets in their window" }),
  ).not.toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Upcoming bills" })).not.toBeInTheDocument();
});

test("a card is hidden and moved with the keyboard, then saved for the user", async () => {
  const { queryClient } = mountApp("/");
  await screen.findByRole("heading", { level: 2, name: "Income vs. expenses" }, appWait);
  await settled(queryClient);

  fireEvent.click(screen.getByRole("button", { name: "Customise" }));
  const list = await screen.findByRole("list", { name: "Dashboard cards" });
  fireEvent.click(within(list).getByRole("checkbox", { name: "Income vs. expenses" }));
  const down = within(list).getByRole("button", { name: "Move down: Total balance" });
  down.focus();
  fireEvent.click(down);
  expect(document.activeElement).toBe(
    within(list).getByRole("button", { name: "Move down: Total balance" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  await waitFor(() => expect(saved).toHaveLength(1), appWait);
  expect(saved[0]).toEqual({
    order: ["monthlyTrend", "summary", ...everyCard.slice(2)],
    hidden: ["monthlyTrend"],
  });
  await waitFor(
    () => expect(screen.queryByRole("list", { name: "Dashboard cards" })).not.toBeInTheDocument(),
    appWait,
  );
  expect(screen.queryByRole("heading", { name: "Income vs. expenses" })).not.toBeInTheDocument();
});
