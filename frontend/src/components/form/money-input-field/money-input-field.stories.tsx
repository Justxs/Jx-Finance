import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, within } from "storybook/test";
import { z } from "zod";
import { isPositiveMoney } from "@/lib/validation";
import { useAppForm } from "../app-form";

interface DemoProps {
  initial?: string;
  hint?: string;
}

function Demo({ initial = "", hint }: Readonly<DemoProps>) {
  const form = useAppForm({
    defaultValues: { amount: initial },
    validators: [
      {
        run: z.object({ amount: z.string().refine(isPositiveMoney, "Enter a positive amount.") }),
        triggers: ["change"],
      },
    ],
  });

  return (
    <div className="w-72">
      <form.Field name="amount">
        {(field) => <field.MoneyInputField id="demo-amount" label="Amount" hint={hint} />}
      </form.Field>
    </div>
  );
}

const meta = {
  title: "Components/Form/MoneyInputField",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = { args: { initial: "1084,20" } };

export const WithHint: Story = { args: { hint: "Leave empty when there was no fee." } };

export const Invalid: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    fireEvent.change(canvas.getByLabelText("Amount"), { target: { value: "-5x" } });
    await expect(await canvas.findByText("Enter a positive amount.")).toHaveAttribute(
      "id",
      "demo-amount-error",
    );
  },
};
