import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { fn } from "storybook/test";
import { presetRange } from "./date-range-presets";
import { ReportFilters } from "./report-filters";

const today = new Date();

type FiltersProps = ComponentProps<typeof ReportFilters>;

function StatefulFilters({ dateFrom, dateTo, onChange }: Readonly<FiltersProps>) {
  const [range, setRange] = useState({ dateFrom, dateTo });

  return (
    <ReportFilters
      dateFrom={range.dateFrom}
      dateTo={range.dateTo}
      onChange={(next) => {
        setRange(next);
        onChange(next);
      }}
    />
  );
}

const meta = {
  title: "Features/Reports/ReportFilters",
  component: ReportFilters,
  parameters: { route: "/reports" },
  args: { ...presetRange("thisMonth", today), onChange: fn() },
  render: (args) => (
    <div className="w-[40rem] max-w-full">
      <StatefulFilters {...args} />
    </div>
  ),
} satisfies Meta<typeof ReportFilters>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThisMonth: Story = {};

export const LastMonth: Story = { args: presetRange("lastMonth", today) };

export const ThisYear: Story = { args: presetRange("thisYear", today) };

export const LastYear: Story = { args: presetRange("lastYear", today) };

export const CustomRange: Story = { args: { dateFrom: "2026-03-10", dateTo: "2026-05-24" } };

export const Narrow: Story = {
  render: (args) => (
    <div className="w-72">
      <StatefulFilters {...args} />
    </div>
  ),
};
