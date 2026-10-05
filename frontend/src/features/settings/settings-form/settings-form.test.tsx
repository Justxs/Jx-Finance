import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { getUpdateSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import type { SettingsSection } from "@/components/settings-layout/settings-layout";
import { accounts, serverErrorProblem } from "@/storybook/fixtures";
import type { SettingsPatch } from "@/storybook/fixtures/settings";
import { failWith } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { mockApi, renderInApp } from "@/test/api";
import { settingsFixture } from "@/test/settings";
import { SettingsForm } from "./settings-form";

const api = mockApi();

function renderForm(section: SettingsSection, patch: SettingsPatch = {}) {
  return renderInApp(
    <SettingsForm
      section={section}
      settings={settingsFixture(patch)}
      accounts={accounts}
      exchangeRates={null}
    />,
  );
}

async function sentSettings() {
  await waitFor(() => expect(api.sent("PUT", "/api/settings")).toHaveLength(1));
  return api.lastBody("PUT", "/api/settings");
}

test("saving sends the trimmed name with the other settings, confirms it and hides the bar", async () => {
  renderForm("general");

  fireEvent.change(await screen.findByLabelText("Installation name"), {
    target: { value: "  Kazlauskai  " },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByText("Settings saved")).toBeInTheDocument();
  expect(await sentSettings()).toMatchObject({
    instanceName: "Kazlauskai",
    reportingCurrency: "eur",
    enabledCurrencies: ["eur", "usd"],
    timeZone: "Europe/Vilnius",
    defaultAccountId: null,
    defaultPageSize: 20,
  });
  await waitFor(() => expect(screen.getByRole("status")).toBeEmptyDOMElement());
});

test("discarding restores the saved values and sends nothing", async () => {
  renderForm("general", { instanceName: "Home" });

  const name = await screen.findByLabelText("Installation name");
  fireEvent.change(name, { target: { value: "Something else" } });
  fireEvent.click(await screen.findByRole("button", { name: "Discard changes" }));

  expect(name).toHaveValue("Home");
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
  expect(api.sent("PUT", "/api/settings")).toHaveLength(0);
});

test("a failed save keeps the changes and shows the error", async () => {
  api.use(getUpdateSettingsMockHandler(failWith(serverErrorProblem)));
  renderForm("general");

  fireEvent.change(await screen.findByLabelText("Installation name"), {
    target: { value: "Kazlauskai" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("status")).toBeInTheDocument();
  expect(screen.getByLabelText("Installation name")).toHaveValue("Kazlauskai");
});

test("switching a feature on is saved with the other features unchanged", async () => {
  renderForm("features");

  const places = await screen.findByRole("checkbox", { name: "Places" });
  expect(places).not.toBeChecked();
  fireEvent.click(places);
  fireEvent.click(await screen.findByRole("button", { name: "Save" }));

  expect(await sentSettings()).toMatchObject({
    features: { ...settingsFixture().features, locations: true },
  });
});

test("selecting no currencies keeps only the reporting currency", async () => {
  renderForm("currencies", { enabledCurrencies: ["eur", "usd", "gbp"] });

  fireEvent.click(await screen.findByRole("button", { name: "Only reporting currency" }));
  fireEvent.click(await screen.findByRole("button", { name: "Save" }));

  expect(await sentSettings()).toMatchObject({ enabledCurrencies: ["eur"] });
});

test("with multiple currencies off the currency choices are locked", async () => {
  renderForm("currencies", { features: { multiCurrency: false } });

  expect(await screen.findByRole("button", { name: "Select all" })).toBeDisabled();
  expect(screen.getByRole("checkbox", { name: /^USD/u })).toHaveAttribute("aria-disabled", "true");
});

test("choosing another reporting currency warns before it is saved", async () => {
  renderForm("currencies");

  await chooseOption(await screen.findByLabelText("Reporting currency"), /^USD/u);

  expect(screen.getByText(/revalues every transaction/u)).toBeInTheDocument();
  expect(api.sent("PUT", "/api/settings")).toHaveLength(0);
});
