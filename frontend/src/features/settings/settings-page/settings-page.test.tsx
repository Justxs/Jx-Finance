import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { settingsSearchSchema } from "@/routes/settings";
import { memberUser } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { settingsFixture } from "@/test/settings";
import { SettingsPage } from "./settings-page";

const api = mockApi();
const pageLoad = { timeout: 8_000 };

function renderPage(section = "general") {
  return renderInApp(<SettingsPage />, {
    path: `/settings?section=${section}`,
    validateSearch: settingsSearchSchema,
  });
}

test("syncing rates says how many were added", async () => {
  renderPage("currencies");

  fireEvent.click(await screen.findByRole("button", { name: "Sync now" }, pageLoad));

  expect(await screen.findByText("62 rates added")).toBeInTheDocument();
  expect(api.sent("POST", "/api/settings/exchange-rates/sync")).toHaveLength(1);
});

test("the navigation leaves out market prices and the import inbox while their features are off", async () => {
  api.use(
    getSettingsMockHandler(settingsFixture({ features: { investments: false, import: false } })),
  );
  renderPage();

  expect(await screen.findByLabelText("Installation name", {}, pageLoad)).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Backups" }).length).toBeGreaterThan(0);
  expect(screen.queryAllByRole("link", { name: "Market prices" })).toHaveLength(0);
  expect(screen.queryAllByRole("link", { name: "Import inbox" })).toHaveLength(0);
});

test("a member who is not an administrator is offered no installation sections", async () => {
  api.use(getMeMockHandler(memberUser));
  renderPage();

  expect(await screen.findByLabelText("Installation name", {}, pageLoad)).toBeInTheDocument();
  expect(screen.queryAllByRole("link", { name: "Backups" })).toHaveLength(0);
});
