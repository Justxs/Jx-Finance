import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { accounts, brokerAccount, categories, checkingAccount } from "@/storybook/fixtures";
import { ConversionForm } from "./conversion-form";

const meta = {
  title: "Features/Accounts/ConversionForm",
  component: ConversionForm,
  args: {
    accounts,
    categories,
    accountId: brokerAccount.id,
    pending: false,
    onSubmit: fn(),
    onCancel: fn(),
  },
  render: (args) => (
    <div className="w-[min(36rem,90vw)]">
      <ConversionForm {...args} />
    </div>
  ),
} satisfies Meta<typeof ConversionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Pending: Story = { args: { pending: true } };

export const SingleCurrencyAccount: Story = { args: { accountId: checkingAccount.id } };

export const NoAccounts: Story = { args: { accounts: [], accountId: undefined } };

export const FilledWithFee: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Sold"), "1000");
    await userEvent.type(canvas.getByLabelText("Bought"), "1084.20");
    await userEvent.type(canvas.getByLabelText("Fee (optional)"), "2");
    await expect(await canvas.findByText(/1 EUR = 1[.,]0842 USD$/)).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Convert" }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
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
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText("Sold"), "abc");
    await expect(canvas.getByRole("button", { name: "Convert" })).toBeDisabled();
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(canvas.getByLabelText("Sold")).toHaveAttribute("aria-invalid", "true");
  },
};
