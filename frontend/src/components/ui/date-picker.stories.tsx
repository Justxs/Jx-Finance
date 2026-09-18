import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DatePicker } from "./date-picker";
import { FieldError } from "./field-error";
import { Label } from "./label";

interface ExampleProps {
  initialValue?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

function DatePickerExample({
  initialValue = "2026-09-18",
  placeholder,
  disabled,
  invalid,
  className = "w-64",
}: Readonly<ExampleProps>) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor="date-picker-story">Date</Label>
      <DatePicker
        id="date-picker-story"
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
      />
      {invalid ? <FieldError message="Pick a date." /> : null}
      <p className="text-xs text-muted-foreground">Value: {value || "empty"}</p>
    </div>
  );
}

const meta = {
  title: "UI/DatePicker",
  component: DatePicker,
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <DatePickerExample /> };

export const Empty: Story = { render: () => <DatePickerExample initialValue="" /> };

export const CustomPlaceholder: Story = {
  render: () => <DatePickerExample initialValue="" placeholder="No end date" />,
};

export const Disabled: Story = { render: () => <DatePickerExample disabled /> };

export const Invalid: Story = { render: () => <DatePickerExample initialValue="" invalid /> };

export const NarrowContainer: Story = { render: () => <DatePickerExample className="w-28" /> };
