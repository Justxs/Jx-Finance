import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { getSetSecurityPriceMockHandler } from "@/api/generated/investments/investments.msw";
import { withWidth } from "@/storybook/decorators";
import {
  accounts,
  closedHolding,
  incompletePortfolio,
  losingHolding,
  portfolio,
  securityNotHeldProblem,
} from "@/storybook/fixtures";
import { failWith, withHandlers } from "@/storybook/handlers";
import { PositionsSection } from "./positions-section";

const meta = {
  title: "Features/Investments/PositionsSection",
  component: PositionsSection,
  args: { holdings: portfolio.holdings, reportingCurrency: "eur", accounts },
  decorators: [withWidth("w-[min(64rem,calc(100vw-5rem))]")],
} satisfies Meta<typeof PositionsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutPrice: Story = { args: { holdings: incompletePortfolio.holdings } };

export const SameSecurityOnTwoAccounts: Story = {
  args: { holdings: [...portfolio.holdings, losingHolding] },
};

export const OnlyClosedPositions: Story = { args: { holdings: [closedHolding] } };

export const Empty: Story = { args: { holdings: [] } };

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const ClosedPositionsOpen: Story = {
  tags: ["browser-only"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText("Closed positions (1)"));
    const symbols = await canvas.findAllByText("ASML");
    await expect(symbols.some((symbol) => symbol.offsetParent !== null)).toBe(true);
  },
};

export const UpdatePrice: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const buttons = await canvas.findAllByRole("button", { name: /Update price: VWCE/ });
    const visible = buttons.find((button) => button.offsetParent !== null) ?? buttons[0];
    if (!visible) {
      throw new Error("The price button is missing.");
    }
    await userEvent.click(visible);
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(await dialog.findByLabelText("Last price (EUR)")).toHaveValue("128.46");
  },
};

async function openPriceDialog(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const buttons = await canvas.findAllByRole("button", { name: /Update price: VWCE/ });
  const visible = buttons.find((button) => button.offsetParent !== null) ?? buttons[0];
  if (!visible) {
    throw new Error("The price button is missing.");
  }
  await userEvent.click(visible);
  return within(await within(document.body).findByRole("dialog"));
}

export const PriceDialogListsHistory: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openPriceDialog(canvasElement);

    await expect(await dialog.findByRole("heading", { name: "Price history" })).toBeVisible();
    await expect(await dialog.findAllByRole("button", { name: /^Delete: / })).toHaveLength(4);
  },
};

export const SavesPrice: Story = {
  play: async ({ canvasElement }) => {
    const dialog = await openPriceDialog(canvasElement);
    await fireEvent.change(await dialog.findByLabelText("Last price (EUR)"), {
      target: { value: "131.20" },
    });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(within(document.body).queryByRole("dialog")).toBeNull());
  },
};

export const PriceRefusedForSomeoneElsesSecurity: Story = {
  parameters: withHandlers(getSetSecurityPriceMockHandler(failWith(securityNotHeldProblem))),
  play: async ({ canvasElement }) => {
    const dialog = await openPriceDialog(canvasElement);
    await fireEvent.change(await dialog.findByLabelText("Last price (EUR)"), {
      target: { value: "131.20" },
    });
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));

    await expect(await dialog.findByText(/Only someone who holds this security/u)).toBeVisible();
  },
};
