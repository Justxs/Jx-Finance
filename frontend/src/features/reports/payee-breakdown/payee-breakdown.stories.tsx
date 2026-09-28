import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import {
  reportSummaryMonth,
  reportSummaryMonthCompared,
  reportSummaryYear,
} from "@/storybook/fixtures";
import { PayeeBreakdown } from "./payee-breakdown";

const meta = {
  title: "Features/Reports/PayeeBreakdown",
  component: PayeeBreakdown,
  args: { items: reportSummaryMonth.expenseByPayee, dateFrom: "2026-09-01", dateTo: "2026-09-30" },
  parameters: { route: "/reports" },
  decorators: [withWidth("card")],
} satisfies Meta<typeof PayeeBreakdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    const payee = await canvas.findByRole("link", { name: "Būsto paskolos įmoka" });
    await expect(payee).toHaveAttribute("href", expect.stringContaining("payee="));
    await expect(canvas.getAllByRole("listitem")).toHaveLength(8);
  },
};

export const ShowAll: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /show all|rodyti visus/i }));

    await expect(canvas.getAllByRole("listitem")).toHaveLength(
      reportSummaryMonth.expenseByPayee.length,
    );
    await expect(canvas.getByText(/no description|be aprašymo/i)).toBeInTheDocument();
    await expect(canvas.queryByRole("button", { name: /show all|rodyti visus/i })).toBeNull();
  },
};

export const Year: Story = { args: { items: reportSummaryYear.expenseByPayee } };

export const ComparedWithAnEarlierPeriod: Story = {
  args: { items: reportSummaryMonthCompared.expenseByPayee },
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText(/^(was|buvo) /i)).length).toBeGreaterThan(0);
  },
};

export const APayeeOnlyTheEarlierPeriodHad: Story = {
  args: {
    items: [
      {
        payeeKey: "gym plius",
        label: "Gym Plius – narystė",
        amount: "0.00",
        comparisonAmount: "39.00",
        count: 0,
      },
      { payeeKey: "bolt", label: "Bolt", amount: "12.40", comparisonAmount: "0.00", count: 3 },
      { payeeKey: null, label: null, amount: "5.00", comparisonAmount: "5.00", count: 1 },
    ],
  },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("link", { name: "Gym Plius – narystė" })).toBeVisible();
    await expect(canvas.queryByRole("link", { name: /no description|be aprašymo/i })).toBeNull();
    await expect(canvas.getAllByText(/up from nothing|anksčiau nebuvo/i)).toHaveLength(1);
  },
};

export const Empty: Story = { args: { items: [] } };
