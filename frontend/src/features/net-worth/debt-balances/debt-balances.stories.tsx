import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getDebtBalancesMockHandler,
  getDeleteDebtBalanceMockHandler,
  getSetDebtBalanceMockHandler,
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

const mortgage = debts[0]!;
const carLease = debts[1]!;
const saved = fn();
const deleted = fn();

const saveHandler = getSetDebtBalanceMockHandler(async ({ params, request }) => {
  saved(params.date, await request.json());
  return mortgage;
});

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

export const NewestFirst: Story = {
  args: { debt: mortgage },
  play: async ({ canvas }) => {
    const rows = await canvas.findAllByRole("listitem");
    await expect(rows.map((row) => within(row).getByText(/\d{4}$/u).textContent)).toEqual([
      "Sep 5, 2026",
      "Jun 30, 2026",
      "Sep 5, 2025",
    ]);
    await expect(rows[0]).toHaveTextContent("Outstanding amount");
    await expect(rows[0]).toHaveTextContent("Bank statement");
    await expect(rows[1]).not.toHaveTextContent("Outstanding amount");
  },
};

export const SavingANewBalance: Story = {
  args: { debt: mortgage },
  parameters: withHandlers(saveHandler),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /add balance/i }));
    const dialog = within(await openedDialog());
    await fireEvent.change(dialog.getByLabelText("Outstanding amount (EUR)"), {
      target: { value: "97900.50" },
    });
    await fireEvent.change(dialog.getByLabelText(/^Note/u), {
      target: { value: "October statement" },
    });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(saved).toHaveBeenCalledWith("2026-09-18", {
        amount: "97900.50",
        note: "October statement",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  },
};

export const EditingABalance: Story = {
  args: { debt: mortgage },
  parameters: withHandlers(saveHandler),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Edit: €101,760\.40, / }));
    const dialog = within(await openedDialog());
    await expect(dialog.getByText(/^Edit balance: €101,760\.40, /)).toBeVisible();
    const amount = dialog.getByLabelText("Outstanding amount (EUR)");
    await expect(amount).toHaveValue("101760.40");
    await expect(dialog.getByLabelText("Date")).toBeDisabled();
    await fireEvent.change(amount, { target: { value: "101700.00" } });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));
    await waitFor(() =>
      expect(saved).toHaveBeenCalledWith("2025-09-05", {
        amount: "101700.00",
        note: "Annual statement",
      }),
    );
  },
};

export const DeletingABalance: Story = {
  args: { debt: mortgage },
  parameters: withHandlers(
    getDeleteDebtBalanceMockHandler(({ params }) => {
      deleted(params.id, params.date);
    }),
  ),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Delete: €99,100\.00, / }));
    const dialog = within(await openedDialog("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleted).toHaveBeenCalledWith(mortgage.id, "2026-06-30"));
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
