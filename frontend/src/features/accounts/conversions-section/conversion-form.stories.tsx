import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import { getCreateConversionMockHandler } from "@/api/generated/conversions/conversions.msw";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  brokerAccount,
  categories,
  checkingAccount,
  conversionWithFee,
} from "@/storybook/fixtures";
import { pending, withHandlers } from "@/storybook/handlers";
import { ConversionForm } from "./conversion-form";

const meta = {
  title: "Features/Accounts/ConversionForm",
  component: ConversionForm,
  args: {
    accounts,
    categories,
    accountId: brokerAccount.id,
    onClose: fn(),
  },
  decorators: [withWidth("dialog")],
} satisfies Meta<typeof ConversionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Pending: Story = {
  parameters: withHandlers(getCreateConversionMockHandler(pending)),
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText("Sold"), "1000");
    await userEvent.type(canvas.getByLabelText("Bought"), "1084.20");
    const submit = canvas.getByRole("button", { name: "Convert" });
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const SingleCurrencyAccount: Story = { args: { accountId: checkingAccount.id } };

export const NoAccounts: Story = { args: { accounts: [], accountId: undefined } };

const sent = fn();

export const FilledWithFee: Story = {
  parameters: withHandlers(
    getCreateConversionMockHandler(async ({ request }) => {
      sent(await request.json());
      return conversionWithFee;
    }),
  ),
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText("Sold"), "1000");
    await userEvent.type(canvas.getByLabelText("Bought"), "1084.20");
    await userEvent.type(canvas.getByLabelText("Fee (optional)"), "2");
    await expect(await canvas.findByText(/1 EUR = 1[.,]0842 USD$/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Convert" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({
        fromAmount: "1000",
        fromCurrency: "eur",
        toAmount: "1084.20",
        toCurrency: "usd",
        feeAmount: "2",
        feeCurrency: "eur",
      }),
    );
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(canvas.getByLabelText("Sold"), "abc");
    await expect(canvas.getByRole("button", { name: "Convert" })).toBeDisabled();
    await expect(args.onClose).not.toHaveBeenCalled();
    await expect(canvas.getByLabelText("Sold")).toHaveAttribute("aria-invalid", "true");
  },
};
