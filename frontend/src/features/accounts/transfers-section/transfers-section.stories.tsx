import type { Meta, StoryObj } from "@storybook/react-vite";
import { delay, http, HttpResponse } from "msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { accounts, ids, transfers } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { TransfersSection } from "./transfers-section";

const manyTransfers = Array.from({ length: 34 }, (_, index) => ({
  ...transfers[index % transfers.length],
  id: `99999999-0000-4000-8000-${String(index).padStart(12, "0")}`,
  fromAccountId: ids.accounts.checking,
  toAccountId: ids.accounts.savings,
  amount: `${(index + 1) * 25}.00`,
}));

function manyTransfersPage({ request }: { request: Request }) {
  const params = new URL(request.url).searchParams;
  const page = Number(params.get("page") ?? "1");
  const pageSize = Number(params.get("pageSize") ?? "10");
  return HttpResponse.json({
    items: manyTransfers.slice((page - 1) * pageSize, page * pageSize),
    total: manyTransfers.length,
    page,
    pageSize,
  });
}

async function neverResolve() {
  await delay("infinite");
  return new HttpResponse(null, { status: 204 });
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
  parameters: { msw: { handlers: [http.get("*/api/transfers", manyTransfersPage), ...handlers] } },
};

export const UnknownAccounts: Story = { args: { accounts: [] } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const CreatePending: Story = {
  parameters: { msw: { handlers: [http.post("*/api/transfers", neverResolve), ...handlers] } },
};
