import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { ApiError } from "@/api/client";
import { withWidth } from "@/storybook/decorators";
import { duplicateSecurityProblem, unpricedStock, usStock } from "@/storybook/fixtures";
import { SecurityForm } from "./security-form";

const meta = {
  title: "Features/Investments/SecurityForm",
  component: SecurityForm,
  args: { pending: false, onSubmit: fn(), onCancel: fn() },
  decorators: [withWidth("w-[min(36rem,90vw)]")],
} satisfies Meta<typeof SecurityForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Create: Story = {};

export const Edit: Story = { args: { initial: usStock } };

export const EditWithoutPrice: Story = { args: { initial: unpricedStock } };

export const Pending: Story = { args: { initial: usStock, pending: true } };

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const SubmitsNormalisedValues: Story = {
  play: async ({ canvas, args }) => {
    await userEvent.type(await canvas.findByLabelText("Symbol"), "iwda");
    await userEvent.type(canvas.getByLabelText("Name"), "iShares Core MSCI World UCITS ETF");
    await userEvent.type(canvas.getByLabelText("ISIN (optional)"), "ie00b4l5y983");
    await userEvent.type(canvas.getByLabelText("Last price (optional)"), "104,18");
    await userEvent.click(canvas.getByRole("button", { name: "Add security" }));
    await expect(args.onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "IWDA",
        isin: "IE00B4L5Y983",
        type: "etf",
        lastPrice: "104,18",
        lastPriceDate: null,
      }),
    );
  },
};

export const InvalidIsin: Story = {
  play: async ({ canvas }) => {
    await userEvent.type(await canvas.findByLabelText("ISIN (optional)"), "NOT-AN-ISIN");
    await userEvent.tab();
    await expect(await canvas.findByText(/Enter a valid ISIN/)).toBeInTheDocument();
  },
};

export const SymbolAlreadyExists: Story = {
  args: { error: new ApiError(duplicateSecurityProblem) },
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("alert")).toHaveTextContent("This already exists.");
  },
};
