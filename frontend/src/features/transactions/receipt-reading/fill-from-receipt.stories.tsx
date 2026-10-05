import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import type { ProblemDetails } from "@/api/generated/model";
import { getReadReceiptMockHandler } from "@/api/generated/receipts/receipts.msw";
import { getSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { TransactionForm } from "@/features/transactions/transaction-form/transaction-form";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  categories,
  ids,
  receiptEngineUnavailableProblem,
  receiptReadingWithCandidate,
  receiptReadingReturn,
  receiptReadingWithPhotoLocation,
  receiptUnreadableProblem,
  receiptUnsupportedFileProblem,
  settingsWith,
  tags,
  transactions,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { first, openedDialog } from "@/storybook/interactions";

const readySettings = getSettingsMockHandler(
  settingsWith({ receiptReadingReady: true, features: { receiptReading: true } }),
);

const maximaPayment = transactions.find((item) => item.id === ids.transactions.maxima);

function receiptPhoto() {
  return new File([new Uint8Array([0xff, 0xd8, 0xff, 0xe0])], "maxima.jpg", { type: "image/jpeg" });
}

async function pickReceipt() {
  await userEvent.upload(await screen.findByLabelText(/Fill from receipt/u), receiptPhoto());
}

function failingRead(problem: ProblemDetails) {
  return withHandlers(readySettings, getReadReceiptMockHandler(failWith(problem)));
}

const meta = {
  title: "Features/Transactions/FillFromReceipt",
  component: TransactionForm,
  args: { accounts, categories, tags, pending: false, onSubmit: fn(), onCancel: fn() },
  decorators: [withWidth("w-[min(42rem,90vw)]")],
  parameters: withHandlers(readySettings),
} satisfies Meta<typeof TransactionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadsAPickedFile: Story = {
  args: { onReceiptFile: fn() },
  play: async ({ canvas, args }) => {
    await pickReceipt();
    await openedDialog();
    await userEvent.click(screen.getByRole("button", { name: "Use these lines" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(args.onReceiptFile).toHaveBeenCalled();
    await expect(canvas.getByRole("checkbox", { name: "Split into categories" })).toBeChecked();
    await expect(canvas.getByLabelText("Description")).toHaveValue("MAXIMA LT, UAB");
    const [amount, food, health] = canvas.getAllByLabelText(/^Amount(, line \d+)?$/u);
    await expect(amount).toHaveValue("18.21");
    await expect(food).toHaveValue("10.15");
    await expect(health).toHaveValue("8.06");
  },
};

export const ReadsAnEmailReceiptWithoutAttachingIt: Story = {
  args: { onReceiptFile: fn() },
  play: async ({ canvas, args }) => {
    await userEvent.upload(
      await screen.findByLabelText(/Fill from receipt/u),
      new File(["<p>MAXIMA LT, UAB</p>"], "maxima.html", { type: "text/html" }),
    );
    await openedDialog();
    await userEvent.click(screen.getByRole("button", { name: "Use these lines" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(args.onReceiptFile).toHaveBeenCalledWith(null);
    await expect(canvas.getByLabelText("Description")).toHaveValue("MAXIMA LT, UAB");
  },
};

export const FillsARefundFromAReturnReceipt: Story = {
  parameters: withHandlers(readySettings, getReadReceiptMockHandler(receiptReadingReturn)),
  play: async ({ canvas }) => {
    await pickReceipt();
    await openedDialog();
    await userEvent.click(screen.getByRole("button", { name: "Fill as a refund" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await expect(canvas.getByText(/Refund of MAXIMA LT, UAB VILNIUS/u)).toBeVisible();
    await expect(canvas.getByLabelText("Description")).toHaveValue("MAXIMA LT, UAB VILNIUS");
    await expect(canvas.getByLabelText("Amount")).toHaveValue("4.79");
    await expect(canvas.queryByRole("checkbox", { name: "Split into categories" })).toBeNull();
  },
};

export const ReadsTheAttachedReceipt: Story = {
  args: { initial: maximaPayment },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("combobox", { name: "Receipt file" })).toHaveTextContent(
      "maxima-kvitas.jpg",
    );
    await userEvent.click(canvas.getByRole("button", { name: /Fill from receipt/u }));
    await openedDialog();
    await expect(await screen.findByText(/Receipt €18\.21, this payment €42\.18/u)).toBeVisible();
    await userEvent.click(screen.getByRole("button", { name: "Use these lines" }));
    await waitFor(() =>
      expect(canvas.getByRole("checkbox", { name: "Split into categories" })).toBeChecked(),
    );
  },
};

export const FillsThePlaceAndOffersThePhotoLocation: Story = {
  parameters: withHandlers(
    getSettingsMockHandler(
      settingsWith({
        receiptReadingReady: true,
        features: { receiptReading: true, locations: true },
      }),
    ),
    getReadReceiptMockHandler(receiptReadingWithPhotoLocation),
  ),
  play: async ({ canvas }) => {
    await pickReceipt();
    await openedDialog();
    await userEvent.click(screen.getByRole("button", { name: "Use these lines" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await expect(canvas.getByRole("combobox", { name: "Place" })).toHaveValue(
      "MAXIMA LT, UAB, Savanorių pr. 247, LT-02300 Vilnius",
    );
    await expect(canvas.queryByText(/Location saved/u)).toBeNull();

    await userEvent.click(canvas.getByRole("button", { name: "Use the photo's location" }));
    await expect(await canvas.findByText(/Location saved/u)).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Use the photo's location" })).toBeNull();
  },
};

export const Reading: Story = {
  parameters: withHandlers(readySettings, getReadReceiptMockHandler(pending)),
  play: async ({ canvas }) => {
    await pickReceipt();
    await expect(
      await canvas.findByText("Reading the receipt, this takes a few seconds."),
    ).toBeVisible();
    await userEvent.click(first(canvas.getAllByRole("button", { name: "Cancel" })));
    await waitFor(() =>
      expect(canvas.queryByText("Reading the receipt, this takes a few seconds.")).toBeNull(),
    );
  },
};

export const AlreadyInTheLedger: Story = {
  args: { onSplitCandidate: fn() },
  parameters: withHandlers(readySettings, getReadReceiptMockHandler(receiptReadingWithCandidate)),
  play: async ({ args }) => {
    await pickReceipt();
    await openedDialog();
    await userEvent.click(screen.getByRole("button", { name: "Split that payment instead" }));
    await waitFor(() => expect(args.onSplitCandidate).toHaveBeenCalled());
  },
};

export const Unreadable: Story = {
  parameters: failingRead(receiptUnreadableProblem),
  play: async ({ canvas }) => {
    await pickReceipt();
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/sharper, straight photo/u);
  },
};

export const UnsupportedFile: Story = {
  parameters: failingRead(receiptUnsupportedFileProblem),
  play: async ({ canvas }) => {
    await pickReceipt();
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      /cannot be read as a receipt/u,
    );
  },
};

export const EngineUnavailable: Story = {
  parameters: failingRead(receiptEngineUnavailableProblem),
  play: async ({ canvas }) => {
    await pickReceipt();
    await expect(await canvas.findByRole("alert")).toHaveTextContent(/no Tesseract/u);
  },
};

export const HiddenUntilReady: Story = {
  parameters: withHandlers(getSettingsMockHandler(settingsWith({ receiptReadingReady: false }))),
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Description")).toBeVisible();
    await expect(canvas.queryByLabelText(/Fill from receipt/u)).toBeNull();
  },
};

export const Lithuanian: Story = {
  globals: { locale: "lt" },
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Užpildyti iš kvito")).toBeVisible();
  },
};
