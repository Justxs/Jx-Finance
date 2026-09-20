import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
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
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { first, openedDialog } from "@/storybook/interactions";
import { TransfersSection } from "./transfers-section";

const manyTransfers = many(transfers, 34, "99999999").map((item, index) => ({
  ...item,
  fromAccountId: ids.accounts.checking,
  toAccountId: ids.accounts.savings,
  amount: `${(index + 1) * 25}.00`,
}));

function manyTransfersPage({ request }: { request: Request }) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "10");
  return {
    items: manyTransfers.slice((page - 1) * pageSize, page * pageSize),
    total: manyTransfers.length,
    page,
    pageSize,
  };
}

const meta = {
  title: "Features/Accounts/TransfersSection",
  component: TransfersSection,
  parameters: { layout: "fullscreen" },
  args: { accounts },
  render: (args) => (
    <div className="mx-auto max-w-5xl p-6">
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <TransfersSection {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof TransfersSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Paginated: Story = {
  parameters: { msw: { handlers: [getTransfersMockHandler(manyTransfersPage), ...handlers] } },
};

export const UnknownAccounts: Story = { args: { accounts: [] } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const CreatePending: Story = {
  parameters: { msw: { handlers: [getCreateTransferMockHandler(pending), ...handlers] } },
};

export const EditsTransfer: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const edit = first(await canvas.findAllByRole("button", { name: /^Edit: .*Taupomoji/u }));
    await userEvent.click(edit);

    const dialog = within(await openedDialog());
    await expect(dialog.getByLabelText("Description")).toHaveValue("Mėnesio taupymas");
    await fireEvent.change(dialog.getByLabelText("Description"), { target: { value: "Taupymas" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};
