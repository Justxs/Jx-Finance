import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getAccountsMockHandler } from "@/api/generated/accounts/accounts.msw";
import {
  getDeleteRecurringBillMockHandler,
  getRecurringBillsMockHandler,
  getSubscriptionCandidatesMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import { withPageFrame } from "@/storybook/decorators";
import { inactiveBill, recurringBills, many, subscriptionCandidates } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
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
  parameters: {
    msw: {
      handlers: [getRecurringBillsMockHandler([inactiveBill]), ...handlers],
    },
  },
};

export const NothingToSuggest: Story = {
  parameters: {
    msw: {
      handlers: [getSubscriptionCandidatesMockHandler([]), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByText(/nothing repeats often enough|kol kas nėra pakankamai/i),
    ).toBeInTheDocument();
  },
};

export const SuggestionCreatesAnEntry: Story = {
  parameters: {
    msw: {
      handlers: [getSubscriptionCandidatesMockHandler(subscriptionCandidates), ...handlers],
    },
  },
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
  parameters: {
    msw: {
      handlers: [getRecurringBillsMockHandler(manyBills), ...handlers],
    },
  },
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
  parameters: {
    msw: {
      handlers: [getAccountsMockHandler([]), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: /add recurring entry|pridėti periodinį/i }),
    );
    await openedDialog();
  },
};

export const DeletePending: Story = {
  parameters: {
    msw: {
      handlers: [getDeleteRecurringBillMockHandler(pending), ...handlers],
    },
  },
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
