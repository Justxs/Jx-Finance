import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { clearOpenMonthReview, emptyMonthReview, openMonthReview } from "@/storybook/fixtures";
import { CloseChecklist } from "./close-checklist";

const meta = {
  title: "Features/MonthClose/CloseChecklist",
  component: CloseChecklist,
  parameters: { layout: "padded", route: "/close" },
  args: { month: "2026-08", checklist: openMonthReview.checklist },
} satisfies Meta<typeof CloseChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithOpenItems: Story = {
  play: async ({ canvas }) => {
    const links = canvas.getAllByRole("link", { name: "Review" });
    await expect(links).toHaveLength(3);
    await expect(links[0]).toHaveAttribute("href", expect.stringContaining("uncategorized=true"));
    await expect(canvas.getByText(/before the month ends/)).toBeVisible();
  },
};

export const AllClear: Story = {
  args: { checklist: clearOpenMonthReview.checklist },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link", { name: "Review" })).toBeNull();
  },
};

export const FeaturesOff: Story = {
  args: {
    checklist: {
      ...emptyMonthReview.checklist,
      unusual: null,
      unconfirmedRecurring: null,
      imports: null,
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("listitem")).toHaveLength(1);
  },
};
