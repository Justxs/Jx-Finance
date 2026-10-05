import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { Section } from "@/components/ui/section/section";
import { withWidth } from "@/storybook/decorators";
import { FIXTURE_MONTH } from "@/storybook/fixtures";
import { emptyHandlers, errorHandlers, loadingHandlers } from "@/storybook/handlers";
import { NetWorthMonth } from "./net-worth-month";

const meta = {
  title: "Features/Dashboard/NetWorthMonth",
  component: NetWorthMonth,
  args: { month: FIXTURE_MONTH },
  parameters: { route: "/dashboard" },
  decorators: [
    (Story) => (
      <Section>
        <Story />
      </Section>
    ),
    withWidth("wide"),
  ],
} satisfies Meta<typeof NetWorthMonth>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByText(/so far this month|per šį mėnesį iki šiol/i),
    ).toBeVisible();
  },
};

export const EarlierMonth: Story = {
  args: { month: "2026-03", until: "2026-03-31" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/over the month|per mėnesį/i)).toBeVisible();
  },
};

export const FirstMonthOfHistory: Story = {
  args: { month: "2025-10", until: "2025-10-31" },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };
