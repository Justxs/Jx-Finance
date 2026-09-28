import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  getCloseMonthMockHandler,
  getMonthReviewMockHandler,
} from "@/api/generated/month-close/month-close.msw";
import { withWidth } from "@/storybook/decorators";
import { clearOpenMonthReview, closedMonthReview, serverErrorProblem } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { MonthCloseReview } from "./month-close-review";

const meta = {
  title: "Features/MonthClose/MonthCloseReview",
  component: MonthCloseReview,
  args: { month: "2026-08" },
  decorators: [withWidth("full")],
} satisfies Meta<typeof MonthCloseReview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(
      /need attention before you close/,
    );
    await expect(
      canvas.getByRole("heading", { name: "August 2026 is ready to close" }),
    ).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Details" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await expect(canvas.getByText("3 uncategorized transactions")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Close August 2026" })).toBeEnabled();
  },
};

export const ClosingWithOpenItemsWarnsInTheDialog: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Close August 2026" }));
    const dialog = await openedDialog();
    await expect(within(dialog).getByText(/6 items still need attention/)).toBeVisible();
    await userEvent.type(within(dialog).getByLabelText("Note"), "Fix the rest later");
    await userEvent.click(within(dialog).getByRole("button", { name: "Close August 2026" }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};

export const ClosingAClearMonth: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(clearOpenMonthReview)),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Close August 2026" }));
    const dialog = await openedDialog();
    await expect(within(dialog).queryByText(/still need attention/)).toBeNull();
    await userEvent.type(within(dialog).getByLabelText("Note"), "Matched the statement");
    await userEvent.click(within(dialog).getByRole("button", { name: "Close August 2026" }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};

export const Closed: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(closedMonthReview)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/Closed on/);
    await expect(canvas.getByText("Matched the Swedbank statement.")).toBeVisible();
    const details = canvas.getByRole("button", { name: "Details" });
    await expect(details).toHaveAttribute("aria-expanded", "false");
    await expect(canvas.queryByText(/uncategorized|Every transaction has a category/)).toBeNull();
    await userEvent.click(details);
    await expect(details).toHaveAttribute("aria-expanded", "true");
    await expect(canvas.queryByRole("heading", { name: "Changed since the close" })).toBeNull();
    await userEvent.click(canvas.getByRole("button", { name: "Reopen" }));
    const dialog = await openedDialog("alertdialog");
    await expect(within(dialog).getByText(/The transactions stay as they are/)).toBeVisible();
  },
};

export const EditingTheNote: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(closedMonthReview)),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Edit note" }));
    const dialog = await openedDialog();
    const note = within(dialog).getByLabelText("Note");
    await expect(note).toHaveValue("Matched the Swedbank statement.");
    await userEvent.clear(note);
    await userEvent.type(note, "Matched both statements");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};

export const ClosedAndChanged: Story = {
  args: { month: "2026-07" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Changed since the close" }),
    ).toBeVisible();
    await expect(canvas.getByText("Moved to another month")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Re-close" })).toBeEnabled();
  },
};

export const NotEnded: Story = {
  args: { month: "2026-09" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("status")).toHaveTextContent(/once it has ended/);
    await expect(canvas.queryByRole("button", { name: /^Close / })).toBeNull();
  },
};

export const CloseFails: Story = {
  parameters: withHandlers(
    getMonthReviewMockHandler(clearOpenMonthReview),
    getCloseMonthMockHandler(failWith(serverErrorProblem)),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Close August 2026" }));
    const dialog = await openedDialog();
    await userEvent.click(within(dialog).getByRole("button", { name: "Close August 2026" }));
    await expect(await within(dialog).findByRole("alert")).toBeInTheDocument();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getMonthReviewMockHandler(pending)),
};
