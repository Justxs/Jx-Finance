import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { useAppForm } from "@/components/form";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { chooseOption } from "@/storybook/interactions";
import { spreadValues } from "./spread-choice";
import { SpreadFields } from "./spread-fields";

interface DemoProps {
  months: number | null;
}

function Demo({ months }: Readonly<DemoProps>) {
  const form = useAppForm({ defaultValues: spreadValues(months) });

  return (
    <FormGrid className="w-xl">
      <SpreadFields
        form={form}
        fields={{ spread: "spread", spreadCustom: "spreadCustom" }}
        idPrefix="demo"
      />
    </FormGrid>
  );
}

const meta = {
  title: "Features/Transactions/SpreadFields",
  component: Demo,
  args: { months: null },
} satisfies Meta<typeof Demo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
  play: async ({ canvas }) => {
    const spread = await canvas.findByRole("combobox", { name: "Spread over" });
    await expect(spread).toHaveTextContent("Off");
    await expect(canvas.queryByRole("spinbutton", { name: "Months" })).toBeNull();

    await chooseOption(spread, "Custom");

    await expect(await canvas.findByRole("spinbutton", { name: "Months" })).toHaveAttribute(
      "id",
      "demo-spread-custom",
    );
  },
};

export const TwelveMonths: Story = {
  args: { months: 12 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("combobox", { name: "Spread over" })).toHaveTextContent(
      "12 months",
    );
  },
};

export const CustomMonths: Story = {
  args: { months: 24 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("spinbutton", { name: "Months" })).toHaveValue(24);
  },
};
