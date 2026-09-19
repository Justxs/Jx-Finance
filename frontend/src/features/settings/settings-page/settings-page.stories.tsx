import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { settings } from "@/storybook/fixtures";
import { errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
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
    msw: {
      handlers: [getSettingsMockHandler({ ...settings, ...patch }), ...handlers],
    },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const name = await canvas.findByLabelText("Installation name");
    await expect(canvas.queryByRole("button", { name: "Save" })).toBeNull();
    await userEvent.type(name, " Home");
    await expect(await canvas.findByRole("button", { name: "Save" })).toBeEnabled();
    await expect(canvas.getByText("You have unsaved changes.")).toBeInTheDocument();
  },
};

export const ReportingCurrencyWarning: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByLabelText("Reporting currency"));
    await userEvent.click(await within(document.body).findByRole("option", { name: /^USD/ }));
    await expect(canvas.getByText(/revalues every transaction/)).toBeInTheDocument();
  },
};
