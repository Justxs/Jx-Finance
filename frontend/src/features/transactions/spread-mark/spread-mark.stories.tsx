import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { spreadTransaction } from "@/storybook/fixtures";
import { SpreadMark } from "./spread-mark";

const meta = {
  title: "Features/Transactions/SpreadMark",
  component: SpreadMark,
  parameters: { layout: "padded", route: "/transactions" },
  args: { transaction: spreadTransaction },
} satisfies Meta<typeof SpreadMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const TwelveMonths: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Spread · 12 months")).toBeInTheDocument();
    await expect(
      canvas.getByText(
        ". Counts €30.00 a month in reports and budgets, January 2026 to December 2026",
      ),
    ).toBeInTheDocument();
  },
};

export const ThreeMonths: Story = {
  args: {
    transaction: { ...spreadTransaction, reportingAmount: "100.00", spreadMonths: 3 },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Spread · 3 months")).toBeInTheDocument();
    await expect(
      canvas.getByText(
        ". Counts €33.34 a month in reports and budgets, January 2026 to March 2026",
      ),
    ).toBeInTheDocument();
  },
};

export const ThirtySixMonths: Story = {
  args: {
    transaction: { ...spreadTransaction, reportingAmount: "1800.00", spreadMonths: 36 },
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Spread · 36 months")).toBeInTheDocument();
    await expect(canvas.getByText(/December 2028$/u)).toBeInTheDocument();
  },
};

export const PaidInArrears: Story = {
  args: { transaction: { ...spreadTransaction, spreadDirection: "backward" } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Spread · 12 months")).toBeInTheDocument();
    await expect(canvas.getByText(/February 2025 to January 2026$/u)).toBeInTheDocument();
  },
};

export const RefundSpread: Story = {
  args: { transaction: { ...spreadTransaction, reportingAmount: "-120.00" } },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Spread · 12 months")).toBeInTheDocument();
    await expect(canvas.getByText(/10\.00 a month in reports and budgets/u)).toBeInTheDocument();
  },
};

export const InsideADateRange: Story = {
  parameters: { route: "/transactions?dateFrom=2026-03-01&dateTo=2026-05-31&spreadOverlap=true" },
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/€90\.00 of it falls in the dates shown\.$/u),
    ).toBeInTheDocument();
  },
};

export const NotSpread: Story = {
  args: { transaction: { ...spreadTransaction, spreadMonths: null } },
  play: async ({ canvas }) => {
    await expect(canvas.queryByText(/Spread/u)).toBeNull();
  },
};
