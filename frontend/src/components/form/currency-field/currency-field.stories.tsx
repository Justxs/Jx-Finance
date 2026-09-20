import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import type { Currency } from "@/api/generated/model";
import { useAppForm } from "../app-form";

interface DemoProps {
  hint?: string;
  all?: boolean;
}

function Demo({ hint, all }: Readonly<DemoProps>) {
  const defaultValues: { currency: Currency } = { currency: "eur" };
  const form = useAppForm({ defaultValues });

  return (
    <div className="w-72">
      <form.Field name="currency">
        {(field) => (
          <field.CurrencyField
            id="demo-currency"
            label="Currency"
            hint={hint}
            all={all}
            preferred={["eur"]}
          />
        )}
      </form.Field>
    </div>
  );
}

const meta = {
  title: "Components/Form/CurrencyField",
  component: Demo,
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AllCurrencies: Story = { args: { all: true } };

export const WithHint: Story = {
  args: { hint: "Cannot be changed later." },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("combobox", { name: "Currency" })).toHaveAttribute(
      "aria-describedby",
      "demo-currency-hint",
    );
  },
};
