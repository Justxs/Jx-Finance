import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { RuledLine } from "./ruled-line";

const meta = {
  title: "UI/RuledLine",
  component: RuledLine,
} satisfies Meta<typeof RuledLine>;

export default meta;
type Story = StoryObj;

export const Hairline: Story = {
  render: () => (
    <RuledLine as="p" className="w-96">
      <span className="text-muted-foreground">Newest rates</span>{" "}
      <span className="font-semibold tabular-nums">2026-09-18</span>
    </RuledLine>
  ),
};

export const Ink: Story = {
  render: () => (
    <RuledLine as="dl" tone="ink" className="w-96 space-y-1">
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Your rate</dt>
        <dd className="font-semibold tabular-nums">1 EUR = 1.0842 USD</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted-foreground">Reference rate</dt>
        <dd className="tabular-nums">1 EUR = 1.0839 USD</dd>
      </div>
    </RuledLine>
  ),
  play: async ({ canvas }) => {
    const list = canvas.getByText("Your rate").closest("dl");
    await expect(list).toHaveClass("border-y", "border-rule");
  },
};
