import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { ApiError } from "@/api/client";
import {
  categories,
  ids,
  receiptReading,
  receiptReadingMisread,
  receiptReadingOneCategory,
  receiptReadingPdf,
  receiptReadingRemembered,
  receiptReadingReturn,
  receiptReadingUnreadLines,
  receiptReadingWithCandidate,
} from "@/storybook/fixtures";
import { chooseOption, openedDialog } from "@/storybook/interactions";
import { ReceiptReview } from "./receipt-review";

const readAgainFailed = new ApiError({
  status: 400,
  title: "One or more validation errors occurred.",
  errors: [
    {
      name: "generalErrors",
      reason: "No items or total could be read.",
      code: "receipt.unreadable",
    },
  ],
});

const meta = {
  title: "Features/Transactions/ReceiptReview",
  component: ReceiptReview,
  args: {
    reading: receiptReading,
    categories,
    amount: "18.21",
    currency: "eur",
    pending: false,
    readAgainPending: false,
    onApply: fn(),
    onReadAgain: fn(),
    onClose: fn(),
  },
} satisfies Meta<typeof ReceiptReview>;

export default meta;
type Story = StoryObj<typeof meta>;

async function linesText() {
  const dialog = await openedDialog();
  return dialog.textContent ?? "";
}

export const Default: Story = {
  play: async ({ args }) => {
    await openedDialog();
    await expect(
      screen.getByRole("heading", { name: /Receipt from MAXIMA LT, UAB/u }),
    ).toBeVisible();
    const text = await linesText();
    await expect(text).toMatch(/Maistas €10\.15 · Sveikata €8\.06 · €18\.21/u);
    await expect(text).not.toMatch(/this payment/u);
    await userEvent.click(screen.getByRole("button", { name: "Use these lines" }));
    await expect(args.onApply).toHaveBeenCalledWith([
      ids.categories.food,
      ids.categories.food,
      ids.categories.food,
      ids.categories.food,
      ids.categories.food,
      ids.categories.health,
      ids.categories.health,
    ]);
  },
};

export const PaymentDiffersFromTheReceipt: Story = {
  args: { amount: "18.31" },
  play: async () => {
    const text = await linesText();
    await expect(text).toMatch(/Maistas €10\.21 · Sveikata €8\.10 · €18\.31/u);
    await expect(text).toMatch(/Receipt €18\.21, this payment €18\.31; the lines are scaled/u);
  },
};

export const ItemsDifferFromThePrintedTotal: Story = {
  args: { reading: receiptReadingMisread },
  play: async () => {
    await expect(await linesText()).toMatch(
      /The items add up to €18\.11, the receipt says €18\.21/u,
    );
  },
};

export const OneCategory: Story = {
  args: { reading: receiptReadingOneCategory, amount: "10.43" },
  play: async () => {
    await expect(await linesText()).toMatch(/Maistas · €10\.43/u);
  },
};

export const AllRemembered: Story = {
  args: { reading: receiptReadingRemembered },
  play: async () => {
    await openedDialog();
    await expect(screen.getAllByText("Remembered")).toHaveLength(7);
  },
};

export const MovingAnItemChangesTheLines: Story = {
  play: async () => {
    await openedDialog();
    await chooseOption(screen.getByRole("combobox", { name: /Category of Colgate/u }), "Maistas");
    await waitFor(async () =>
      expect(await linesText()).toMatch(/Maistas €13\.55 · Sveikata €4\.66/u),
    );
  },
};

export const ReturnReceipt: Story = {
  args: { reading: receiptReadingReturn, amount: "4.79" },
  play: async () => {
    await openedDialog();
    await expect(screen.getByRole("alert")).toHaveTextContent(
      "Return receipts cannot be split yet.",
    );
    await expect(screen.getByRole("button", { name: "Use these lines" })).toBeDisabled();
  },
};

export const PdfPagesCut: Story = {
  args: { reading: receiptReadingPdf },
  play: async () => {
    await expect(await linesText()).toMatch(/Only the first 3 of 7 pages were read\./u);
  },
};

export const AlreadyInTheLedger: Story = {
  args: { reading: receiptReadingWithCandidate, onSplitCandidate: fn() },
  play: async ({ args }) => {
    await openedDialog();
    await expect(screen.getByText(/MAXIMA LT, UAB VILNIUS/u)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Split that payment instead" }));
    await expect(args.onSplitCandidate).toHaveBeenCalled();
  },
};

export const ReadingAgain: Story = {
  args: { readAgainPending: true },
  play: async () => {
    await openedDialog();
    await expect(screen.getByRole("button", { name: "Use these lines" })).toBeDisabled();
  },
};

export const ReadAgainFailed: Story = {
  args: { error: readAgainFailed },
  play: async () => {
    await openedDialog();
    await expect(screen.getByRole("alert")).toHaveTextContent(/No items or total could be read/u);
  },
};

export const UnreadLines: Story = {
  args: { reading: receiptReadingUnreadLines },
  play: async () => {
    await openedDialog();
    const unread = screen.getByRole("region", { name: "Lines that could not be read" });
    await expect(unread).toHaveTextContent("Kiausiniai M 10 vnt Z,19 A");
    await expect(await linesText()).toMatch(/The items add up to €18.21, the receipt says €20.40/u);
  },
};

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  args: { amount: "18.31" },
  play: async () => {
    await openedDialog();
    await expect(screen.getByRole("button", { name: "Naudoti šias eilutes" })).toBeVisible();
    await expect(await linesText()).toMatch(/eilutės perskaičiuotos pagal mokėjimą/u);
  },
};
