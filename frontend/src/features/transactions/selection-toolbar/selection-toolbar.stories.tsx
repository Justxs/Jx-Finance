import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories, savingsAccount, tags, transactions } from "@/storybook/fixtures";
import { chooseOption } from "@/storybook/interactions";
import { SelectionToolbar } from "./selection-toolbar";

const expenses = transactions.filter((item) => item.type === "expense" && !item.isSplit);
const incomes = transactions.filter((item) => item.type === "income" && !item.isSplit);

const meta = {
  title: "Features/Transactions/SelectionToolbar",
  component: SelectionToolbar,
  args: {
    selected: expenses.slice(0, 3),
    categories,
    tags,
    accounts,
    pending: false,
    tagPending: false,
    movePending: false,
    deletePending: false,
    onApply: fn(),
    onApplyTags: fn(),
    onMove: fn(),
    onGroup: fn(),
    onDelete: fn(),
    onClear: fn(),
  },
  decorators: [withWidth("w-[min(56rem,92vw)]")],
} satisfies Meta<typeof SelectionToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneType: Story = {};

export const IncomeOnly: Story = { args: { selected: incomes.slice(0, 1) } };

export const MixedTypes: Story = {
  args: { selected: [...expenses.slice(0, 2), ...incomes.slice(0, 1)] },
};

export const Pending: Story = { args: { pending: true } };

export const MovePending: Story = { args: { movePending: true } };

export const DeletePending: Story = { args: { deletePending: true } };

export const Narrow: Story = {
  args: { selected: [...expenses.slice(0, 2), ...incomes.slice(0, 1)] },
  decorators: [withWidth("card")],
};

export const MovingToAnotherAccount: Story = {
  args: { selected: [...expenses.slice(0, 2), ...incomes.slice(0, 1)] },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Move to account" }));
    const popover = within(await screen.findByRole("dialog", { name: "Move to account" }));
    const move = popover.getByRole("button", { name: "Move" });
    await expect(move).toBeDisabled();

    await chooseOption(
      popover.getByRole("combobox", { name: "Account to move to" }),
      savingsAccount.name,
    );
    await userEvent.click(move);

    await waitFor(() => expect(args.onMove).toHaveBeenCalledWith(savingsAccount.id));
  },
};

export const DeletingTheSelection: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Delete" }));

    await expect(args.onDelete).toHaveBeenCalledOnce();
  },
};
