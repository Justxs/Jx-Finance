import type { Meta, StoryObj } from "@storybook/react-vite";
import { type ComponentProps, useState } from "react";
import { expect, fn, waitFor } from "storybook/test";
import type { ReportComparisonMode } from "@/api/generated/model";
import { chooseOption } from "@/storybook/interactions";
import { presetRange } from "./date-range-presets";
import { ReportFilters } from "./report-filters";

const today = new Date();

type FiltersProps = ComponentProps<typeof ReportFilters>;

function StatefulFilters({
  dateFrom,
  dateTo,
  comparison,
  onChange,
  onComparisonChange,
}: Readonly<FiltersProps>) {
  const [range, setRange] = useState({ dateFrom, dateTo });
  const [mode, setMode] = useState<ReportComparisonMode>(comparison);

  return (
    <ReportFilters
      dateFrom={range.dateFrom}
      dateTo={range.dateTo}
      comparison={mode}
      onChange={(next) => {
        setRange(next);
        onChange(next);
      }}
      onComparisonChange={(next) => {
        setMode(next);
        onComparisonChange(next);
      }}
    />
  );
}

const meta = {
  title: "Features/Reports/ReportFilters",
  component: ReportFilters,
  parameters: { route: "/reports" },
  args: {
    ...presetRange("thisMonth", today),
    comparison: "none",
    onChange: fn(),
    onComparisonChange: fn(),
  },
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

export const ComparedWithLastYear: Story = { args: { comparison: "previousYear" } };

export const ChoosesAComparison: Story = {
  play: async ({ args, canvas }) => {
    const select = await canvas.findByRole("combobox", { name: /compare with|palyginti su/i });
    await expect(select).toHaveTextContent(/no comparison|be palyginimo/i);

    await chooseOption(select, /previous period|ankstesniu laikotarpiu/i);

    await waitFor(() => expect(args.onComparisonChange).toHaveBeenCalledWith("previousPeriod"));
  },
};

export const Narrow: Story = {
  render: (args) => (
    <div className="w-72">
      <StatefulFilters {...args} />
    </div>
  ),
};
