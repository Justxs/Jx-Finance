import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor } from "storybook/test";
import { getUpdateConversionMockHandler } from "@/api/generated/conversions/conversions.msw";
import { withWidth } from "@/storybook/decorators";
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
import { type Canvas, chooseOption } from "@/storybook/interactions";
import { ConversionForm } from "./conversion-form";

const meta = {
  title: "Features/Accounts/ConversionForm/Edit",
  component: ConversionForm,
  args: { accounts, categories, conversion: conversionWithFee, onClose: fn() },
  decorators: [withWidth("dialog")],
} satisfies Meta<typeof ConversionForm>;

export default meta;
type Story = StoryObj<typeof meta>;

async function saveWithBought(canvas: Canvas, amount: string) {
  await fireEvent.change(canvas.getByLabelText("Bought"), { target: { value: amount } });
  await userEvent.click(canvas.getByRole("button", { name: "Save" }));
}

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Sold")).toHaveValue("2500.00");
    await expect(canvas.getByLabelText("Bought")).toHaveValue("2710.40");
    await expect(canvas.getByLabelText("Fee (optional)")).toHaveValue("2.00");
    await expect(canvas.getByRole("combobox", { name: "Fee category" })).toHaveTextContent(
      "Apsipirkimas",
    );
    await expect(canvas.getByRole("combobox", { name: "Account" })).toBeDisabled();
    await expect(canvas.getByRole("combobox", { name: "Account" })).toHaveTextContent(
      brokerAccount.name,
    );
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const WithoutFee: Story = {
  args: { conversion: conversionWithoutFee },
  play: async ({ canvas }) => {
    await expect(canvas.getByLabelText("Fee (optional)")).toHaveValue("");
    await expect(canvas.getByRole("combobox", { name: "Fee category" })).toBeDisabled();
  },
};

export const NoCategories: Story = { args: { categories: [] } };

export const ClearsTheFee: Story = {
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByLabelText("Fee (optional)"), { target: { value: "" } });
    await waitFor(() =>
      expect(canvas.getByRole("combobox", { name: "Fee category" })).toBeDisabled(),
    );
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const AddsFeeWithCategory: Story = {
  args: { conversion: conversionWithoutFee },
  play: async ({ canvas, args }) => {
    await fireEvent.change(canvas.getByLabelText("Fee (optional)"), { target: { value: "1,50" } });
    const category = canvas.getByRole("combobox", { name: "Fee category" });
    await waitFor(() => expect(category).toBeEnabled());
    await chooseOption(category, "Apsipirkimas");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
  },
};

export const RejectsSameCurrency: Story = {
  play: async ({ canvas }) => {
    await chooseOption(canvas.getByRole("combobox", { name: "Bought currency" }), /^EUR/u);

    await expect(await canvas.findByText("Choose two different currencies.")).toBeVisible();
    await expect(canvas.getByRole("button", { name: "Save" })).toBeDisabled();
  },
};

export const Pending: Story = {
  parameters: withHandlers(getUpdateConversionMockHandler(pending)),
  play: async ({ canvas }) => {
    await saveWithBought(canvas, "2712");

    await waitFor(() =>
      expect(canvas.getByRole("button", { name: "Save" })).toHaveAttribute("aria-busy", "true"),
    );
  },
};

export const FeeWasSplitByHand: Story = {
  parameters: withHandlers(getUpdateConversionMockHandler(failWith(conversionFeeSplitProblem))),
  play: async ({ canvas, args }) => {
    await saveWithBought(canvas, "2712");

    await expect(await canvas.findByText(/Change it under Transactions instead/u)).toBeVisible();
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};

export const RateUnavailable: Story = {
  parameters: withHandlers(
    getUpdateConversionMockHandler(failWith(conversionRateUnavailableProblem)),
  ),
  play: async ({ canvas }) => {
    await saveWithBought(canvas, "2712");

    await expect(await canvas.findByText(/No exchange rate for that date/u)).toBeVisible();
  },
};

export const ImportedMeanwhile: Story = {
  parameters: withHandlers(getUpdateConversionMockHandler(failWith(conversionReadOnlyProblem))),
  play: async ({ canvas }) => {
    await saveWithBought(canvas, "2712");

    await expect(await canvas.findByText("Imported entries cannot be edited.")).toBeVisible();
  },
};

export const ConversionNoLongerExists: Story = {
  parameters: withHandlers(getUpdateConversionMockHandler(failWith(notFoundProblem))),
  play: async ({ canvas }) => {
    await saveWithBought(canvas, "2712");

    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};
