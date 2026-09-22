import type { QueryClient } from "@tanstack/react-query";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from "vitest";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { setAuthenticated, setSetupNeeded } from "@/lib/auth-gate";
import { setCommandPaletteOpen, toggleCommandPalette } from "@/stores/command-palette-store";
import { categories, ids, memberUser } from "@/storybook/fixtures";
import { handlers } from "@/storybook/handlers";
import { APP_TEST_TIMEOUT, appWait, mountApp, settled } from "@/test/app-router";
import { resetPreferences } from "@/test/preferences";
import { settingsFixture } from "@/test/settings";

await Promise.all([
  import("@/features/net-worth/net-worth-history-chart/net-worth-history-chart"),
  import("@/features/net-worth/net-worth-composition-chart/net-worth-composition-chart"),
]);

vi.setConfig({ testTimeout: APP_TEST_TIMEOUT });

function categoryName(id: string) {
  const found = categories.find((category) => category.id === id);
  if (!found) {
    throw new Error(`no category fixture ${id}`);
  }
  return found.name;
}

const cafes = categoryName(ids.categories.cafes);
const server = setupServer(getSettingsMockHandler(settingsFixture()), ...handlers);
let requested: string[] = [];

server.events.on("request:start", ({ request }) => {
  requested.push(new URL(request.url).pathname);
});

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
  return screen.queryAllByRole("option").map((option) => option.textContent ?? "");
}

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(() => {
  requested = [];
  setSetupNeeded(false);
  setAuthenticated(true);
  setCommandPaletteOpen(false);
  resetPreferences();
});

afterEach(() => {
  setCommandPaletteOpen(false);
  server.resetHandlers();
});

afterAll(() => {
  server.close();
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

  expect(optionNames().some((name) => name.includes(cafes))).toBe(true);
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
  const { features } = settingsFixture();
  server.use(
    getMeMockHandler(memberUser),
    getSettingsMockHandler(settingsFixture({ features: { ...features, investments: false } })),
  );
  const { queryClient } = mount();
  await settled(queryClient);
  await openPalette(queryClient);

  fireEvent.change(searchBox(), { target: { value: "email" } });
  expect(optionNames().some((name) => name.includes("Email"))).toBe(false);

  fireEvent.change(searchBox(), { target: { value: "Back up now" } });
  expect(optionNames().some((name) => name.includes("Back up now"))).toBe(false);

  fireEvent.change(searchBox(), { target: { value: "Investment tax summary" } });
  expect(optionNames().some((name) => name.includes("Investment tax summary"))).toBe(false);
});
