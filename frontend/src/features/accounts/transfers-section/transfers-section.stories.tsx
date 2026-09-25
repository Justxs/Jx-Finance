import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fireEvent, fn, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getCreateTransferMockHandler,
  getTransfersMockHandler,
} from "@/api/generated/transfers/transfers.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { accounts, ids, transfers, many } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { query } from "@/storybook/handlers/http";
import { first, openedDialog } from "@/storybook/interactions";
import { TransfersSection } from "./transfers-section";

const manyTransfers = many(transfers, 34, "99999999").map((item, index) => ({
  ...item,
  fromAccountId: ids.accounts.checking,
  toAccountId: ids.accounts.savings,
  amount: `${(index + 1) * 25}.00`,
}));

function manyTransfersPage({ request }: { request: Request }) {
  const params = query(request);
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "10");
  return {
    items: manyTransfers.slice((page - 1) * pageSize, page * pageSize),
    total: manyTransfers.length,
    page,
    pageSize,
  };
}

function StatefulTransfersSection(args: ComponentProps<typeof TransfersSection>) {
  const [addOpen, setAddOpen] = useState(args.addOpen);

  function handleAddOpenChange(open: boolean) {
    setAddOpen(open);
    args.onAddOpenChange(open);
  }

  return <TransfersSection {...args} addOpen={addOpen} onAddOpenChange={handleAddOpenChange} />;
}

const meta = {
  title: "Features/Accounts/TransfersSection",
  component: TransfersSection,
  parameters: { layout: "fullscreen" },
  args: { accounts, addOpen: false, onAddOpenChange: fn() },
  render: (args) => (
    <div className="mx-auto max-w-5xl p-6">
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <StatefulTransfersSection {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof TransfersSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Paginated: Story = {
  parameters: withHandlers(getTransfersMockHandler(manyTransfersPage)),
};

export const UnknownAccounts: Story = { args: { accounts: [] } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const CreatePending: Story = {
  parameters: withHandlers(getCreateTransferMockHandler(pending)),
};

export const EditsTransfer: Story = {
  play: async ({ canvas }) => {
    const edit = first(await canvas.findAllByRole("button", { name: /^Edit: .*Taupomoji/u }));
    await userEvent.click(edit);

    const dialog = within(await openedDialog());
    await expect(dialog.getByLabelText("Description")).toHaveValue("Mėnesio taupymas");
    await fireEvent.change(dialog.getByLabelText("Description"), { target: { value: "Taupymas" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};
