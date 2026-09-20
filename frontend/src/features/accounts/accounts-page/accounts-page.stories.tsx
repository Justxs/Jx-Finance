import type { Meta, StoryObj } from "@storybook/react-vite";
import { getCreateAccountMockHandler } from "@/api/generated/accounts/accounts.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import {
  emptyHandlers,
  errorHandlers,
  handlers,
  loadingHandlers,
  pending,
} from "@/storybook/handlers";
import { AccountsPage } from "./accounts-page";

const meta = {
  title: "Features/Accounts/AccountsPage",
  component: AccountsPage,
  parameters: { layout: "fullscreen", route: "/accounts" },
  render: () => (
    <div className="p-6 lg:p-10">
      <QueryBoundary fallback={<Skeleton className="h-96 w-full" />}>
        <AccountsPage />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof AccountsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FilteredByType: Story = { parameters: { route: "/accounts?type=savings" } };

export const SortedByBalance: Story = {
  parameters: { route: "/accounts?sort=currentBalance&direction=desc" },
};

export const NoSearchMatches: Story = {
  parameters: { route: "/accounts?search=does-not-exist" },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const CreatePending: Story = {
  parameters: { msw: { handlers: [getCreateAccountMockHandler(pending), ...handlers] } },
};
