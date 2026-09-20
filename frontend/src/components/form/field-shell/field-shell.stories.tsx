import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "@/components/ui/input";
import { FieldShell } from "./field-shell";

const meta = {
  title: "Components/Form/FieldShell",
  component: FieldShell,
  args: {
    id: "shell-name",
    label: "Name",
    children: <Input id="shell-name" defaultValue="Groceries" />,
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FieldShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = { args: { hint: "Shown on every report." } };

export const WithError: Story = { args: { error: "This field is required." } };

export const WithHintAndError: Story = {
  args: { hint: "Shown on every report.", error: "This field is required." },
};

export const WithoutLabel: Story = {
  args: {
    label: undefined,
    children: <Input id="shell-name" aria-label="Name" defaultValue="Groceries" />,
  },
};
