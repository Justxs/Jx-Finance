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
  parameters: { layout: "padded", route: "/" },
  beforeEach: () => {
    savePreferences({ monthClosePromptHidden: undefined });
  },
} satisfies Meta<typeof MonthClosePrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithOpenItems: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "August 2026 is ready to close" }),
    ).toBeVisible();
    await expect(canvas.getByRole("link", { name: "Categorize" })).toBeVisible();
    await expect(canvas.queryByText("Every transaction has a category")).toBeNull();
    await expect(canvas.getByRole("link", { name: "Review month" })).toHaveAttribute(
      "href",
      expect.stringContaining("month=2026-08"),
    );
  },
};

export const ClosingWithOpenItemsAsksFirst: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Close August 2026" }));
    const dialog = await openedDialog("alertdialog");
    await expect(within(dialog).getByText(/still need attention/)).toBeVisible();
  },
};

export const EverythingInOrder: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(clearOpenMonthReview)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/Everything is in order/)).toBeVisible();
    await expect(canvas.queryByRole("list")).toBeNull();
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
      expect(canvas.queryByRole("heading", { name: "August 2026 is ready to close" })).toBeNull(),
    );
  },
};
