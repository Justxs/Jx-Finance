import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getAccountsMockHandler } from "@/api/generated/accounts/accounts.msw";
import {
  getDeleteRecurringBillMockHandler,
  getRecurringBillsMockHandler,
  getSubscriptionCandidatesMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import { toIso } from "@/lib/calendar";
import { withPageFrame } from "@/storybook/decorators";
import {
  dueSoonBill,
  inactiveBill,
  recurringBills,
  many,
  subscriptionCandidates,
  transferBill,
  variableBill,
} from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { type Canvas, openedDialog } from "@/storybook/interactions";
import { RecurringBillsPage } from "./recurring-bills-page";

const manyBills = many(recurringBills, 18);

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return toIso(date);
}

const meta = {
  title: "Features/RecurringBills/RecurringBillsPage",
  component: RecurringBillsPage,
  parameters: { layout: "fullscreen", route: "/recurring-bills" },
  decorators: [withPageFrame],
} satisfies Meta<typeof RecurringBillsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const ForecastTotals: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Scheduled in the next 90 days: €2,158.59 out, €6,540.00 in"),
    ).toBeVisible();
    await expect(canvas.getByRole("heading", { name: "Next 90 days" })).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const OnlyInactive: Story = {
  parameters: withHandlers(getRecurringBillsMockHandler([inactiveBill])),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByText("Inactive (1)"));
    await expect(canvas.getByText(inactiveBill.name)).toBeVisible();
    await expect(canvas.queryByRole("heading", { name: "Overdue" })).toBeNull();
  },
};

export const GroupedByUrgency: Story = {
  parameters: withHandlers(
    getRecurringBillsMockHandler([
      { ...variableBill, nextDueDate: daysFromNow(-3) },
      { ...dueSoonBill, nextDueDate: daysFromNow(2) },
      { ...transferBill, nextDueDate: daysFromNow(30) },
      inactiveBill,
    ]),
  ),
  play: async ({ canvas }) => {
    const overdue = await canvas.findByRole("list", { name: "Overdue" });
    await expect(within(overdue).getByText(variableBill.name)).toBeVisible();
    await expect(within(overdue).getByText("(3 days ago)")).toBeVisible();

    const thisWeek = canvas.getByRole("list", { name: "Due this week" });
    await expect(within(thisWeek).getByText(dueSoonBill.name)).toBeVisible();
    await expect(within(thisWeek).getByText("(in 2 days)")).toBeVisible();

    const later = canvas.getByRole("list", { name: "Later" });
    await expect(within(later).getByText(transferBill.name)).toBeVisible();
    await expect(canvas.getByText("Inactive (1)")).toBeVisible();
  },
};

export const NothingToSuggest: Story = {
  parameters: withHandlers(getSubscriptionCandidatesMockHandler([])),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/nothing repeats often enough|kol kas nėra pakankamai/i),
    ).toBeInTheDocument();
  },
};

export const SuggestionCreatesAnEntry: Story = {
  parameters: withHandlers(getSubscriptionCandidatesMockHandler(subscriptionCandidates)),
  play: async ({ canvas }) => {
    const create = await canvas.findAllByRole("button", {
      name: /create entry|sukurti įrašą/i,
    });
    await userEvent.click(create[0]!);
    const dialog = await openedDialog();
    await expect(within(dialog).getByLabelText(/^(name|pavadinimas)$/i)).toHaveValue(
      "Lemon gym abonementas",
    );
  },
};

export const LongList: Story = {
  parameters: withHandlers(getRecurringBillsMockHandler(manyBills)),
};

export const AddDialogOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /add recurring entry|pridėti periodinį/i }),
    );
    await openedDialog();
  },
};

export const AddDialogWithoutAccounts: Story = {
  parameters: withHandlers(getAccountsMockHandler([])),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /add recurring entry|pridėti periodinį/i }),
    );
    await openedDialog();
  },
};

async function openFromRow(canvas: Canvas, billName: string, label: RegExp) {
  const row = (await canvas.findAllByText(billName))
    .map((element) => element.closest("li"))
    .find((item) => item && within(item).queryByRole("button", { name: label }));
  if (!row) {
    throw new Error("expected the bill row");
  }
  await userEvent.click(within(row).getByRole("button", { name: label }));
  return openedDialog();
}

export const EditDialogOpen: Story = {
  play: async ({ canvas }) => {
    const dialog = await openFromRow(canvas, dueSoonBill.name, /^(edit|redaguoti):/i);
    await expect(within(dialog).getByLabelText(/^(name|pavadinimas)$/i)).toHaveValue(
      dueSoonBill.name,
    );
  },
};

export const ConfirmDialogOpenTransfer: Story = {
  play: async ({ canvas }) => {
    await openFromRow(canvas, transferBill.name, /^(record transfer|registruoti pervedimą)$/i);
  },
};

export const ConfirmDialogOpenVariable: Story = {
  play: async ({ canvas }) => {
    await openFromRow(canvas, variableBill.name, /^(record payment|registruoti mokėjimą)$/i);
  },
};

export const DeletePending: Story = {
  parameters: withHandlers(getDeleteRecurringBillMockHandler(pending)),
  play: async ({ canvas }) => {
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
