import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  getDeleteDebtMockHandler,
  getGetDebtsMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { debts, cycle } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { DebtsSection } from "./debts-section";

function DebtsSectionStory() {
  return (
    <div className="w-[min(48rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <DebtsSection />
      </QueryBoundary>
    </div>
  );
}

const many = Array.from({ length: 15 }, (_, index) => ({
  ...cycle(debts, index),
  id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
}));

const meta = {
  title: "Features/NetWorth/DebtsSection",
  component: DebtsSection,
  parameters: { route: "/net-worth" },
  render: () => <DebtsSectionStory />,
} satisfies Meta<typeof DebtsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const LongList: Story = {
  parameters: {
    msw: {
      handlers: [getGetDebtsMockHandler(many), ...handlers],
    },
  },
};

export const AddDialogOpen: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: /add debt|pridėti skolą/i }));
    await expect(await within(document.body).findByRole("dialog")).toBeVisible();
  },
};

export const DeletePending: Story = {
  parameters: {
    msw: {
      handlers: [getDeleteDebtMockHandler(pending), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteButtons = await canvas.findAllByRole("button", { name: /^(delete|ištrinti)$/i });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await within(document.body).findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
