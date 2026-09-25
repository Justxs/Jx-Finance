import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getPortfolioMockHandler } from "@/api/generated/investments/investments.msw";
import { withPageFrame } from "@/storybook/decorators";
import { brokerAccount, incompletePortfolio } from "@/storybook/fixtures";
import {
  errorHandlers,
  investmentsEmptyHandlers,
  loadingHandlers,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { InvestmentsPage } from "./investments-page";

const meta = {
  title: "Features/Investments/InvestmentsPage",
  component: InvestmentsPage,
  parameters: { layout: "fullscreen", route: "/investments" },
  decorators: [withPageFrame],
} satisfies Meta<typeof InvestmentsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const FilteredByAccount: Story = {
  parameters: { route: `/investments?accountId=${brokerAccount.id}` },
};

export const Empty: Story = { parameters: { msw: { handlers: investmentsEmptyHandlers } } };

export const IncompletePrices: Story = {
  parameters: withHandlers(getPortfolioMockHandler(incompletePortfolio)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("note")).toBeInTheDocument();
    await expect(
      (await canvas.findAllByRole("button", { name: /^Set price\s*: IGN1L$/ }))[0],
    ).toBeInTheDocument();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const LoadError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Mobile: Story = {
  parameters: {
    viewport: {
      options: {
        phone: { name: "Phone 375", styles: { width: "375px", height: "812px" }, type: "mobile" },
      },
    },
  },
  globals: { viewport: { value: "phone", isRotated: false } },
};

export const OpensEntryForm: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: "Add entry" }));
    const dialog = within(await openedDialog());
    await expect(await dialog.findByLabelText("Entry type")).toBeInTheDocument();
  },
};
