import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { getTaxSummaryMockHandler } from "@/api/generated/investments/investments.msw";
import { TAX_SUMMARY_EXPORT_PATH } from "@/lib/export-url";
import { withPageFrame } from "@/storybook/decorators";
import { accounts, incompleteTaxSummary } from "@/storybook/fixtures";
import { errorHandlers, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { TaxSummarySection } from "./tax-summary-section";

const meta = {
  title: "Features/Investments/TaxSummarySection",
  component: TaxSummarySection,
  args: { accounts },
  parameters: { layout: "fullscreen", route: "/investments?view=taxSummary" },
  decorators: [withPageFrame],
} satisfies Meta<typeof TaxSummarySection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Year 2026")).toBeVisible();
    await expect(canvas.getByText(/not tax advice/)).toBeVisible();
    await expect(canvas.getByRole("link", { name: /^CSV\./ })).toHaveAttribute(
      "href",
      `${TAX_SUMMARY_EXPORT_PATH}?year=2026`,
    );
    await expect(canvas.getAllByText("MSFT").length).toBeGreaterThan(0);
    await expect(canvas.getAllByText(/2025.+·\s*3\s*·/).length).toBeGreaterThan(0);
  },
};

export const Empty: Story = {
  parameters: { route: "/investments?view=taxSummary&taxYear=2024" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Year 2024")).toBeVisible();
    await expect(canvas.getAllByText("Nothing was sold in this year.").length).toBeGreaterThan(0);
  },
};

export const Incomplete: Story = {
  parameters: withHandlers(getTaxSummaryMockHandler(incompleteTaxSummary)),
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(/sold without a recorded purchase/),
    ).toBeVisible();
  },
};

export const ChoosesAccounts: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText("Year 2026");
    await userEvent.click(canvas.getByRole("button", { name: "Accounts" }));
    const body = within(document.body);
    await userEvent.click(await body.findByRole("checkbox", { name: "Taupomoji sąskaita" }));

    await expect(await canvas.findByText("Chosen: 1")).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Dark: Story = { globals: { theme: "dark" } };

export const Lithuanian: Story = { globals: { locale: "lt" } };
