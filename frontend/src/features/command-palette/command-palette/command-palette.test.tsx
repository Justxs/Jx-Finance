import type { QueryClient } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type {
  AccountResponse,
  CategoryResponse,
  TagResponse,
  UserProfileResponse,
} from "@/api/generated/model";
import { setAuthenticated, setSetupNeeded } from "@/lib/auth-gate";
import { UserRole } from "@/lib/user-role";
import { setCommandPaletteOpen, toggleCommandPalette } from "@/stores/command-palette-store";
import { preferencesCollection } from "@/stores/preferences";
import { APP_TEST_TIMEOUT, appWait, mountApp, settled } from "@/test/app-router";
import { settingsFixture } from "@/test/settings";

await Promise.all([
  import("@/features/net-worth/net-worth-history-chart/net-worth-history-chart"),
  import("@/features/net-worth/net-worth-composition-chart/net-worth-composition-chart"),
]);

vi.setConfig({ testTimeout: APP_TEST_TIMEOUT });

const admin: UserProfileResponse = {
  id: "0b0e6c1e-6f0f-4b57-9a53-0d5a3f1f0001",
  email: "ruta@example.lt",
  displayName: "Ruta",
  role: UserRole.admin,
  twoFactorEnabled: false,
  isActive: true,
  emailConfirmed: true,
  billReminderEmails: false,
};

const accounts: AccountResponse[] = [
  {
    id: "8e0d1a3c-0000-4000-8000-000000000001",
    name: "Swedbank einamoji",
    description: null,
    iban: null,
    type: "checking",
    startingBalance: "0.00",
    currentBalance: "0.00",
    createdAt: "2026-01-01T00:00:00Z",
    scope: "personal",
    currency: "eur",
    balances: [],
    reportingBalance: "0.00",
    holdingsValue: "0.00",
    householdId: null,
  },
];

const categories: CategoryResponse[] = [
  {
    id: "8e0d1a3c-0000-4000-8000-000000000002",
    name: "Kavinės ir restoranai",
    type: "expense",
    icon: null,
    isDefault: false,
    scope: "personal",
    householdId: null,
  },
];

const tags: TagResponse[] = [
  {
    id: "8e0d1a3c-0000-4000-8000-000000000003",
    name: "Atostogos",
    scope: "personal",
    householdId: null,
  },
];

let role: UserProfileResponse["role"] = UserRole.admin;
let features = settingsFixture().features;
let requested: string[] = [];

function bodyFor(url: URL): unknown {
  switch (url.pathname) {
    case "/api/auth/me":
      return { ...admin, role };
    case "/api/settings":
    case "/api/settings/public":
      return settingsFixture({ features });
    case "/api/accounts":
      return accounts;
    case "/api/categories":
      return categories;
    case "/api/tags":
      return tags;
    default:
      return [];
  }
}

async function respond(input: RequestInfo | URL): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : input, "http://localhost");
  requested.push(url.pathname);
  return Response.json(bodyFor(url));
}

function requestsTo(pathname: string) {
  return requested.filter((entry) => entry === pathname);
}

function mount() {
  return mountApp("/net-worth");
}

async function openPalette(queryClient: QueryClient) {
  await act(async () => {
    toggleCommandPalette();
  });
  const dialog = await screen.findByRole("dialog", {}, appWait);
  await settled(queryClient);
  return dialog;
}

function searchBox() {
  return screen.getByRole("combobox", { name: "Search pages, records and actions" });
}

function optionNames() {
  return screen.getAllByRole("option").map((option) => option.textContent ?? "");
}

beforeEach(() => {
  requested = [];
  role = UserRole.admin;
  features = settingsFixture().features;
  setSetupNeeded(false);
  setAuthenticated(true);
  setCommandPaletteOpen(false);
  if (preferencesCollection.has("browser")) {
    preferencesCollection.delete("browser");
  }
  vi.stubGlobal("fetch", vi.fn(respond));
});

afterEach(() => {
  setCommandPaletteOpen(false);
});

test("nothing is loaded for the palette until it is opened for the first time", async () => {
  const { queryClient } = mount();
  await screen.findByRole("heading", { level: 1, name: "Net worth" }, appWait);
  await settled(queryClient);

  expect(requestsTo("/api/accounts")).toHaveLength(0);
  expect(requestsTo("/api/categories")).toHaveLength(0);
  expect(requestsTo("/api/tags")).toHaveLength(0);
  const householdsBefore = requestsTo("/api/households").length;

  await openPalette(queryClient);

  expect(requestsTo("/api/accounts")).toHaveLength(1);
  expect(requestsTo("/api/categories")).toHaveLength(1);
  expect(requestsTo("/api/tags")).toHaveLength(1);
  expect(requestsTo("/api/households")).toHaveLength(householdsBefore);
});

test("opening shows a labelled combobox whose first match is the active descendant", async () => {
  const { queryClient } = mount();
  await settled(queryClient);
  const dialog = await openPalette(queryClient);

  const input = searchBox();
  expect(input).toHaveAttribute("aria-expanded", "true");
  expect(within(dialog).getByRole("listbox", { name: "Matches" })).toHaveAttribute(
    "id",
    input.getAttribute("aria-controls"),
  );

  const first = screen.getAllByRole("option")[0];
  expect(input).toHaveAttribute("aria-activedescendant", first?.id);
  expect(first).toHaveAttribute("aria-selected", "true");
});

test("typing narrows the list to what matches, ignoring case and accents", async () => {
  const { queryClient } = mount();
  await settled(queryClient);
  await openPalette(queryClient);

  fireEvent.change(searchBox(), { target: { value: "kavines" } });

  expect(optionNames().some((name) => name.includes("Kavinės ir restoranai"))).toBe(true);
  expect(screen.getAllByRole("option")).toHaveLength(1);
});

test("a query nothing answers shows the empty state instead of a listbox", async () => {
  const { queryClient } = mount();
  await settled(queryClient);
  await openPalette(queryClient);

  fireEvent.change(searchBox(), { target: { value: "qqqjjj" } });

  expect(screen.queryByRole("listbox")).toBeNull();
  expect(searchBox()).toHaveAttribute("aria-expanded", "false");
  await screen.findByText("Nothing matches what you typed.");
});

test("the arrow keys move the active descendant and Enter runs the entry", async () => {
  const { queryClient, router } = mount();
  await settled(queryClient);
  await openPalette(queryClient);

  const input = searchBox();
  fireEvent.change(input, { target: { value: "tags" } });
  const [first, second] = screen.getAllByRole("option");
  expect(input).toHaveAttribute("aria-activedescendant", first?.id);

  fireEvent.keyDown(input, { key: "ArrowDown" });
  expect(input).toHaveAttribute("aria-activedescendant", second?.id);

  fireEvent.keyDown(input, { key: "ArrowUp" });
  expect(input).toHaveAttribute("aria-activedescendant", first?.id);

  await act(async () => {
    fireEvent.keyDown(input, { key: "Enter" });
  });

  await waitFor(() => expect(router.state.location.pathname).toBe("/tags"), appWait);
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), appWait);
});

test("what was chosen is offered first the next time", async () => {
  const { queryClient } = mount();
  await settled(queryClient);
  await openPalette(queryClient);

  fireEvent.change(searchBox(), { target: { value: "trash" } });
  await act(async () => {
    fireEvent.keyDown(searchBox(), { key: "Enter" });
  });
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull(), appWait);

  await openPalette(queryClient);

  expect(optionNames()[0]).toContain("Trash");
});

test("an administrator is offered the settings sections and a backup", async () => {
  const { queryClient } = mount();
  await settled(queryClient);
  await openPalette(queryClient);

  fireEvent.change(searchBox(), { target: { value: "email" } });
  expect(optionNames().some((name) => name.includes("Email"))).toBe(true);

  fireEvent.change(searchBox(), { target: { value: "back up" } });
  expect(optionNames().some((name) => name.includes("Back up now"))).toBe(true);
});

test("a member is offered neither, and a switched-off feature keeps its pages out", async () => {
  role = UserRole.member;
  features = { ...features, investments: false };
  const { queryClient } = mount();
  await settled(queryClient);
  await openPalette(queryClient);

  fireEvent.change(searchBox(), { target: { value: "email" } });
  expect(screen.queryByRole("listbox")).toBeNull();

  fireEvent.change(searchBox(), { target: { value: "Back up now" } });
  expect(screen.queryByRole("listbox")).toBeNull();

  fireEvent.change(searchBox(), { target: { value: "Investment tax summary" } });
  expect(screen.queryByRole("listbox")).toBeNull();
});
