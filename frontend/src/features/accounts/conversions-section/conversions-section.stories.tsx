import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { accounts, brokerAccount } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { ConversionsSection } from "./conversions-section";

const meta = {
  title: "Features/Accounts/ConversionsSection",
  component: ConversionsSection,
  parameters: { layout: "fullscreen" },
  args: { accounts, convertAccountId: null, onConvertAccountChange: fn() },
  render: (args) => (
    <div className="mx-auto max-w-4xl p-6">
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <ConversionsSection {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof ConversionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const FormOpen: Story = { args: { convertAccountId: brokerAccount.id } };

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const NoAccounts: Story = { args: { accounts: [] } };
