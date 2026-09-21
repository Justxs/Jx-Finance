import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  buildTagBreakdownItems,
  reportSummaryMonthCompared,
  reportSummaryYear,
  transactions,
} from "@/storybook/fixtures";
import { TagBreakdown } from "./tag-breakdown";

const monthItems = buildTagBreakdownItems(transactions);

const meta = {
  title: "Features/Reports/TagBreakdown",
  component: TagBreakdown,
  args: { items: monthItems, dateFrom: "2026-09-01", dateTo: "2026-09-30" },
  parameters: { route: "/reports" },
  decorators: [withWidth("card")],
} satisfies Meta<typeof TagBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/untagged|be žymos/i)).toBeInTheDocument();
  },
};

export const Year: Story = { args: { items: reportSummaryYear.expenseByTag } };

export const OnlyUntagged: Story = {
  args: { items: [{ tagId: null, tagName: "Untagged", amount: "120.00" }] },
};

export const Empty: Story = { args: { items: [] } };

export const ComparedWithAnEarlierPeriod: Story = {
  args: { items: reportSummaryMonthCompared.expenseByTag },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect((await canvas.findAllByText(/^(was|buvo) /i)).length).toBeGreaterThan(0);
  },
};

export const ATagOnlyTheEarlierPeriodHad: Story = {
  args: {
    items: [
      { tagId: "tag-now", tagName: "Renovation", amount: "240.00", comparisonAmount: "60.00" },
      { tagId: "tag-gone", tagName: "Holiday", amount: "0.00", comparisonAmount: "820.00" },
      { tagId: null, tagName: "Untagged", amount: "18.00", comparisonAmount: "0.00" },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(await canvas.findByRole("link", { name: "Holiday" })).toBeVisible();
    await expect(canvas.getAllByText(/up from nothing|anksčiau nebuvo nieko/i)).toHaveLength(1);
  },
};
