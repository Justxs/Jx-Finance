import type { Meta, StoryObj } from "@storybook/react-vite";
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
