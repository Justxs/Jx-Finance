import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getPortfolioMockHandler } from "@/api/generated/investments/investments.msw";
import { brokerAccount } from "@/storybook/fixtures";
import {
  errorHandlers,
  handlers,
  investmentsEmptyHandlers,
  loadingHandlers,
} from "@/storybook/handlers";
import { incompletePortfolio } from "@/storybook/investment-fixtures";
import { InvestmentsPage } from "./investments-page";

function InvestmentsPageStory() {
  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      <InvestmentsPage />
    </div>
  );
}

const meta = {
  title: "Features/Investments/InvestmentsPage",
  component: InvestmentsPage,
  parameters: { layout: "fullscreen", route: "/investments" },
  render: () => <InvestmentsPageStory />,
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
  parameters: {
    msw: {
      handlers: [getPortfolioMockHandler(incompletePortfolio), ...handlers],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole("note")).toBeInTheDocument();
    await expect(
      (await canvas.findAllByRole("button", { name: /Update price: IGN1L/ }))[0],
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: "Add entry" }));
    const dialog = within(await within(document.body).findByRole("dialog"));
    await expect(await dialog.findByLabelText("Entry type")).toBeInTheDocument();
  },
};
