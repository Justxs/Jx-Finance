import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import type { TransactionResponse } from "@/api/generated/model";
import { outdatedSharedPurchase, sharedPurchase } from "@/storybook/fixtures";
import { openedDialog } from "@/storybook/interactions";
import { SharedExpenseMark, useSharedExpenseSplits } from "./shared-expense";

function MarkHarness({ transaction }: Readonly<{ transaction: TransactionResponse }>) {
  const splits = useSharedExpenseSplits();
  return (
    <>
      <SharedExpenseMark transaction={transaction} onUpdate={splits.open} />
      {splits.dialog}
    </>
  );
}

const meta = {
  title: "Features/Transactions/SharedExpenseMark",
  component: MarkHarness,
  parameters: { layout: "padded", route: "/transactions" },
  args: { transaction: sharedPurchase },
} satisfies Meta<typeof MarkHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Split: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("Split with Kazlauskų šeima, your share €45.00"),
    ).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: "Update split" })).toBeNull();
  },
};

export const AmountChanged: Story = {
  args: { transaction: outdatedSharedPurchase },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText("The amount changed since it was split."),
    ).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Update split" }));
    await expect(await openedDialog()).toHaveTextContent("Edit split");
  },
};

export const NotSplit: Story = {
  args: { transaction: { ...sharedPurchase, sharedExpense: null } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Split with/u)).toBeNull();
  },
};
