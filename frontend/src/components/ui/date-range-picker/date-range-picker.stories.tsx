import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Label } from "../label";
import { type DateRange, DateRangePicker } from "./date-range-picker";

const emptyRange: DateRange = { from: "", to: "" };

interface ExampleProps {
  initialValue?: DateRange;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const defaultRange = { from: "2026-09-01", to: "2026-09-18" };

function DateRangePickerExample({
  initialValue = defaultRange,
  placeholder,
  disabled,
  className = "w-72",
}: Readonly<ExampleProps>) {
  const [value, setValue] = useState(initialValue);

  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label htmlFor="date-range-picker-story">Period</Label>
      <DateRangePicker
        id="date-range-picker-story"
        value={value}
        onChange={setValue}
        placeholder={placeholder}
        disabled={disabled}
      />
      <p className="text-xs text-muted-foreground">
        From: {value.from || "empty"}, to: {value.to || "empty"}
      </p>
    </div>
  );
}

const meta = {
  title: "UI/DateRangePicker",
  component: DateRangePicker,
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <DateRangePickerExample /> };

export const Empty: Story = { render: () => <DateRangePickerExample initialValue={emptyRange} /> };

export const CustomPlaceholder: Story = {
  render: () => <DateRangePickerExample initialValue={emptyRange} placeholder="All time" />,
};

export const OnlyStartPicked: Story = {
  render: () => <DateRangePickerExample initialValue={{ from: "2026-09-10", to: "" }} />,
};

export const OnlyEndSet: Story = {
  render: () => <DateRangePickerExample initialValue={{ from: "", to: "2026-09-18" }} />,
};

export const AcrossYears: Story = {
  render: () => <DateRangePickerExample initialValue={{ from: "2025-10-01", to: "2026-09-30" }} />,
};

export const Disabled: Story = { render: () => <DateRangePickerExample disabled /> };

export const NarrowContainer: Story = {
  render: () => <DateRangePickerExample className="w-36" />,
};
