import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tag } from "./tag";

const meta = {
  title: "UI/Tag",
  component: Tag,
  args: { children: "Shared" },
} satisfies Meta<typeof Tag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};

export const Accent: Story = { args: { tone: "accent", children: "Split" } };

export const Positive: Story = { args: { tone: "positive", children: "Reached" } };

export const Negative: Story = { args: { tone: "negative", children: "Inactive" } };

export const InARow: Story = {
  render: () => (
    <p className="flex w-80 items-center gap-2 text-sm font-medium">
      <span className="truncate">Bendra šeimos sąskaita kasdienėms išlaidoms</span>
      <Tag tone="accent">Kazlauskų šeima</Tag>
    </p>
  ),
};
