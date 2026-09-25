import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn } from "storybook/test";
import { Rows } from "@/components/ui/rows/rows";
import { nameById } from "@/lib/options";
import { withWidth } from "@/storybook/decorators";
import { accounts, categories, categorizationRules, tags } from "@/storybook/fixtures";
import { RuleRow } from "./rule-row";

const meta = {
  title: "Features/CategorizationRules/RuleRow",
  component: RuleRow,
  decorators: [withWidth("panel")],
  args: {
    rule: categorizationRules[2]!,
    total: categorizationRules.length,
    accountNames: nameById(accounts),
    categoryNames: nameById(categories),
    tagNames: nameById(tags),
    movePending: false,
    deletePending: false,
    deleteDisabled: false,
    onMove: fn(),
    onEdit: fn(),
    onDelete: fn(),
  },
  render: (args) => (
    <Rows>
      <RuleRow {...args} />
    </Rows>
  ),
} satisfies Meta<typeof RuleRow>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByText(/IGNITIS/)).toBeInTheDocument();
  },
};

export const First: Story = {
  args: { rule: categorizationRules[0]! },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /^(move up|pakelti):/i })).toBeDisabled();
    await expect(canvas.getByRole("button", { name: /^(move down|nuleisti):/i })).toBeEnabled();
  },
};

export const Last: Story = {
  args: { rule: categorizationRules[4]! },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("button", { name: /^(move down|nuleisti):/i })).toBeDisabled();
  },
};

export const WithAmountRange: Story = { args: { rule: categorizationRules[3]! } };

export const DeletePending: Story = { args: { deletePending: true, deleteDisabled: true } };

export const MovePending: Story = { args: { movePending: true } };
