import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent } from "storybook/test";
import { saveTransactionTemplate } from "@/stores/transaction-views";
import { withWidth } from "@/storybook/decorators";
import { ids } from "@/storybook/fixtures";
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

export const Empty: Story = { args: { defaultOpen: true } };

export const WithTemplates: Story = {
  args: { defaultOpen: true },
  beforeEach: () => {
    saveTransactionTemplate("Weekly shop", weeklyShop);
    saveTransactionTemplate("Rent", { ...weeklyShop, amount: "560.00", description: "Rent" });
  },
};

export const StartingFromATemplate: Story = {
  args: { defaultOpen: true },
  beforeEach: () => {
    saveTransactionTemplate("Weekly shop", weeklyShop);
  },
  play: async ({ args }) => {
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
