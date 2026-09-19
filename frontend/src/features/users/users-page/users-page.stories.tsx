import type { Meta, StoryObj } from "@storybook/react-vite";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import { getGetUsersMockHandler } from "@/api/generated/users/users.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { inactiveUser, longNameUser, memberUser } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, handlers, loadingHandlers } from "@/storybook/handlers";
import { UsersPage } from "./users-page";

const meta = {
  title: "Features/Users/UsersPage",
  component: UsersPage,
  parameters: { layout: "fullscreen", route: "/users" },
  render: () => (
    <div className="p-6">
      <QueryBoundary fallback={<Skeleton className="h-96 w-full" />}>
        <UsersPage />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof UsersPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FilteredByRole: Story = { parameters: { route: "/users?role=Admin" } };

export const InactiveOnly: Story = { parameters: { route: "/users?isActive=false" } };

export const SearchNoMatches: Story = { parameters: { route: "/users?search=nobody" } };

export const SortedByNameDescending: Story = {
  parameters: { route: "/users?sort=displayName&direction=desc" },
};

export const OnlyCurrentUser: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const NoUsers: Story = {
  parameters: {
    msw: { handlers: [getGetUsersMockHandler([]), ...handlers] },
  },
};

export const SignedInAsAnotherAdmin: Story = {
  parameters: {
    msw: {
      handlers: [getMeMockHandler({ ...memberUser, role: "Admin" }), ...handlers],
    },
  },
};

export const LongNamesAndInactive: Story = {
  parameters: {
    msw: {
      handlers: [getGetUsersMockHandler([longNameUser, inactiveUser]), ...handlers],
    },
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
