import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getAccountsMockHandler } from "@/api/generated/accounts/accounts.msw";
import {
  getDeleteRecurringBillMockHandler,
  getRecurringBillsMockHandler,
  getSubscriptionCandidatesMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
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
import { openedDialog } from "@/storybook/interactions";
import { RecurringBillsPage } from "./recurring-bills-page";

const manyBills = many(recurringBills, 18);

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

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const OnlyInactive: Story = {
  parameters: withHandlers(getRecurringBillsMockHandler([inactiveBill])),
};

export const NothingToSuggest: Story = {
  parameters: withHandlers(getSubscriptionCandidatesMockHandler([])),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/nothing repeats often enough|kol kas nėra pakankamai/i),
    ).toBeInTheDocument();
  },
};

export const SuggestionCreatesAnEntry: Story = {
  parameters: withHandlers(getSubscriptionCandidatesMockHandler(subscriptionCandidates)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /add recurring entry|pridėti periodinį/i }),
    );
    await openedDialog();
  },
};

export const AddDialogWithoutAccounts: Story = {
  parameters: withHandlers(getAccountsMockHandler([])),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /add recurring entry|pridėti periodinį/i }),
    );
    await openedDialog();
  },
};

async function openFromRow(canvasElement: HTMLElement, billName: string, label: RegExp) {
  const canvas = within(canvasElement);
  const heading = await canvas.findByText(billName);
  const row = heading.closest("li");
  if (!row) {
    throw new Error("expected the bill row");
  }
  await userEvent.click(within(row).getByRole("button", { name: label }));
  return openedDialog();
}

export const EditDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openFromRow(canvasElement, dueSoonBill.name, /^(edit|redaguoti):/i);
    await expect(within(dialog).getByLabelText(/^(name|pavadinimas)$/i)).toHaveValue(
      dueSoonBill.name,
    );
  },
};

export const ConfirmDialogOpenTransfer: Story = {
  play: async ({ canvasElement }) => {
    await openFromRow(
      canvasElement,
      transferBill.name,
      /^(record transfer|registruoti pervedimą)$/i,
    );
  },
};

export const ConfirmDialogOpenVariable: Story = {
  play: async ({ canvasElement }) => {
    await openFromRow(canvasElement, variableBill.name, /^(record payment|registruoti mokėjimą)$/i);
  },
};

export const DeletePending: Story = {
  parameters: withHandlers(getDeleteRecurringBillMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
