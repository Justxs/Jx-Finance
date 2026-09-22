import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import {
  getDeleteSecurityPriceMockHandler,
  getSecurityPricesMockHandler,
} from "@/api/generated/investments/investments.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { RowsSkeleton } from "@/components/ui/skeleton/skeleton";
import { withWidth } from "@/storybook/decorators";
import { securityNotHeldProblem, securityPrices, worldEtf } from "@/storybook/fixtures";
import { errorHandlers, failWith, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { PriceHistory } from "./price-history";

const meta = {
  title: "Features/Investments/PriceHistory",
  component: PriceHistory,
  args: { security: worldEtf },
  decorators: [withWidth("w-[min(32rem,90vw)]")],
  render: (args) => (
    <QueryBoundary fallback={<RowsSkeleton rows={3} />} errorSubject="Price history">
      <PriceHistory {...args} />
    </QueryBoundary>
  ),
} satisfies Meta<typeof PriceHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findAllByRole("listitem")).toHaveLength(securityPrices.length);
    await expect(canvas.getByText("Last price")).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getSecurityPricesMockHandler([])),
  play: async ({ canvasElement }) => {
    await expect(await within(canvasElement).findByText("No prices recorded yet.")).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

async function confirmFirstDelete(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  const buttons = await canvas.findAllByRole("button", { name: /^Delete: / });
  const first = buttons[0];
  if (!first) {
    throw new Error("The delete button is missing.");
  }
  await userEvent.click(first);
  const dialog = within(await within(document.body).findByRole("alertdialog"));
  await expect(dialog.getByText(/VWCE/)).toBeVisible();
  await userEvent.click(dialog.getByRole("button", { name: "Delete" }));
}

export const DeletesPoint: Story = {
  play: async ({ canvasElement }) => {
    await confirmFirstDelete(canvasElement);

    await waitFor(() => expect(within(document.body).queryByRole("alertdialog")).toBeNull());
    await expect(within(canvasElement).queryByRole("alert")).toBeNull();
  },
};

export const DeleteRefused: Story = {
  parameters: withHandlers(
    getDeleteSecurityPriceMockHandler(failWith(securityNotHeldProblem, 403)),
  ),
  play: async ({ canvasElement }) => {
    await confirmFirstDelete(canvasElement);

    await expect(await within(canvasElement).findByRole("alert")).toBeVisible();
  },
};
