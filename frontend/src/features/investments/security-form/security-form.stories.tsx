import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor } from "storybook/test";
import {
  getCreateSecurityMockHandler,
  getUpdateSecurityMockHandler,
} from "@/api/generated/investments/investments.msw";
import { withWidth } from "@/storybook/decorators";
import { duplicateSecurityProblem, unpricedStock, usStock } from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import type { Canvas } from "@/storybook/interactions";
import { SecurityForm } from "./security-form";

const meta = {
  title: "Features/Investments/SecurityForm",
  component: SecurityForm,
  args: { onClose: fn(), onSaved: fn() },
  decorators: [withWidth("dialog")],
} satisfies Meta<typeof SecurityForm>;

export default meta;
type Story = StoryObj<typeof meta>;

async function fillNewSecurity(canvas: Canvas) {
  await userEvent.type(await canvas.findByLabelText("Symbol"), "iwda");
  await userEvent.type(canvas.getByLabelText("Name"), "iShares Core MSCI World UCITS ETF");
}

export const Create: Story = {};

export const Edit: Story = { args: { initial: usStock } };

export const EditWithoutPrice: Story = { args: { initial: unpricedStock } };

export const Pending: Story = {
  args: { initial: usStock },
  parameters: withHandlers(getUpdateSecurityMockHandler(pending)),
  play: async ({ canvas }) => {
    const submit = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(submit);
    await waitFor(() => expect(submit).toHaveAttribute("aria-busy", "true"));
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

const sent = fn();

export const SubmitsNormalisedValues: Story = {
  parameters: withHandlers(
    getCreateSecurityMockHandler(async ({ request }) => {
      sent(await request.json());
      return { ...usStock, symbol: "IWDA" };
    }),
  ),
  play: async ({ canvas, args }) => {
    await fillNewSecurity(canvas);
    await userEvent.type(canvas.getByLabelText("ISIN (optional)"), "ie00b4l5y983");
    await userEvent.type(canvas.getByLabelText("Last price (optional)"), "104,18");
    await userEvent.click(canvas.getByRole("button", { name: "Add security" }));
    await waitFor(() => expect(args.onClose).toHaveBeenCalled());
    await expect(args.onSaved).toHaveBeenCalled();
    await expect(sent).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: "IWDA",
        isin: "IE00B4L5Y983",
        type: "etf",
        lastPrice: "104.18",
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
  parameters: withHandlers(getCreateSecurityMockHandler(failWith(duplicateSecurityProblem))),
  play: async ({ canvas, args }) => {
    await fillNewSecurity(canvas);
    await userEvent.click(canvas.getByRole("button", { name: "Add security" }));
    await expect(await canvas.findByRole("alert")).toHaveTextContent("This already exists.");
    await expect(args.onClose).not.toHaveBeenCalled();
  },
};
