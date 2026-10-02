import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import {
  getCreateInvestmentTransactionMockHandler,
  getSecuritiesMockHandler,
} from "@/api/generated/investments/investments.msw";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  brokerAccount,
  investmentTransactions,
  unpricedStock,
  usStock,
  worldEtf,
} from "@/storybook/fixtures";
import { pending, withHandlers } from "@/storybook/handlers";
import { type Canvas, chooseOption, openedDialog } from "@/storybook/interactions";
import { InvestmentEntryForm } from "./investment-entry-form";

const meta = {
  title: "Features/Investments/InvestmentEntryForm",
  component: InvestmentEntryForm,
  args: { accounts, accountId: brokerAccount.id, onClose: fn() },
  decorators: [withWidth("dialog")],
} satisfies Meta<typeof InvestmentEntryForm>;

export default meta;
type Story = StoryObj<typeof meta>;

async function choose(canvas: Canvas, label: string | RegExp, option: string | RegExp) {
  await chooseOption(await canvas.findByLabelText(label), option);
}

function ofType(label: string): Story {
  return { play: ({ canvas }) => choose(canvas, "Entry type", label) };
}

async function fillBuy(canvas: Canvas) {
  await choose(canvas, "Security", new RegExp(`^${worldEtf.symbol}`));
  await userEvent.type(await canvas.findByLabelText("Quantity"), "10");
  await userEvent.type(await canvas.findByLabelText("Price per share (EUR)"), "98,40");
}

export const Buy: Story = {};

export const Sell: Story = ofType("Sell");

export const Dividend: Story = ofType("Dividend");

export const WithholdingTax: Story = ofType("Withholding tax");

export const Interest: Story = ofType("Interest");

export const Fee: Story = ofType("Fee");

export const Split: Story = ofType("Split");

export const SymbolChange: Story = ofType("Symbol change");

export const Pending: Story = {
  parameters: withHandlers(getCreateInvestmentTransactionMockHandler(pending)),
  play: async ({ canvas, args }) => {
    await fillBuy(canvas);
    const submit = canvas.getByRole("button", { name: "Add entry" });
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const NoSecurities: Story = { parameters: withHandlers(getSecuritiesMockHandler([])) };

export const DefaultsToInvestmentAccount: Story = {
  args: { accountId: undefined },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Account")).toHaveTextContent(brokerAccount.name);
  },
};

export const SwitchingTypeChangesFields: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Quantity")).toBeInTheDocument();
    await expect(canvas.getByLabelText("Price per share")).toBeInTheDocument();
    await expect(canvas.queryByLabelText("Amount")).not.toBeInTheDocument();

    await choose(canvas, "Entry type", "Interest");
    await expect(canvas.queryByLabelText("Quantity")).not.toBeInTheDocument();
    await expect(canvas.queryByLabelText("Price per share")).not.toBeInTheDocument();
    await expect(await canvas.findByLabelText("Amount")).toBeInTheDocument();
    await expect(canvas.getByLabelText("Security (optional)")).toBeInTheDocument();

    await choose(canvas, "Entry type", "Split");
    await expect(await canvas.findByLabelText("New shares per old share")).toBeInTheDocument();
    await expect(canvas.getByText("2 for a 2-for-1 split.")).toBeInTheDocument();
    await expect(canvas.getByText("No cash movement")).toBeInTheDocument();
  },
};

const sent = fn();

const sentSymbolChange = fn();

export const SymbolChangeMovesTheHolding: Story = {
  parameters: withHandlers(
    getCreateInvestmentTransactionMockHandler(async ({ request }) => {
      sentSymbolChange(await request.json());
      return investmentTransactions[0]!;
    }),
  ),
  play: async ({ canvas, args }) => {
    await choose(canvas, "Entry type", "Symbol change");
    await choose(canvas, "Security", new RegExp(`^${worldEtf.symbol}`));
    await choose(canvas, "Moves to", new RegExp(`^${worldEtf.symbol}`));
    await userEvent.type(await canvas.findByLabelText("Shares moved"), "10");
    await expect(canvas.getByText("No cash movement")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Add entry" }));
    await expect(await canvas.findByText("Choose a different security.")).toBeInTheDocument();

    await choose(canvas, "Moves to", new RegExp(`^${unpricedStock.symbol}`));
    await userEvent.click(canvas.getByRole("button", { name: "Add entry" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(sentSymbolChange).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "symbolChange",
        securityId: worldEtf.id,
        relatedSecurityId: unpricedStock.id,
        quantity: "10",
        amount: null,
      }),
    );
  },
};

export const BuyShowsCashEffect: Story = {
  parameters: withHandlers(
    getCreateInvestmentTransactionMockHandler(async ({ request }) => {
      sent(await request.json());
      return investmentTransactions[0]!;
    }),
  ),
  play: async ({ canvas, args }) => {
    await fillBuy(canvas);
    await userEvent.type(canvas.getByLabelText("Fee (optional)"), "1,25");
    await expect(await canvas.findByText("−€985.25")).toBeInTheDocument();

    await userEvent.click(canvas.getByRole("button", { name: "Add entry" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "buy",
        accountId: brokerAccount.id,
        securityId: worldEtf.id,
        quantity: "10",
        price: "98.40",
        fee: "1.25",
        amount: null,
      }),
    );
  },
};

export const DividendUsesSecurityCurrency: Story = {
  play: async ({ canvas }) => {
    await choose(canvas, "Entry type", "Dividend");
    await choose(canvas, "Security", new RegExp(`^${usStock.symbol}`));
    await userEvent.type(await canvas.findByLabelText("Amount (USD)"), "9.96");
    await expect(await canvas.findByText("+$9.96")).toBeInTheDocument();
  },
};

export const ValidationErrors: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Add entry" }));
    await expect(await canvas.findByText("Choose a security.")).toBeInTheDocument();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const AddedSecurityBecomesSelected: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Add security" }));

    const dialog = within(await openedDialog());
    await userEvent.type(await dialog.findByLabelText("Symbol"), "iwda");
    await userEvent.type(dialog.getByLabelText("Name"), "iShares Core MSCI World UCITS ETF");
    await userEvent.click(dialog.getByRole("button", { name: "Add security" }));

    await waitFor(() => expect(canvas.getByLabelText("Security")).toHaveTextContent(/^IWDA/));
  },
};
