import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor } from "storybook/test";
import {
  getMarketPriceSettingsMockHandler,
  getSyncMarketPricesMockHandler,
} from "@/api/generated/settings/settings.msw";
import {
  marketPriceSettings,
  marketPriceSettingsOff,
  marketPriceSettingsWithFailures,
  marketPricesUnavailableProblem,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { MarketPricesSection } from "./market-prices-section";

const meta = {
  title: "Features/Settings/MarketPricesSection",
  component: MarketPricesSection,
  parameters: { layout: "padded", route: "/settings" },
} satisfies Meta<typeof MarketPricesSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  parameters: withHandlers(getMarketPriceSettingsMockHandler(marketPriceSettingsOff)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Fetch closing prices daily" }),
    ).not.toBeChecked();
    await expect(canvas.getByLabelText("EODHD API key")).toHaveValue("");
    await expect(canvas.getByText("Never")).toBeInTheDocument();
  },
};

export const OnWithKey: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("checkbox", { name: "Fetch closing prices daily" }),
    ).toBeChecked();
    await expect(canvas.getByText("Key saved")).toBeInTheDocument();
    await expect(canvas.queryByLabelText("EODHD API key")).toBeNull();
    await expect(canvas.getByText("No failures")).toBeInTheDocument();
  },
};

export const OnWithoutKey: Story = {
  parameters: withHandlers(
    getMarketPriceSettingsMockHandler({ ...marketPriceSettings, hasKey: false }),
  ),
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("EODHD API key")).toBeInTheDocument();
    await expect(canvas.queryByText("Key saved")).toBeNull();
  },
};

export const Failures: Story = {
  parameters: withHandlers(getMarketPriceSettingsMockHandler(marketPriceSettingsWithFailures)),
  play: async ({ canvas }) => {
    const region = await canvas.findByRole("region", {
      name: "Securities whose last fetch failed",
    });
    await expect(region).toHaveTextContent("EODHD refused: Ticker Not Found");
    await expect(region).toHaveTextContent("MSFT");
  },
};

export const NoFailures: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No failures")).toBeInTheDocument();
  },
};

export const SavingANewKey: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Replace" }));
    await fireEvent.change(canvas.getByLabelText("EODHD API key"), {
      target: { value: "new-key" },
    });
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByText("Key saved")).toBeInTheDocument();
  },
};

export const RemovingTheKey: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Remove" }));
    await expect(canvas.getByText("The key is removed when you save.")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));
    await expect(await canvas.findByLabelText("EODHD API key")).toBeInTheDocument();
  },
};

export const FetchNow: Story = {
  play: async ({ canvas }) => {
    const fetch = await canvas.findByRole("button", { name: /Fetch now/u });
    await userEvent.click(fetch);
    await waitFor(() => expect(fetch).toBeEnabled());
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const FetchPending: Story = {
  parameters: withHandlers(getSyncMarketPricesMockHandler(pending)),
  play: async ({ canvas }) => {
    const fetch = await canvas.findByRole("button", { name: /Fetch now/u });
    await userEvent.click(fetch);
    await waitFor(() => expect(fetch).toHaveAttribute("aria-busy", "true"));
  },
};

export const FetchUnavailable: Story = {
  parameters: withHandlers(
    getSyncMarketPricesMockHandler(failWith(marketPricesUnavailableProblem)),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /Fetch now/u }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "The price source cannot be reached right now.",
    );
  },
};

export const Loading: Story = {
  parameters: withHandlers(getMarketPriceSettingsMockHandler(pending)),
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
