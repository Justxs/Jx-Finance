import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  getDebtPaymentCandidatesMockHandler,
  getDebtPaymentsMockHandler,
  getDebtScheduleMockHandler,
  getDebtsMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { withPageFrame } from "@/storybook/decorators";
import {
  debts,
  familyHousehold,
  ids,
  linearDebt,
  mortgagePayments,
  serverErrorProblem,
  sharedTrackedMortgage,
  trackedMortgage,
  zeroRateDebt,
} from "@/storybook/fixtures";
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
  parameters: { layout: "fullscreen", route: "/net-worth/debts/story" },
  decorators: [withPageFrame],
} satisfies Meta<typeof DebtSchedulePage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("heading", { name: "Būsto paskola (Swedbank)" }),
    ).toBeInTheDocument();
    await expect(canvas.getByRole("region", { name: /^(payments|įmokos)$/i })).toBeInTheDocument();
  },
};

export const NotTrackingSkipsPayments: Story = {
  parameters: withHandlers(getDebtPaymentsMockHandler(pending)),
  play: async ({ canvas }) => {
    await expect(
      await canvas.findByRole("img", { name: /^(remaining balance|likęs skolos likutis)/i }),
    ).toBeInTheDocument();
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
  play: async ({ canvas }) => {
    await userEvent.type(
      await canvas.findByLabelText(/extra each month|papildomai kas mėnesį/i),
      "150",
    );
    await expect(
      await canvas.findByText(/payments? sooner|įmok\S* anksčiau/i, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    await expect(canvas.getByText(/^(lower payment|mažesnė įmoka)$/i)).toBeInTheDocument();
    await expect(
      canvas.getAllByRole("columnheader", { name: /overpayment|permoka/i }),
    ).toHaveLength(1);
  },
};

export const IncompleteTerms: Story = {
  args: { debtId: ids.debts.carLease },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(/^Add the loan amount, interest rate/u)).toBeVisible();
    await expect(
      await canvas.findByRole("heading", { name: "Recorded balances" }),
    ).toBeInTheDocument();
    await expect(canvas.getByText("€6,200.00")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Add balance" })).toBeVisible();
  },
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

const tracking = getDebtsMockHandler([trackedMortgage, ...debts.slice(1)]);

export const TrackingPayments: Story = {
  parameters: withHandlers(tracking),
  play: async ({ canvas }) => {
    const payments = await canvas.findByRole("region", {
      name: /^(linked payments|susietos įmokos)$/i,
    });
    await expect(payments).toHaveTextContent("97");
    await expect(canvas.getAllByText(/tracked balance|stebimas likutis/i).length).toBeGreaterThan(
      0,
    );
  },
};

export const TrackingWithMissingRate: Story = {
  parameters: withHandlers(getDebtsMockHandler([{ ...trackedMortgage, trackedIncomplete: true }])),
};

export const TrackingWithUnavailablePayments: Story = {
  parameters: withHandlers(getDebtsMockHandler([{ ...trackedMortgage, unavailablePayments: 2 }])),
};

export const TrackingPaidOff: Story = {
  parameters: withHandlers(
    getDebtsMockHandler([
      { ...trackedMortgage, outstandingAmount: "900.00", trackedBalance: "0.00" },
    ]),
    getDebtPaymentsMockHandler([
      {
        ...mortgagePayments[2]!,
        interest: "0.00",
        principal: "900.00",
        overpaid: "100.00",
        balance: "0.00",
      },
    ]),
  ),
};

export const TrackingWithoutSchedule: Story = {
  args: { debtId: ids.debts.carLease },
  parameters: withHandlers(
    getDebtsMockHandler(
      debts.map((debt) =>
        debt.id === ids.debts.carLease
          ? { ...debt, tracksPayments: true, trackedBalance: debt.outstandingAmount }
          : debt,
      ),
    ),
    getDebtPaymentsMockHandler([]),
  ),
};

export const LinkingPayments: Story = {
  parameters: withHandlers(tracking),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /^(link payments|susieti įmokas)$/i }),
    );
    const body = within(document.body);
    const [first] = await body.findAllByRole("checkbox");
    await userEvent.click(first!);
    await userEvent.click(body.getByRole("button", { name: /link 1 payment|susieti 1 įmoką/i }));
    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};

export const NoCandidates: Story = {
  parameters: withHandlers(tracking, getDebtPaymentCandidatesMockHandler([])),
  play: async ({ canvas }) => {
    await userEvent.click(
      await canvas.findByRole("button", { name: /^(link payments|susieti įmokas)$/i }),
    );
  },
};

export const PaymentsLoading: Story = {
  parameters: withHandlers(tracking, getDebtPaymentsMockHandler(pending)),
};

export const PaymentsFail: Story = {
  parameters: withHandlers(tracking, getDebtPaymentsMockHandler(failWith(serverErrorProblem))),
};

export const SharedWithHousehold: Story = {
  parameters: withHandlers(getDebtsMockHandler([sharedTrackedMortgage, ...debts.slice(1)])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText(`Shared · ${familyHousehold.name}`)).toBeVisible();
  },
};
