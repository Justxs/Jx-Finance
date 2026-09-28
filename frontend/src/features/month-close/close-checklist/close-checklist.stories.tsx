import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { clearOpenMonthReview, emptyMonthReview, openMonthReview } from "@/storybook/fixtures";
import { CloseChecklist } from "./close-checklist";

const meta = {
  title: "Features/MonthClose/CloseChecklist",
  component: CloseChecklist,
  parameters: { layout: "padded" },
  args: { month: "2026-08", checklist: openMonthReview.checklist },
} satisfies Meta<typeof CloseChecklist>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithOpenItems: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Categorize" })).toHaveAttribute(
      "href",
      expect.stringContaining("uncategorized=true"),
    );
    await expect(canvas.getByRole("link", { name: "Review" })).toHaveAttribute(
      "href",
      expect.stringContaining("unusual=true"),
    );
    await expect(canvas.getByRole("link", { name: "Confirm" })).toBeVisible();
    await expect(canvas.getByText(/before the month ends/)).toBeVisible();
  },
};

export const AllClear: Story = {
  args: { checklist: clearOpenMonthReview.checklist },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("link")).toBeNull();
  },
};

export const OpenItemsOnly: Story = {
  args: { openOnly: true },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText("No recurring entry is waiting")).toBeNull();
    await expect(canvas.getByRole("link", { name: "Categorize" })).toBeVisible();
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
