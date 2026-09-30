import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent } from "storybook/test";
import { transactionTemplates } from "@/features/transactions/transaction-views";
import { withWidth } from "@/storybook/decorators";
import { ids } from "@/storybook/fixtures";
import type { Canvas } from "@/storybook/interactions";
import { TransactionTemplates } from "./transaction-templates";

const weeklyShop = {
  accountId: ids.accounts.shared,
  categoryId: ids.categories.food,
  type: "expense" as const,
  amount: "42.18",
  currency: "eur" as const,
  description: "Maxima",
  tagIds: [ids.tags.renovation],
  lines: null,
};

const meta = {
  title: "Features/Transactions/TransactionTemplates",
  component: TransactionTemplates,
  args: { onUse: fn() },
  decorators: [withWidth("field")],
} satisfies Meta<typeof TransactionTemplates>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openMenu(canvas: Canvas) {
  await userEvent.click(canvas.getByRole("button", { name: /^Templates/ }));
}

export const Closed: Story = {};

export const Empty: Story = {
  play: async ({ canvas }) => {
    await openMenu(canvas);
  },
};

export const WithTemplates: Story = {
  beforeEach: () => {
    transactionTemplates.save("Weekly shop", { values: weeklyShop });
    transactionTemplates.save("Rent", {
      values: { ...weeklyShop, amount: "560.00", description: "Rent" },
    });
  },
  play: async ({ canvas }) => {
    await openMenu(canvas);
  },
};

export const StartingFromATemplate: Story = {
  beforeEach: () => {
    transactionTemplates.save("Weekly shop", { values: weeklyShop });
  },
  play: async ({ args, canvas }) => {
    await openMenu(canvas);
    await userEvent.click(
      await screen.findByRole("button", { name: "New transaction from template: Weekly shop" }),
    );

    await expect(args.onUse).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: ids.accounts.shared,
        amount: "42.18",
        description: "Maxima",
        isSplit: false,
        tagIds: [ids.tags.renovation],
      }),
    );
  },
};
