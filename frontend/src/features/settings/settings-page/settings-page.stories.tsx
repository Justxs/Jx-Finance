import type { Meta, StoryObj } from "@storybook/react-vite";
import { HttpResponse, http } from "msw";
import { expect, userEvent, within } from "storybook/test";
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
      handlers: [
        http.get("*/api/settings", () => HttpResponse.json({ ...settings, ...patch })),
        ...handlers,
      ],
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
    const save = await canvas.findByRole("button", { name: "Save" });
    await expect(save).toBeDisabled();
    await userEvent.click(canvas.getByText("Goals"));
    await expect(save).toBeEnabled();
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
