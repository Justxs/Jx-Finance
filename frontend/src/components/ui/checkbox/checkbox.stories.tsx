import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Checkbox } from "./checkbox";

const categoryNames = ["Food", "Transport", "Household"];

function SelectAllExample() {
  const [selected, setSelected] = useState<string[]>(["Food"]);
  const all = selected.length === categoryNames.length;

  function toggle(name: string, checked: boolean) {
    setSelected(checked ? [...selected, name] : selected.filter((item) => item !== name));
  }

  return (
    <div className="space-y-2 text-sm">
      <label className="flex items-center gap-2 font-medium">
        <Checkbox
          checked={all}
          indeterminate={selected.length > 0 && !all}
          onCheckedChange={(checked) => setSelected(checked ? categoryNames : [])}
        />
        All categories
      </label>
      {categoryNames.map((name) => (
        <label key={name} className="ml-6 flex items-center gap-2">
          <Checkbox
            checked={selected.includes(name)}
            onCheckedChange={(checked) => toggle(name, checked)}
          />
          {name}
        </label>
      ))}
    </div>
  );
}

const meta = {
  title: "UI/Checkbox",
  component: Checkbox,
  args: { "aria-label": "Split across categories" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Indeterminate: Story = { args: { indeterminate: true } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = { args: { disabled: true, defaultChecked: true } };

export const Invalid: Story = { args: { "aria-invalid": true } };

export const WithLabel: Story = {
  render: () => (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox defaultChecked />
      Split across categories
    </label>
  ),
};

export const WithLongLabel: Story = {
  render: () => (
    <label className="flex w-64 items-start gap-2 text-sm">
      <Checkbox className="mt-0.5" />
      Remind every member of the household by email three days before this recurring bill is due
    </label>
  ),
};

export const SelectAll: Story = { render: () => <SelectAllExample /> };
