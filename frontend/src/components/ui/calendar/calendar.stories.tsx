import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import { lt } from "react-day-picker/locale";
import { Calendar } from "./calendar";

const TODAY = new Date(2026, 8, 18);

function SingleExample({ lithuanian }: Readonly<{ lithuanian?: boolean }>) {
  const [selected, setSelected] = useState<Date | undefined>(TODAY);

  return (
    <Calendar
      mode="single"
      locale={lithuanian ? lt : undefined}
      weekStartsOn={1}
      defaultMonth={TODAY}
      selected={selected}
      onSelect={setSelected}
      className="rounded-md border"
    />
  );
}

function RangeExample({ months = 1 }: Readonly<{ months?: number }>) {
  const [selected, setSelected] = useState<DateRange | undefined>({
    from: new Date(2026, 8, 7),
    to: TODAY,
  });

  return (
    <Calendar
      mode="range"
      weekStartsOn={1}
      numberOfMonths={months}
      defaultMonth={TODAY}
      selected={selected}
      onSelect={setSelected}
      className="rounded-md border"
    />
  );
}

function MultipleExample() {
  const [selected, setSelected] = useState<Date[] | undefined>([
    new Date(2026, 8, 3),
    new Date(2026, 8, 11),
    TODAY,
  ]);

  return (
    <Calendar
      mode="multiple"
      weekStartsOn={1}
      defaultMonth={TODAY}
      selected={selected}
      onSelect={setSelected}
      className="rounded-md border"
    />
  );
}

const meta = {
  title: "UI/Calendar",
  component: Calendar,
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj;

export const Default: Story = { render: () => <SingleExample /> };

export const Range: Story = { render: () => <RangeExample /> };

export const RangeTwoMonths: Story = { render: () => <RangeExample months={2} /> };

export const Multiple: Story = { render: () => <MultipleExample /> };

export const LithuanianLocale: Story = { render: () => <SingleExample lithuanian /> };

export const DropdownCaption: Story = {
  render: () => (
    <Calendar
      mode="single"
      weekStartsOn={1}
      captionLayout="dropdown"
      defaultMonth={TODAY}
      startMonth={new Date(2020, 0)}
      endMonth={new Date(2030, 11)}
      className="rounded-md border"
    />
  ),
};

export const DisabledDays: Story = {
  render: () => (
    <Calendar
      mode="single"
      weekStartsOn={1}
      defaultMonth={TODAY}
      disabled={{ after: TODAY }}
      className="rounded-md border"
    />
  ),
};

export const WithWeekNumbersAndOutsideDaysHidden: Story = {
  render: () => (
    <Calendar
      mode="single"
      weekStartsOn={1}
      defaultMonth={TODAY}
      showWeekNumber
      showOutsideDays={false}
      className="rounded-md border"
    />
  ),
};
