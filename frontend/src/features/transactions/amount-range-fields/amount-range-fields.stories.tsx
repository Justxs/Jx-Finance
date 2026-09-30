import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { expect, userEvent } from "storybook/test";
import type { AmountRangeDraft } from "@/features/transactions/transaction-filter-fields";
import { AmountRangeFields } from "./amount-range-fields";

function AmountRangeHarness({ initial }: Readonly<{ initial: AmountRangeDraft }>) {
  const [value, setValue] = useState(initial);
  return <AmountRangeFields label="Amount" value={value} onChange={setValue} />;
}

const meta = {
  title: "Features/Transactions/AmountRangeFields",
  component: AmountRangeHarness,
  args: { initial: { min: "", max: "" } },
} satisfies Meta<typeof AmountRangeHarness>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = { args: { initial: { min: "45", max: "50" } } };

export const TypingACommaDecimal: Story = {
  play: async ({ canvas }) => {
    const from = canvas.getByRole("textbox", { name: "From" });
    await userEvent.type(from, "49,50");
    await expect(from).toHaveValue("49,50");
    await expect(from).not.toHaveAttribute("aria-invalid", "true");
    const to = canvas.getByRole("textbox", { name: "To" });
    await userEvent.type(to, "abc");
    await expect(to).toHaveAttribute("aria-invalid", "true");
  },
};
