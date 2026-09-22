import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getUpdateConversionMockHandler } from "@/api/generated/conversions/conversions.msw";
import {
  accounts,
  brokerAccount,
  categories,
  conversionFeeSplitProblem,
  conversionRateUnavailableProblem,
  conversionReadOnlyProblem,
  conversionWithFee,
  conversionWithoutFee,
  notFoundProblem,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { chooseOption, openedDialog } from "@/storybook/interactions";
import { ConversionEditDialog } from "./conversion-edit-dialog";

const meta = {
  title: "Features/Accounts/ConversionEditDialog",
  component: ConversionEditDialog,
  args: { accounts, categories, conversion: conversionWithFee, onClose: fn() },
} satisfies Meta<typeof ConversionEditDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

async function saveWithBought(amount: string) {
  const dialog = within(await openedDialog());
  await fireEvent.change(dialog.getByLabelText("Bought"), { target: { value: amount } });
  await userEvent.click(dialog.getByRole("button", { name: "Save" }));
  return dialog;
}

export const Default: Story = {
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(dialog.getByLabelText("Sold")).toHaveValue("2500.00");
    await expect(dialog.getByLabelText("Bought")).toHaveValue("2710.40");
    await expect(dialog.getByLabelText("Fee (optional)")).toHaveValue("2.00");
    await expect(dialog.getByRole("combobox", { name: "Fee category" })).toHaveTextContent(
      "Apsipirkimas",
    );
    await expect(dialog.getByRole("combobox", { name: "Account" })).toBeDisabled();
    await expect(dialog.getByRole("combobox", { name: "Account" })).toHaveTextContent(
      brokerAccount.name,
    );
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Closed: Story = { args: { conversion: null } };

export const WithoutFee: Story = {
  args: { conversion: conversionWithoutFee },
  play: async () => {
    const dialog = within(await openedDialog());
    await expect(dialog.getByLabelText("Fee (optional)")).toHaveValue("");
    await expect(dialog.getByRole("combobox", { name: "Fee category" })).toBeDisabled();
  },
};

export const NoCategories: Story = { args: { categories: [] } };

export const ClearsTheFee: Story = {
  play: async ({ args }) => {
    const dialog = within(await openedDialog());
    await fireEvent.change(dialog.getByLabelText("Fee (optional)"), { target: { value: "" } });
    await waitFor(() =>
      expect(dialog.getByRole("combobox", { name: "Fee category" })).toBeDisabled(),
    );
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const AddsFeeWithCategory: Story = {
  args: { conversion: conversionWithoutFee },
  play: async ({ args }) => {
    const dialog = within(await openedDialog());
    await fireEvent.change(dialog.getByLabelText("Fee (optional)"), { target: { value: "1,50" } });
    const category = dialog.getByRole("combobox", { name: "Fee category" });
    await waitFor(() => expect(category).toBeEnabled());
    await chooseOption(category, "Apsipirkimas");
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const RejectsSameCurrency: Story = {
  play: async () => {
    const dialog = within(await openedDialog());
    await chooseOption(dialog.getByRole("combobox", { name: "Bought currency" }), /^EUR/u);

    await expect(await dialog.findByText("Choose two different currencies.")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save" })).toBeDisabled();
  },
};

export const Pending: Story = {
  parameters: withHandlers(getUpdateConversionMockHandler(pending)),
  play: async () => {
    const dialog = await saveWithBought("2712");

    await waitFor(() =>
      expect(dialog.getByRole("button", { name: "Save" })).toHaveAttribute("aria-busy", "true"),
    );
  },
};

export const FeeWasSplitByHand: Story = {
  parameters: withHandlers(
    getUpdateConversionMockHandler(failWith(conversionFeeSplitProblem, 400)),
  ),
  play: async ({ args }) => {
    const dialog = await saveWithBought("2712");

    await expect(await dialog.findByText(/Change it under Transactions instead/u)).toBeVisible();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const RateUnavailable: Story = {
  parameters: withHandlers(
    getUpdateConversionMockHandler(failWith(conversionRateUnavailableProblem, 400)),
  ),
  play: async () => {
    const dialog = await saveWithBought("2712");

    await expect(await dialog.findByText(/No exchange rate for that date/u)).toBeVisible();
  },
};

export const ImportedMeanwhile: Story = {
  parameters: withHandlers(
    getUpdateConversionMockHandler(failWith(conversionReadOnlyProblem, 409)),
  ),
  play: async () => {
    const dialog = await saveWithBought("2712");

    await expect(await dialog.findByText("Imported entries cannot be edited.")).toBeVisible();
  },
};

export const ConversionNoLongerExists: Story = {
  parameters: withHandlers(getUpdateConversionMockHandler(failWith(notFoundProblem, 404))),
  play: async () => {
    const dialog = await saveWithBought("2712");

    await expect(await dialog.findByRole("alert")).toBeVisible();
  },
};
