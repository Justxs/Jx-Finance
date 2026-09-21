import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { getValueHistoryMockHandler } from "@/api/generated/investments/investments.msw";
import { withWidth } from "@/storybook/decorators";
import { partialValueHistory, valueHistory } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { ValueChartSection } from "./value-chart-section";

const meta = {
  title: "Features/Investments/ValueChartSection",
  component: ValueChartSection,
  parameters: { route: "/investments" },
  decorators: [withWidth("w-[min(48rem,calc(100vw-3rem))]")],
} satisfies Meta<typeof ValueChartSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("img", {
        name: "Portfolio market value and invested cost over time",
      }),
    ).toBeVisible();
    await expect(canvas.getByText("Market value")).toBeVisible();
    await expect(canvas.getByText("Invested")).toBeVisible();
  },
};

export const Partial: Story = {
  parameters: {
    msw: { handlers: [getValueHistoryMockHandler(partialValueHistory), ...handlers] },
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(/had no price or exchange rate yet/),
    ).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: { msw: { handlers: emptyHandlers } },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("Nothing was held in this range."),
    ).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

const requested: string[] = [];

export const ChangesRange: Story = {
  parameters: {
    msw: {
      handlers: [
        getValueHistoryMockHandler(({ request }) => {
          requested.push(new URL(request.url).searchParams.get("from") ?? "");
          return valueHistory;
        }),
        ...handlers,
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByRole("img");
    await expect(requested.some((from) => /^20\d{2}-\d{2}-\d{2}$/u.test(from))).toBe(true);
    await chooseOption(canvas.getByRole("combobox", { name: "Range" }), "All time");

    await waitFor(() => expect(requested).toContain("1970-01-01"));
  },
};
