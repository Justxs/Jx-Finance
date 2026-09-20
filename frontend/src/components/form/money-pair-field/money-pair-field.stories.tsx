import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, within } from "storybook/test";
import type { Currency } from "@/api/generated/model";
import { useAppForm } from "../app-form";
import { MoneyPairField } from "./money-pair-field";

interface DemoProps {
  hint?: string;
  disabled?: boolean;
}

interface Values {
  sent: string;
  sentCurrency: Currency;
}

function Demo({ hint, disabled }: Readonly<DemoProps>) {
  const defaultValues: Values = { sent: "", sentCurrency: "eur" };
  const form = useAppForm({ defaultValues });

  return (
    <div className="w-72">
      <MoneyPairField
        form={form}
        fields={{ amount: "sent", currency: "sentCurrency" }}
        id="demo-pair"
        label="Amount sent"
        currencyLabel="Currency sent"
        hint={hint}
        disabled={disabled}
      />
    </div>
  );
}

const meta = {
  title: "Components/Form/MoneyPairField",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await fireEvent.change(canvas.getByLabelText("Amount sent"), { target: { value: "12.50" } });
    await expect(canvas.getByLabelText("Amount sent")).toHaveValue("12.50");
  },
};

export const WithHint: Story = { args: { hint: "Charged on top of the amount." } };

export const Disabled: Story = { args: { disabled: true } };
