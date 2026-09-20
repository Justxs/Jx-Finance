import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { emptyReportSummary, reportSummaryMonth, reportSummaryYear } from "@/storybook/fixtures";
import { ReportStats } from "./report-stats";

const meta = {
  title: "Features/Reports/ReportStats",
  component: ReportStats,
  parameters: { layout: "padded", route: "/reports" },
  args: {
    totalIncome: reportSummaryMonth.totalIncome ?? "0",
    totalExpense: reportSummaryMonth.totalExpense ?? "0",
    net: reportSummaryMonth.net ?? "0",
  },
} satisfies Meta<typeof ReportStats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Month: Story = {};

export const Year: Story = {
  args: {
    totalIncome: reportSummaryYear.totalIncome ?? "0",
    totalExpense: reportSummaryYear.totalExpense ?? "0",
    net: reportSummaryYear.net ?? "0",
  },
};

export const Empty: Story = {
  args: {
    totalIncome: emptyReportSummary.totalIncome ?? "0",
    totalExpense: emptyReportSummary.totalExpense ?? "0",
    net: emptyReportSummary.net ?? "0",
  },
};

export const NegativeNet: Story = {
  args: { totalIncome: "1200.00", totalExpense: "3480.55", net: "-2280.55" },
};

export const LargeAmounts: Story = {
  args: { totalIncome: "98765432.10", totalExpense: "87654321.09", net: "11111111.01" },
};

export const Narrow: Story = {
  decorators: [withWidth("field")],
};
