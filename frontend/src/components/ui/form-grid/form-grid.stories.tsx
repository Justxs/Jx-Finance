import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "../input/input";
import { Label } from "../label/label";
import { FormGrid } from "./form-grid";

const meta = {
  title: "UI/FormGrid",
  component: FormGrid,
} satisfies Meta<typeof FormGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

function Fields() {
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="form-grid-name">Name</Label>
        <Input id="form-grid-name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="form-grid-amount">Amount</Label>
        <Input id="form-grid-amount" inputMode="decimal" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="form-grid-note">Note</Label>
        <Input id="form-grid-note" />
      </div>
    </>
  );
}

export const Wide: Story = {
  render: () => (
    <FormGrid className="w-[min(90vw,44rem)]">
      <Fields />
    </FormGrid>
  ),
};

export const Narrow: Story = {
  render: () => (
    <FormGrid as="form" aria-label="Example" className="w-64">
      <Fields />
    </FormGrid>
  ),
};
