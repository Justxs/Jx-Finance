import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getBulkCategorizeTransactionsMockHandler,
  getUncategorizedSuggestionsMockHandler,
} from "@/api/generated/transactions/transactions.msw";
import {
  categories,
  ids,
  serverErrorProblem,
  uncategorizedSuggestions,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { readBody } from "@/storybook/handlers/http";
import { openedDialog } from "@/storybook/interactions";
import { UncategorizedSuggestionsDialog } from "./uncategorized-suggestions-dialog";

const applied = fn();

const meta = {
  title: "Features/Transactions/UncategorizedSuggestionsDialog",
  component: UncategorizedSuggestionsDialog,
  args: {
    filter: { uncategorized: true },
    categories,
    open: true,
    onOpenChange: fn(),
  },
} satisfies Meta<typeof UncategorizedSuggestionsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(await dialog.findByText(/, 2 transactions$/)).toBeVisible();
    await expect(dialog.getByText('by rule "Bolt Food"')).toBeVisible();
    await expect(dialog.getByText("93% sure")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Apply to 0 transactions" })).toBeDisabled();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getUncategorizedSuggestionsMockHandler([])),
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(
      await dialog.findByText("Nothing to suggest for these transactions."),
    ).toBeVisible();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getUncategorizedSuggestionsMockHandler(pending)),
};

export const LoadFails: Story = {
  parameters: withHandlers(getUncategorizedSuggestionsMockHandler(failWith(serverErrorProblem))),
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(await dialog.findByRole("alert")).toBeInTheDocument();
  },
};

export const ApplyOneGroup: Story = {
  parameters: withHandlers(
    getBulkCategorizeTransactionsMockHandler(async ({ request }) => {
      const body = await readBody(request);
      applied(body);
      return { updated: Array.isArray(body.transactionIds) ? body.transactionIds.length : 0 };
    }),
  ),
  play: async ({ args }) => {
    const dialog = within(await openedDialog());
    const [learnedGroup] = await dialog.findAllByRole("checkbox");
    await userEvent.click(learnedGroup!);
    await userEvent.click(dialog.getByRole("button", { name: "Apply to 2 transactions" }));
    await waitFor(() =>
      expect(applied).toHaveBeenCalledWith({
        transactionIds: uncategorizedSuggestions.slice(0, 2).map((item) => item.transaction.id),
        categoryId: ids.categories.food,
        onlyUncategorized: true,
      }),
    );
    await expect(await screen.findByText("2 transactions categorized")).toBeInTheDocument();
    await waitFor(() => expect(args.onOpenChange).toHaveBeenCalledWith(false));
  },
};

export const ApplyFails: Story = {
  parameters: withHandlers(getBulkCategorizeTransactionsMockHandler(failWith(serverErrorProblem))),
  play: async () => {
    const dialog = within(await openedDialog());
    const [learnedGroup] = await dialog.findAllByRole("checkbox");
    await userEvent.click(learnedGroup!);
    await userEvent.click(dialog.getByRole("button", { name: "Apply to 2 transactions" }));
    await expect(await dialog.findByRole("alert")).toBeInTheDocument();
  },
};
