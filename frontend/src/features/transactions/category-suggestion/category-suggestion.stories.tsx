import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  categories,
  categorySuggestionByRule,
  categorySuggestionLearned,
  ids,
  noCategorySuggestion,
} from "@/storybook/fixtures";
import { CategorySuggestion } from "./category-suggestion";

const meta = {
  title: "Features/Transactions/CategorySuggestion",
  component: CategorySuggestion,
  args: { suggestion: categorySuggestionLearned, categories, onApply: fn() },
  decorators: [withWidth("field")],
} satisfies Meta<typeof CategorySuggestion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Learned: Story = {
  play: async ({ canvas, args }) => {
    await expect(canvas.getByText("93% sure")).toBeVisible();
    await userEvent.click(canvas.getByRole("button", { name: /^Suggested: / }));
    await expect(args.onApply).toHaveBeenCalledWith(ids.categories.food);
  },
};

export const ByRule: Story = {
  args: { suggestion: categorySuggestionByRule },
  play: async ({ canvas }) => {
    await expect(canvas.getByText('by rule "Maxima"')).toBeVisible();
  },
};

export const None: Story = {
  args: { suggestion: noCategorySuggestion },
  play: async ({ canvas }) => {
    await expect(canvas.queryByRole("button")).toBeNull();
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
