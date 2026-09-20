import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within } from "storybook/test";
import { getInvestmentTransactionsMockHandler } from "@/api/generated/investments/investments.msw";
import { QueryBoundary } from "@/components/query-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { accounts, brokerAccount } from "@/storybook/fixtures";
import {
  errorHandlers,
  handlers,
  investmentsEmptyHandlers,
  loadingHandlers,
} from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { investmentTransactions, splitEntry } from "@/storybook/investment-fixtures";
import { ActivitySection } from "./activity-section";

const meta = {
  title: "Features/Investments/ActivitySection",
  component: ActivitySection,
  args: { accounts },
  render: (args) => (
    <div className="w-[min(48rem,calc(100vw-3rem))]">
      <QueryBoundary fallback={<Skeleton className="h-40 w-full" />}>
        <ActivitySection {...args} />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof ActivitySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleAccount: Story = { args: { accountId: brokerAccount.id } };

export const WithSplit: Story = {
  parameters: {
    msw: {
      handlers: [
        getInvestmentTransactionsMockHandler({
          items: [splitEntry, ...investmentTransactions.slice(0, 4)],
          page: 1,
          pageSize: 15,
          total: 5,
        }),
        ...handlers,
      ],
    },
  },
};

export const Empty: Story = { parameters: { msw: { handlers: investmentsEmptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const FilteredByType: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await chooseOption(await canvas.findByLabelText("Entry type"), "Sell");
    await waitFor(() => expect(canvas.queryByText("Interest")).not.toBeInTheDocument());
    await expect(canvas.getByText("+$1,405.70")).toBeInTheDocument();
  },
};
