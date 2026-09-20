import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { accounts } from "@/storybook/fixtures";
import { Label } from "../ui/label/label";
import { SelectField, type SelectOption } from "./select-field";

const accountOptions: SelectOption[] = accounts.map((account) => ({
  value: account.id,
  label: account.name,
}));

const firstAccount = accountOptions[0]?.value ?? "";

const withDisabledOption: SelectOption[] = [
  { value: "", label: "No account" },
  ...accountOptions.map((option, index) => ({ ...option, disabled: index === 1 })),
];

const longLabelOptions: SelectOption[] = [
  {
    value: "long-1",
    label:
      "Joint savings account for the summer house renovation with a name nobody should ever type",
  },
  {
    value: "long-2",
    label: "AnUnbreakableAccountNameWithoutAnySpacesThatStillHasToFitInsideTheTrigger",
  },
  { value: "short", label: "Cash" },
];

const manyOptions: SelectOption[] = Array.from({ length: 60 }, (_, index) => ({
  value: `option-${index}`,
  label: `Category ${index + 1}`,
}));

interface ExampleProps {
  options: SelectOption[];
  initialValue?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  busy?: boolean;
}

function SelectFieldExample({
  options,
  initialValue = "",
  placeholder,
  disabled,
  invalid,
  busy,
}: Readonly<ExampleProps>) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className="w-64 space-y-1.5">
      <Label htmlFor="select-field-story">Account</Label>
      <SelectField
        id="select-field-story"
        value={value}
        onChange={setValue}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        aria-busy={busy}
      />
    </div>
  );
}

const meta = {
  title: "Components/SelectField",
  component: SelectField,
} satisfies Meta<typeof SelectField>;

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => <SelectFieldExample options={accountOptions} initialValue={firstAccount} />,
};

export const Placeholder: Story = {
  render: () => <SelectFieldExample options={accountOptions} placeholder="Choose an account" />,
};

export const Disabled: Story = {
  render: () => (
    <SelectFieldExample options={accountOptions} initialValue={firstAccount} disabled />
  ),
};

export const Invalid: Story = {
  render: () => (
    <SelectFieldExample options={accountOptions} placeholder="Choose an account" invalid />
  ),
};

export const Busy: Story = {
  render: () => <SelectFieldExample options={[]} placeholder="Loading accounts" busy />,
};

export const DisabledOption: Story = {
  render: () => <SelectFieldExample options={withDisabledOption} />,
};

export const LongLabels: Story = {
  render: () => <SelectFieldExample options={longLabelOptions} initialValue="long-1" />,
};

export const ManyOptions: Story = {
  render: () => <SelectFieldExample options={manyOptions} initialValue="option-30" />,
};
