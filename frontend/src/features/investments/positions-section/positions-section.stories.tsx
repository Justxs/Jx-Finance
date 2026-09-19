import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { accounts } from "@/storybook/fixtures";
import {
  closedHolding,
  incompletePortfolio,
  losingHolding,
  portfolio,
} from "@/storybook/investment-fixtures";
import { PositionsSection } from "./positions-section";

const meta = {
  title: "Features/Investments/PositionsSection",
  component: PositionsSection,
  args: { holdings: portfolio.holdings, reportingCurrency: "eur", accounts },
  render: (args) => (
    <div className="w-[min(64rem,calc(100vw-5rem))]">
      <PositionsSection {...args} />
    </div>
  ),
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
