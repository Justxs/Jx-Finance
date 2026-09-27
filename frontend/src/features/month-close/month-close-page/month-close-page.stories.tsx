import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  getCloseMonthMockHandler,
  getMonthReviewMockHandler,
} from "@/api/generated/month-close/month-close.msw";
import { withPageFrame } from "@/storybook/decorators";
import { clearOpenMonthReview, closedMonthReview, serverErrorProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { MonthClosePage } from "./month-close-page";

const meta = {
  title: "Features/MonthClose/MonthClosePage",
  component: MonthClosePage,
  parameters: { layout: "fullscreen", route: "/close?month=2026-08" },
  decorators: [withPageFrame],
} satisfies Meta<typeof MonthClosePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/is open/);
    await expect(canvas.getByText("3 uncategorized transactions")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Close month" })).toBeEnabled();
    await expect(canvas.getByRole("button", { name: /Aug/ })).toHaveAttribute(
      "aria-current",
      "date",
    );
  },
};

export const ClosingWithOpenItemsAsksFirst: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Close month" }));
    const dialog = await openedDialog("alertdialog");
    await expect(within(dialog).getByText(/6 items still need attention/)).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Close anyway" }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};

export const ClosingAClearMonth: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(clearOpenMonthReview)),
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText("Note"), "Matched the statement");
    const close = canvas.getByRole("button", { name: "Close month" });
    await userEvent.click(close);
    await waitFor(() => expect(close).toBeEnabled());
  },
};

export const Closed: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(closedMonthReview)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/was closed on/);
    await expect(canvas.getByRole("button", { name: "Reopen" })).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Changed since the close" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Reopen" }));
    const dialog = await openedDialog("alertdialog");
    await expect(within(dialog).getByText(/The transactions stay as they are/)).toBeVisible();
  },
};

export const ClosedAndChanged: Story = {
  parameters: { route: "/close?month=2026-07" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Changed since the close" }),
    ).toBeVisible();
    await expect(canvas.getByText("Moved to another month")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Re-close" })).toBeEnabled();
  },
};

export const NotEnded: Story = {
  parameters: { route: "/close?month=2026-09" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/has not ended yet/);
    await expect(canvas.queryByRole("button", { name: "Close month" })).toBeNull();
  },
};

export const CloseFails: Story = {
  parameters: withHandlers(
    getMonthReviewMockHandler(clearOpenMonthReview),
    getCloseMonthMockHandler(failWith(serverErrorProblem)),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Close month" }));
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(pending)),
};
