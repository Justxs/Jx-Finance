import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getUpdateDebtMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import {
  debts,
  linearDebt,
  linearSchedule,
  mortgageSchedule,
  serverErrorProblem,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { DebtScheduleSummary } from "./debt-schedule-summary";

const [mortgage] = debts;

const meta = {
  title: "Features/NetWorth/DebtScheduleSummary",
  component: DebtScheduleSummary,
  args: { debt: mortgage ?? linearDebt, schedule: mortgageSchedule },
  decorators: [withWidth("w-[min(64rem,calc(100vw-3rem))]")],
} satisfies Meta<typeof DebtScheduleSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MatchesRecordedBalance: Story = {
  args: {
    debt: { ...linearDebt, outstandingAmount: linearSchedule.scheduledBalance },
    schedule: linearSchedule,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.queryByRole("button", { name: /scheduled balance|pagal grafiką/i }),
    ).toBeNull();
  },
};

export const UsingScheduledBalance: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /use scheduled balance|naudoti likutį/i }),
    );
    await expect(
      await within(document.body).findByText(/outstanding amount set to|likusi suma pakeista/i),
    ).toBeInTheDocument();
  },
};

export const UpdatePending: Story = {
  parameters: withHandlers(getUpdateDebtMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /use scheduled balance|naudoti likutį/i }),
    );
  },
};

export const UpdateFails: Story = {
  parameters: withHandlers(getUpdateDebtMockHandler(failWith(serverErrorProblem))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /use scheduled balance|naudoti likutį/i }),
    );
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();
  },
};
