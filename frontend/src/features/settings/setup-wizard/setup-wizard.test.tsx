import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { getSettingsQueryKey } from "@/api/generated";
import type { SettingsResponse } from "@/api/generated/model";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { getSetupReadinessMockHandler } from "@/api/generated/setup/setup.msw";
import { settingsWith } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { SetupWizard } from "./setup-wizard";

const api = mockApi();

test("the basics are saved with the settings the wizard does not show, then features open", async () => {
  api.use(getSettingsMockHandler(settingsWith({ setupPending: true, defaultPageSize: 50 })));
  const { router } = renderInApp(<SetupWizard step="basics" />, { path: "/setup" });

  fireEvent.change(await screen.findByLabelText("Installation name"), {
    target: { value: " Home ledger " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  await waitFor(() => expect(router.state.location.search).toEqual({ step: "features" }));
  expect(await api.lastBody("PUT", "/api/settings")).toMatchObject({
    instanceName: "Home ledger",
    defaultPageSize: 50,
    timeZone: "Europe/Vilnius",
    enabledCurrencies: settingsWith().enabledCurrencies,
  });
});

test("a preset sets the features that are saved", async () => {
  renderInApp(<SetupWizard step="features" />, { path: "/setup" });

  fireEvent.click(await screen.findByRole("radio", { name: "Track spending" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));

  await waitFor(() => expect(api.sent("PUT", "/api/settings")).toHaveLength(1));
  expect(await api.lastBody("PUT", "/api/settings")).toMatchObject({
    features: { import: true, reports: true, budgets: false, investments: false },
  });
});

test("skipping finishes the setup without saving and opens the dashboard", async () => {
  const { router, queryClient } = renderInApp(<SetupWizard step="basics" />, { path: "/setup" });

  fireEvent.click(await screen.findByRole("button", { name: "Skip for now" }));

  await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  expect(api.sent("POST", "/api/setup/finish")).toHaveLength(1);
  expect(api.sent("PUT", "/api/settings")).toHaveLength(0);
  expect(queryClient.getQueryData<SettingsResponse>(getSettingsQueryKey())?.setupPending).toBe(
    false,
  );
});

test("the tour finishes the setup", async () => {
  const { router } = renderInApp(<SetupWizard step="tour" />, { path: "/setup" });

  fireEvent.click(await screen.findByRole("button", { name: "Go to the dashboard" }));

  await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  expect(api.sent("POST", "/api/setup/finish")).toHaveLength(1);
});

test("the start step loads demo data and continues to the notifications", async () => {
  const { router } = renderInApp(<SetupWizard step="start" />, { path: "/setup" });

  fireEvent.click(await screen.findByRole("radio", { name: "Demo data" }));
  fireEvent.click(await screen.findByRole("button", { name: "Load demo data" }));
  await waitFor(() => expect(api.sent("POST", "/api/setup/demo-data")).toHaveLength(1));

  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  await waitFor(() => expect(router.state.location.search).toEqual({ step: "notifications" }));
});

test("a server without Tesseract says so on the receipt reading switch", async () => {
  api.use(getSetupReadinessMockHandler({ receiptReaderInstalled: false }));
  renderInApp(<SetupWizard step="features" />, { path: "/setup" });

  expect(
    await screen.findByText(/Needs Tesseract on this server, which is not installed yet\./u),
  ).toBeInTheDocument();
});

test("the restore choice warns that the administrator is replaced", async () => {
  renderInApp(<SetupWizard step="start" />, { path: "/setup" });

  fireEvent.click(await screen.findByRole("radio", { name: "Restore" }));

  expect(
    await screen.findByText(/including the administrator you just created/u),
  ).toBeInTheDocument();
});
