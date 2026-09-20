import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { ApiError } from "@/api/client";
import { duplicateSecurityProblem, unpricedStock, usStock } from "@/storybook/investment-fixtures";
import { SecurityForm } from "./security-form";

const meta = {
  title: "Features/Investments/SecurityForm",
  component: SecurityForm,
  args: { pending: false, onSubmit: fn(), onCancel: fn() },
  render: (args) => (
    <div className="w-[min(36rem,90vw)]">
      <SecurityForm {...args} />
    </div>
  ),
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
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(await canvas.findByLabelText("ISIN (optional)"), "NOT-AN-ISIN");
    await userEvent.tab();
    await expect(await canvas.findByText(/Enter a valid ISIN/)).toBeInTheDocument();
  },
};

export const SymbolAlreadyExists: Story = {
  args: {
    error: new ApiError({
      status: 409,
      title: duplicateSecurityProblem.title ?? undefined,
      code: duplicateSecurityProblem.code,
    }),
  },
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByRole("alert")).toHaveTextContent(
      "This already exists.",
    );
  },
};
