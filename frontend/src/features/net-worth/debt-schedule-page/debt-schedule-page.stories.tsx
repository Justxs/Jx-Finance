import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  getDebtScheduleMockHandler,
  getDebtsMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { withPageFrame } from "@/storybook/decorators";
import { debts, ids, linearDebt, serverErrorProblem, zeroRateDebt } from "@/storybook/fixtures";
import {
  errorHandlers,
  failWith,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { DebtSchedulePage } from "./debt-schedule-page";

const meta = {
  title: "Features/NetWorth/DebtSchedulePage",
  component: DebtSchedulePage,
  args: { debtId: ids.debts.mortgage },
  parameters: { layout: "fullscreen", route: "/net-worth" },
  decorators: [withPageFrame],
} satisfies Meta<typeof DebtSchedulePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Būsto paskola (Swedbank)" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("region", { name: /^(payments|įmokos)$/i })).toBeInTheDocument();
  },
};

export const ZeroRate: Story = {
  args: { debtId: zeroRateDebt.id },
  parameters: withHandlers(getDebtsMockHandler([...debts, zeroRateDebt])),
};

export const Linear: Story = {
  args: { debtId: linearDebt.id },
  parameters: withHandlers(getDebtsMockHandler([...debts, linearDebt])),
};

export const PayingExtra: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      await canvas.findByLabelText(/extra each month|papildomai kas mėnesį/i),
      "150",
    );
    await expect(
      await canvas.findByText(/payments? sooner|įmok\S* anksčiau/i, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    await expect(
      canvas.getAllByRole("columnheader", { name: /overpayment|permoka/i }),
    ).toHaveLength(1);
  },
};

export const IncompleteTerms: Story = {
  args: { debtId: ids.debts.carLease },
};

export const UnknownDebt: Story = {
  args: { debtId: ids.debts.studentLoan },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ScheduleLoading: Story = {
  parameters: withHandlers(getDebtScheduleMockHandler(pending)),
};

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const ScheduleFails: Story = {
  parameters: withHandlers(getDebtScheduleMockHandler(failWith(serverErrorProblem))),
};
