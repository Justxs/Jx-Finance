import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, within } from "storybook/test";
import { getCreateDebtMockHandler } from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import { debtPaymentTooSmallProblem, debts, ids, zeroRateDebt } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { DebtForm, debtFormValues } from "./debt-form";

const [mortgage] = debts;

const meta = {
  title: "Features/NetWorth/DebtForm",
  component: DebtForm,
  args: { onClose: fn() },
  decorators: [withWidth("w-[min(36rem,calc(100vw-3rem))]")],
} satisfies Meta<typeof DebtForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "Mortgage (Swedbank)");
    await userEvent.type(fields[1]!, "98450.32");
    await userEvent.type(fields[2]!, "3.85");
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    await userEvent.type(fields[0]!, "x");
    await userEvent.clear(fields[0]!);
    await userEvent.type(fields[1]!, "abc");
  },
};

export const SubmitPending: Story = {
  parameters: withHandlers(getCreateDebtMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fields = canvas.getAllByRole("textbox");
    await fireEvent.change(fields[0]!, { target: { value: "Mortgage (Swedbank)" } });
    await fireEvent.change(fields[1]!, { target: { value: "98450.32" } });
    await fireEvent.change(fields[2]!, { target: { value: "3.85" } });
    await userEvent.click(canvas.getByRole("button", { name: /^(add|pridėti)$/i }));
  },
};

export const EditingWithSchedule: Story = {
  args: {
    editing: { id: ids.debts.mortgage, values: debtFormValues(mortgage ?? zeroRateDebt) },
  },
};

export const EditingZeroRate: Story = {
  args: { editing: { id: zeroRateDebt.id, values: debtFormValues(zeroRateDebt) } },
};

export const TermAndPaymentTogether: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText(/term, months|terminas/i), "360");
    await userEvent.type(canvas.getByLabelText(/^(monthly payment|mėnesio įmoka)$/i), "500");
    await expect(
      await canvas.findByText(/give a term or a monthly payment|nurodykite terminą/i),
    ).toBeInTheDocument();
  },
};

export const PaymentTooSmall: Story = {
  parameters: withHandlers(getCreateDebtMockHandler(failWith(debtPaymentTooSmallProblem))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
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
