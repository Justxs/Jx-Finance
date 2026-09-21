import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppAt } from "./decorators";
import { emptyHandlers, errorHandlers, loadingHandlers } from "./handlers";

const meta = {
  title: "Pages/App",
  component: AppAt,
  parameters: { layout: "fullscreen", providers: "none" },
} satisfies Meta<typeof AppAt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Dashboard: Story = { args: { path: "/" } };

export const Transactions: Story = { args: { path: "/transactions" } };

export const Accounts: Story = { args: { path: "/accounts" } };

export const Categories: Story = { args: { path: "/categories" } };

export const Tags: Story = { args: { path: "/tags" } };

export const CategorizationRules: Story = { args: { path: "/categorization-rules" } };

export const Budgets: Story = { args: { path: "/budgets" } };

export const Goals: Story = { args: { path: "/goals" } };

export const RecurringBills: Story = { args: { path: "/recurring-bills" } };

export const NetWorth: Story = { args: { path: "/net-worth" } };

export const Investments: Story = { args: { path: "/investments" } };

export const Reports: Story = { args: { path: "/reports" } };

export const Households: Story = { args: { path: "/households" } };

export const Users: Story = { args: { path: "/users" } };

export const Profile: Story = { args: { path: "/profile" } };

export const Login: Story = { args: { path: "/login", authenticated: false } };

export const Setup: Story = { args: { path: "/setup", authenticated: false, needsSetup: true } };

export const DashboardEmpty: Story = {
  args: { path: "/" },
  parameters: { msw: { handlers: emptyHandlers } },
};

export const DashboardLoading: Story = {
  args: { path: "/" },
  parameters: { msw: { handlers: loadingHandlers } },
};

export const DashboardError: Story = {
  args: { path: "/" },
  parameters: { msw: { handlers: errorHandlers } },
};

export const TransactionsEmpty: Story = {
  args: { path: "/transactions" },
  parameters: { msw: { handlers: emptyHandlers } },
};

export const TransactionsError: Story = {
  args: { path: "/transactions" },
  parameters: { msw: { handlers: errorHandlers } },
};
