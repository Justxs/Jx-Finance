import type { Meta, StoryObj } from "@storybook/react-vite";
import { withWidth } from "@/storybook/decorators";
import { emptyPortfolio, incompletePortfolio, portfolio } from "@/storybook/fixtures";
import { PortfolioSummary } from "./portfolio-summary";

const meta = {
  title: "Features/Investments/PortfolioSummary",
  component: PortfolioSummary,
  args: { portfolio },
  decorators: [withWidth("full")],
} satisfies Meta<typeof PortfolioSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Incomplete: Story = { args: { portfolio: incompletePortfolio } };

export const Losses: Story = {
  args: { portfolio: { ...portfolio, unrealizedGain: "-412.80", realizedGain: "-96.15" } },
};

export const AllZero: Story = { args: { portfolio: emptyPortfolio } };

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };
