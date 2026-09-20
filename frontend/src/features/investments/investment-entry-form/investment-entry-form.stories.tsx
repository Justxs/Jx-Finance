import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { withWidth } from "@/storybook/decorators";
import { accounts, brokerAccount, securities, usStock, worldEtf } from "@/storybook/fixtures";
import { chooseOption } from "@/storybook/interactions";
import { InvestmentEntryForm } from "./investment-entry-form";

const meta = {
  title: "Features/Investments/InvestmentEntryForm",
  component: InvestmentEntryForm,
  args: {
    accounts,
    securities,
    accountId: brokerAccount.id,
    pending: false,
    onSubmit: fn(),
    onCancel: fn(),
  },
  decorators: [withWidth("w-[min(36rem,90vw)]")],
} satisfies Meta<typeof InvestmentEntryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

async function choose(canvasElement: HTMLElement, label: string | RegExp, option: string | RegExp) {
  await chooseOption(await within(canvasElement).findByLabelText(label), option);
}

export const Buy: Story = {};

export const Sell: Story = { args: { initialType: "sell" } };

export const Dividend: Story = { args: { initialType: "dividend" } };

export const WithholdingTax: Story = { args: { initialType: "withholdingTax" } };

export const Interest: Story = { args: { initialType: "interest" } };

export const Fee: Story = { args: { initialType: "fee" } };

export const Split: Story = { args: { initialType: "split" } };

export const Pending: Story = { args: { pending: true } };

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const NoSecurities: Story = { args: { securities: [] } };

export const DefaultsToInvestmentAccount: Story = {
  args: { accountId: undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText("Account")).toHaveTextContent(brokerAccount.name);
  },
};

export const SwitchingTypeChangesFields: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByLabelText("Quantity")).toBeInTheDocument();
    await expect(canvas.getByLabelText("Price per share")).toBeInTheDocument();
    await expect(canvas.queryByLabelText("Amount")).not.toBeInTheDocument();

    await choose(canvasElement, "Entry type", "Interest");
    await expect(canvas.queryByLabelText("Quantity")).not.toBeInTheDocument();
    await expect(canvas.queryByLabelText("Price per share")).not.toBeInTheDocument();
    await expect(await canvas.findByLabelText("Amount")).toBeInTheDocument();
    await expect(canvas.getByLabelText("Security (optional)")).toBeInTheDocument();

    await choose(canvasElement, "Entry type", "Split");
    await expect(await canvas.findByLabelText("New shares per old share")).toBeInTheDocument();
    await expect(canvas.getByText("2 for a 2-for-1 split.")).toBeInTheDocument();
    await expect(canvas.getByText("No cash movement")).toBeInTheDocument();
  },
};

export const BuyShowsCashEffect: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await choose(canvasElement, "Security", new RegExp(`^${worldEtf.symbol}`));
    await userEvent.type(await canvas.findByLabelText("Quantity"), "10");
    await userEvent.type(await canvas.findByLabelText("Price per share (EUR)"), "98,40");
    await userEvent.type(canvas.getByLabelText("Fee (optional)"), "1,25");
    await expect(await canvas.findByText("−€985.25")).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Add entry" }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "buy",
        accountId: brokerAccount.id,
        securityId: worldEtf.id,
        quantity: "10",
        price: "98,40",
        fee: "1,25",
        amount: null,
      }),
    );
  },
};

export const DividendUsesSecurityCurrency: Story = {
  args: { initialType: "dividend" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await choose(canvasElement, "Security", new RegExp(`^${usStock.symbol}`));
    await userEvent.type(await canvas.findByLabelText("Amount (USD)"), "9.96");
    await expect(await canvas.findByText("+$9.96")).toBeInTheDocument();
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Add entry" }));
    await expect(args.onSubmit).not.toHaveBeenCalled();
    await expect(await canvas.findByText("Choose a security.")).toBeInTheDocument();
  },
};

export const AddedSecurityBecomesSelected: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Add security" }));

    const dialog = within(await within(document.body).findByRole("dialog"));
    await userEvent.type(await dialog.findByLabelText("Symbol"), "iwda");
    await userEvent.type(dialog.getByLabelText("Name"), "iShares Core MSCI World UCITS ETF");
    await userEvent.click(dialog.getByRole("button", { name: "Add security" }));

    await waitFor(() => expect(canvas.getByLabelText("Security")).toHaveTextContent(/^IWDA/));
  },
};
