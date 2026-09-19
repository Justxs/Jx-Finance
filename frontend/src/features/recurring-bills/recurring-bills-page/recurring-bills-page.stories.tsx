import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getAccountsMockHandler } from "@/api/generated/accounts/accounts.msw";
import {
  getDeleteRecurringBillMockHandler,
  getRecurringBillsMockHandler,
} from "@/api/generated/recurring-bills/recurring-bills.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { RoutePending } from "@/components/route-pending";
import { inactiveBill, recurringBills, cycle } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { RecurringBillsPage } from "./recurring-bills-page";

function RecurringBillsPageStory() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <QueryBoundary fallback={<RoutePending />}>
        <RecurringBillsPage />
      </QueryBoundary>
    </div>
  );
}

const manyBills = Array.from({ length: 18 }, (_, index) => ({
  ...cycle(recurringBills, index),
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
}));

const meta = {
  title: "Features/RecurringBills/RecurringBillsPage",
  component: RecurringBillsPage,
  parameters: { layout: "fullscreen", route: "/recurring-bills" },
  render: () => <RecurringBillsPageStory />,
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
      await canvas.findByRole("button", { name: /add recurring bill|pridėti periodinę/i }),
    );
    await expect(await within(document.body).findByRole("dialog")).toBeVisible();
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
      await canvas.findByRole("button", { name: /add recurring bill|pridėti periodinę/i }),
    );
    await expect(await within(document.body).findByRole("dialog")).toBeVisible();
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
