import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import type { SpreadDirection } from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { chooseOption } from "@/storybook/interactions";
import { spreadValues } from "./spread-choice";
import { SpreadFields } from "./spread-fields";

interface DemoProps {
  months: number | null;
  direction?: SpreadDirection;
}

function Demo({ months, direction }: Readonly<DemoProps>) {
  const form = useAppForm({ defaultValues: spreadValues(months, direction) });

  return (
    <FormGrid className="w-xl">
      <SpreadFields
        form={form}
        fields={{
          spread: "spread",
          spreadCustom: "spreadCustom",
          spreadDirection: "spreadDirection",
        }}
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
    await expect(canvas.queryByRole("combobox", { name: "Months counted" })).toBeNull();

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
    await expect(canvas.getByRole("combobox", { name: "Months counted" })).toHaveTextContent(
      "From the date's month on",
    );
  },
};

export const PaidInArrears: Story = {
  args: { months: 12, direction: "backward" },
  play: async ({ canvas }) => {
    const direction = await canvas.findByRole("combobox", { name: "Months counted" });
    await expect(direction).toHaveTextContent("Up to the date's month");

    await chooseOption(direction, "From the date's month on");

    await expect(direction).toHaveTextContent("From the date's month on");
  },
};

export const CustomMonths: Story = {
  args: { months: 24 },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("spinbutton", { name: "Months" })).toHaveValue(24);
  },
};
