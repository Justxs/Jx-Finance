import type { Meta, StoryObj } from "@storybook/react-vite";
import { Input } from "./input";
import { Label } from "../label";

const inputTypes = [
  { type: "text", label: "Text", value: "Maxima groceries" },
  { type: "email", label: "Email", value: "ruta@example.lt" },
  { type: "password", label: "Password", value: "correct horse" },
  { type: "number", label: "Number", value: "42.18" },
  { type: "search", label: "Search", value: "rent" },
  { type: "tel", label: "Phone", value: "+370 600 00000" },
  { type: "url", label: "URL", value: "https://example.lt" },
  { type: "file", label: "File", value: undefined },
];

const meta = {
  title: "UI/Input",
  component: Input,
  args: { "aria-label": "Description" },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { defaultValue: "Maxima groceries" } };

export const Placeholder: Story = { args: { placeholder: "What was it for?" } };

export const Disabled: Story = { args: { defaultValue: "Locked", disabled: true } };

export const ReadOnly: Story = {
  args: { defaultValue: "LT12 7300 0101 2345 6789", readOnly: true },
};

export const Invalid: Story = { args: { defaultValue: "abc", "aria-invalid": true } };

export const LongValue: Story = {
  args: {
    defaultValue:
      "A very long description that does not fit into the input and has to scroll horizontally",
  },
};

export const DecimalInputMode: Story = { args: { inputMode: "decimal", placeholder: "0.00" } };

export const Types: Story = {
  render: () => (
    <div className="space-y-3">
      {inputTypes.map((item) => (
        <div key={item.type} className="space-y-1.5">
          <Label htmlFor={`input-story-${item.type}`}>{item.label}</Label>
          <Input id={`input-story-${item.type}`} type={item.type} defaultValue={item.value} />
        </div>
      ))}
    </div>
  ),
};
