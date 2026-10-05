import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getMonthReviewMockHandler } from "@/api/generated/month-close/month-close.msw";
import { savePreferences } from "@/stores/preferences";
import {
  clearOpenMonthReview,
  closedChangedMonthReview,
  closedMonthReview,
} from "@/storybook/fixtures";
import { withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { MonthClosePrompt } from "./month-close-prompt";

const meta = {
  title: "Features/MonthClose/MonthClosePrompt",
  component: MonthClosePrompt,
  parameters: { layout: "padded", route: "/dashboard" },
  beforeEach: () => {
    savePreferences({ monthClosePromptHidden: undefined });
  },
} satisfies Meta<typeof MonthClosePrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithOpenItems: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "August 2026 has ended" }),
    ).toBeVisible();
    await expect(canvas.getByText(/things need attention before you close/)).toBeVisible();
    await expect(canvas.getByText("August 2026 net")).toBeVisible();
    await expect(canvas.getByText("Income kept in August 2026")).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Categorize" })).toBeVisible();
    await expect(canvas.queryByText("Every transaction has a category")).toBeNull();
    await expect(canvas.getByRole("link", { name: "Review month" })).toHaveAttribute(
      "href",
      expect.stringContaining("/reports/month?month=2026-08"),
    );
    await expect(canvas.getByRole("link", { name: "Review month" })).toHaveClass("bg-primary");
    await expect(canvas.getByRole("button", { name: "Close August 2026" })).not.toHaveClass(
      "bg-primary",
    );
  },
};

export const ClosingWithOpenItemsAsksFirst: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Close August 2026" }));
    const dialog = await openedDialog("alertdialog");
    await expect(within(dialog).getByText(/still need attention/)).toHaveTextContent(
      /show as changed after closing/,
    );
  },
};

export const EverythingInOrder: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(clearOpenMonthReview)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "August 2026 is ready to close" }),
    ).toBeVisible();
    await expect(canvas.getByText(/Everything is in order/)).toBeVisible();
    await expect(canvas.queryByRole("list")).toBeNull();
    await expect(canvas.getByRole("button", { name: "Close August 2026" })).toHaveClass(
      "bg-primary",
    );
    await expect(canvas.getByRole("link", { name: "Review month" })).not.toHaveClass("bg-primary");
  },
};

export const ChangedAfterClosing: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(closedChangedMonthReview)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "August 2026 changed after closing" }),
    ).toBeVisible();
    await expect(canvas.queryByRole("button", { name: /^Close / })).toBeNull();
  },
};

export const ClosedShowsNothing: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(closedMonthReview)),
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("heading")).toBeNull();
  },
};

export const HiddenUntilNextMonth: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Not now" }));
    await waitFor(() =>
      expect(canvas.queryByRole("heading", { name: "August 2026 has ended" })).toBeNull(),
    );
  },
};
