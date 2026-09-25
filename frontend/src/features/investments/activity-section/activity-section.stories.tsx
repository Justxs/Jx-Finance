import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import { getInvestmentTransactionsMockHandler } from "@/api/generated/investments/investments.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { accounts, brokerAccount, investmentTransactions, splitEntry } from "@/storybook/fixtures";
import {
  errorHandlers,
  investmentsEmptyHandlers,
  loadingHandlers,
  withHandlers,
} from "@/storybook/handlers";
import { chooseOption, openedDialog } from "@/storybook/interactions";
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
  parameters: withHandlers(
    getInvestmentTransactionsMockHandler({
      items: [splitEntry, ...investmentTransactions.slice(0, 4)],
      page: 1,
      pageSize: 15,
      total: 5,
    }),
  ),
};

export const Empty: Story = { parameters: { msw: { handlers: investmentsEmptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const FilteredByType: Story = {
  play: async ({ canvas }) => {
    await chooseOption(await canvas.findByLabelText("Entry type"), "Sell");
    await waitFor(() => expect(canvas.queryByText("Interest")).not.toBeInTheDocument());
    await expect(canvas.getByText("+$1,405.70")).toBeInTheDocument();
  },
};

export const DeleteOffersUndo: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Delete: Sell · MSFT, / }));
    const dialog = await openedDialog("alertdialog");
    await expect(within(dialog).getByText(/You can undo this straight away/)).toBeVisible();
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete" }));

    await userEvent.click(await screen.findByRole("button", { name: "Undo" }));

    await expect(await screen.findByText("Brought back")).toBeInTheDocument();
  },
};
