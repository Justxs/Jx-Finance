import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, screen, userEvent, waitFor } from "storybook/test";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import {
  getCreateSecurityMockHandler,
  getFindPriceSymbolMockHandler,
  getUpdateSecurityMockHandler,
} from "@/api/generated/investments/investments.msw";
import { withWidth } from "@/storybook/decorators";
import {
  duplicateSecurityProblem,
  euroCoin,
  marketPricesUnavailableProblem,
  memberUser,
  unpricedStock,
  usStock,
  worldEtf,
} from "@/storybook/fixtures";
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

export const WithPriceSource: Story = {
  args: { initial: worldEtf },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Price symbol")).toHaveValue("VWCE.XETRA");
    const find = canvas.getByRole("button", { name: /Find/u });
    await waitFor(() => expect(find).toBeEnabled());
  },
};

export const KrakenForEuroCrypto: Story = {
  args: { initial: euroCoin },
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Price symbol")).toHaveValue("XBTEUR");
    await expect(canvas.queryByRole("button", { name: /Find/u })).toBeNull();
  },
};

export const FindCandidates: Story = {
  args: { initial: { ...worldEtf, priceSymbol: "" } },
  play: async ({ canvas }) => {
    const find = await canvas.findByRole("button", { name: /Find/u });
    await waitFor(() => expect(find).toBeEnabled());
    await userEvent.click(find);
    await userEvent.click(await screen.findByRole("button", { name: /VWRP\.LSE/u }));
    await waitFor(() => expect(canvas.getByLabelText("Price symbol")).toHaveValue("VWRP.LSE"));
  },
};

export const FindError: Story = {
  args: { initial: worldEtf },
  parameters: withHandlers(getFindPriceSymbolMockHandler(failWith(marketPricesUnavailableProblem))),
  play: async ({ canvas }) => {
    const find = await canvas.findByRole("button", { name: /Find/u });
    await waitFor(() => expect(find).toBeEnabled());
    await userEvent.click(find);
    await expect(await canvas.findByRole("alert")).toHaveTextContent(
      "The price source cannot be reached right now.",
    );
  },
};

export const MemberSeesNoPriceSource: Story = {
  parameters: withHandlers(getMeMockHandler(memberUser)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByLabelText("Symbol")).toBeInTheDocument();
    await expect(canvas.queryByText("Price source")).toBeNull();
  },
};
