import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { settings } from "@/storybook/fixtures";
import { errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { SettingsPage } from "./settings-page";

const meta = {
  title: "Features/Settings/SettingsPage",
  component: SettingsPage,
  parameters: { layout: "fullscreen", route: "/settings" },
  render: () => (
    <div className="p-6">
      <SettingsPage />
    </div>
  ),
} satisfies Meta<typeof SettingsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

function withSettings(patch: Partial<typeof settings>) {
  return {
    ...withHandlers(getSettingsMockHandler({ ...settings, ...patch })),
  };
}

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Customized: Story = {
  parameters: withSettings({
    instanceName: "Pranauskai",
    features: { ...settings.features, goals: false, households: false },
    enabledCurrencies: ["eur", "usd"],
    firstDayOfWeek: "sunday",
    defaultPageSize: 50,
  }),
};

export const MultiCurrencyOff: Story = {
  parameters: withSettings({ features: { ...settings.features, multiCurrency: false } }),
};

export const NoRatesYet: Story = {
  parameters: withSettings({ ratesAsOf: null, exchangeRateSyncEnabled: false }),
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const UnsavedChanges: Story = {
  play: async ({ canvas }) => {
    const name = await canvas.findByLabelText("Installation name");
    await expect(canvas.queryByRole("button", { name: "Save" })).toBeNull();
    await userEvent.type(name, " Home");
    await expect(await canvas.findByRole("button", { name: "Save" })).toBeEnabled();
    await expect(canvas.getByText("You have unsaved changes.")).toBeInTheDocument();
  },
};

export const ReportingCurrencyWarning: Story = {
  play: async ({ canvas }) => {
    await chooseOption(await canvas.findByLabelText("Reporting currency"), /^USD/);
    await expect(canvas.getByText(/revalues every transaction/)).toBeInTheDocument();
  },
};
