import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { CategoryBreakdownItem } from "@/api/generated/model";
import { Card } from "@/components/ui/card/card";
import { categoryBreakdownItems } from "@/storybook/fixtures";
import { CategoryBreakdown } from "./category-breakdown";

const manyItems: CategoryBreakdownItem[] = Array.from({ length: 9 }, (_, index) => ({
  categoryId: `category-${index}`,
  categoryName: `Category ${index + 1}`,
  categoryIcon: null,
  amount: String(900 - index * 95),
}));

const longItems: CategoryBreakdownItem[] = [
  {
    categoryId: "long",
    categoryName:
      "Household maintenance, repairs and other unexpectedly expensive seasonal projects",
    categoryIcon: null,
    amount: "1234567.89",
  },
  { categoryId: "short", categoryName: "Food", categoryIcon: null, amount: "42.10" },
];

const withInvestmentGroup: CategoryBreakdownItem[] = [
  ...categoryBreakdownItems.slice(0, 2),
  {
    categoryId: null,
    categoryName: "Server name that is never shown",
    categoryIcon: "banknote",
    amount: "57.20",
    syntheticGroup: "investmentTaxesAndFees",
  },
];

const meta = {
  title: "Components/CategoryBreakdown",
  component: CategoryBreakdown,
  args: { items: categoryBreakdownItems },
  decorators: [
    (Story) => (
      <Card className="w-[min(90vw,28rem)] p-6">
        <Story />
      </Card>
    ),
  ],
} satisfies Meta<typeof CategoryBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { args: { items: [] } };

export const SingleCategory: Story = { args: { items: categoryBreakdownItems.slice(0, 1) } };

export const GroupedIntoOther: Story = { args: { items: manyItems } };

export const LongNamesAndLargeAmounts: Story = { args: { items: longItems } };

export const SyntheticInvestmentGroup: Story = {
  args: { items: withInvestmentGroup },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByText(/^(investment taxes and fees|investicijų mokesčiai ir rinkliavos)$/i),
    ).toBeVisible();
    await expect(canvas.queryByText("Server name that is never shown")).toBeNull();
    await expect(
      canvas.queryByRole("link", { name: /investment taxes|investicijų mokesčiai/i }),
    ).toBeNull();
    await expect(canvas.getAllByRole("link")).toHaveLength(2);
  },
};

export const IncomeLinksFilterByIncome: Story = {
  args: {
    type: "income",
    items: [
      {
        categoryId: "salary",
        categoryName: "Salary",
        categoryIcon: "briefcase",
        amount: "2400.00",
      },
      {
        categoryId: null,
        categoryName: "Investment income",
        categoryIcon: "coins",
        amount: "38.16",
        syntheticGroup: "investmentIncome",
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("link", { name: "Salary" })).toHaveAttribute(
      "href",
      expect.stringContaining("type=income"),
    );
    await expect(canvas.getByText(/^(investment income|investicijų pajamos)$/i)).toBeVisible();
  },
};

export const EmptyIncome: Story = { args: { type: "income", items: [] } };

export const ComparedWithAnEarlierPeriod: Story = {
  args: {
    items: [
      { ...categoryBreakdownItems[0]!, comparisonAmount: "410.00" },
      { ...categoryBreakdownItems[1]!, comparisonAmount: "0.00" },
      {
        categoryId: "category-gone",
        categoryName: "Health",
        categoryIcon: "heart-pulse",
        amount: "0.00",
        comparisonAmount: "184.40",
      },
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "Health" })).toBeVisible();
    await expect(canvas.getAllByText(/up from nothing|anksčiau nebuvo nieko/i)).toHaveLength(1);
    await expect(canvas.getAllByText(/the earlier period|ankstesni/i)).toHaveLength(3);
  },
};
