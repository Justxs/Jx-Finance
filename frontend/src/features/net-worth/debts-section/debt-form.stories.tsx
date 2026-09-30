import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent } from "storybook/test";
import { getCreateDebtMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import {
  debtPaymentTooSmallProblem,
  debts,
  familyHousehold,
  sharedTrackedMortgage,
  trackedMortgage,
  zeroRateDebt,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { DebtForm } from "./debt-form";

const [mortgage] = debts;

const meta = {
  title: "Features/NetWorth/DebtForm",
  component: DebtForm,
  args: { onClose: fn() },
  decorators: [withWidth("dialog")],
} satisfies Meta<typeof DebtForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  play: async ({ canvas }) => {
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "Mortgage (Swedbank)");
    await userEvent.type(fields[1]!, "98450.32");
    await userEvent.type(fields[2]!, "3.85");
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvas }) => {
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "x");
    await userEvent.clear(fields[0]!);
    await userEvent.type(fields[1]!, "abc");
  },
};

export const SubmitPending: Story = {
  parameters: withHandlers(getCreateDebtMockHandler(pending)),
  play: async ({ canvas }) => {
    const fields = canvas.getAllByRole("textbox");
    await fireEvent.change(fields[0]!, { target: { value: "Mortgage (Swedbank)" } });
    await fireEvent.change(fields[1]!, { target: { value: "98450.32" } });
    await fireEvent.change(fields[2]!, { target: { value: "3.85" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};

export const EditingWithSchedule: Story = {
  args: {
    editing: mortgage ?? zeroRateDebt,
  },
};

export const EditingZeroRate: Story = {
  args: { editing: zeroRateDebt },
};

export const TermAndPaymentTogether: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(canvas.getByLabelText(/term, months|terminas/i), "360");
    await userEvent.type(canvas.getByLabelText(/^(monthly payment|mėnesio įmoka)$/i), "500");
    await expect(
      await canvas.findByText(/give a term or a monthly payment|nurodykite terminą/i),
    ).toBeInTheDocument();
  },
};

export const PaymentTooSmall: Story = {
  parameters: withHandlers(getCreateDebtMockHandler(failWith(debtPaymentTooSmallProblem))),
  play: async ({ canvas }) => {
    await fireEvent.change(canvas.getByLabelText(/^(name|pavadinimas)$/i), {
      target: { value: "Mortgage" },
    });
    await fireEvent.change(canvas.getByLabelText(/^(outstanding amount|likusi suma)$/i), {
      target: { value: "100000" },
    });
    await fireEvent.change(canvas.getByLabelText(/^(monthly payment|mėnesio įmoka)$/i), {
      target: { value: "400" },
    });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
    await expect(
      await canvas.findByText(/does not repay the debt within 50 years|negrąžina per 50 metų/i),
    ).toBeInTheDocument();
  },
};

export const TracksPayments: Story = {
  args: { editing: trackedMortgage },
  play: async ({ canvas }) => {
    await expect(
      canvas.getByRole("checkbox", { name: /track payments|sekti įmokas/i }),
    ).toBeChecked();
    await expect(canvas.getByLabelText(/^(balance on|likutis dieną)$/i)).toBeInTheDocument();
  },
};

export const SharedWithHousehold: Story = {
  args: { editing: sharedTrackedMortgage },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("combobox", { name: "Visibility" })).toHaveTextContent(
      "Shared",
    );
    await expect(canvas.getByRole("combobox", { name: "Household" })).toHaveTextContent(
      familyHousehold.name,
    );
  },
};

export const SharingANewDebt: Story = {
  play: async ({ canvas }) => {
    await chooseOption(await canvas.findByRole("combobox", { name: "Visibility" }), "Shared");
    await chooseOption(
      await canvas.findByRole("combobox", { name: "Household" }),
      familyHousehold.name,
    );
    await expect(canvas.getByRole("combobox", { name: "Household" })).toHaveTextContent(
      familyHousehold.name,
    );
  },
};
