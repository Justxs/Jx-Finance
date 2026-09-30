import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Input } from "@/components/ui/input/input";
import { Label } from "@/components/ui/label/label";
import { FormSection } from "./form-section";

const meta = {
  title: "Components/Form/FormSection",
  component: FormSection,
  args: {
    title: "Conditions",
    children: (
      <div className="space-y-1.5">
        <Label htmlFor="pattern">Description contains</Label>
        <Input id="pattern" defaultValue="Maxima" />
      </div>
    ),
  },
} satisfies Meta<typeof FormSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByRole("group", { name: "Conditions" })).toBeVisible();
  },
};
