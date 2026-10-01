import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  getDebtBalancesMockHandler,
  getDeleteDebtBalanceMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import {
  debts,
  lastBalanceProblem,
  serverErrorProblem,
  trackedMortgage,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { DebtBalances } from "./debt-balances";

const carLease = debts[1]!;

const meta = {
  title: "Features/NetWorth/DebtBalances",
  component: DebtBalances,
  args: { debt: trackedMortgage },
  parameters: { route: "/net-worth/debts/story" },
  decorators: [withWidth("panel")],
} satisfies Meta<typeof DebtBalances>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Annual statement")).toBeVisible();
    await expect(canvas.getByText("Outstanding amount")).toBeVisible();
  },
};

export const SingleBalance: Story = { args: { debt: carLease } };

export const AddingBalance: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /add balance/i }));
    const dialog = within(await openedDialog());
    await expect(dialog.getByLabelText(/outstanding amount/i)).toBeVisible();
  },
};

export const LastBalanceRefused: Story = {
  args: { debt: carLease },
  parameters: withHandlers(getDeleteDebtBalanceMockHandler(failWith(lastBalanceProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Delete: / }));
    const dialog = within(await openedDialog("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Delete" }));
    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Loading: Story = {
  parameters: withHandlers(getDebtBalancesMockHandler(pending)),
};

export const ServerError: Story = {
  parameters: withHandlers(getDebtBalancesMockHandler(failWith(serverErrorProblem))),
};

export const Phone: Story = {
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};
