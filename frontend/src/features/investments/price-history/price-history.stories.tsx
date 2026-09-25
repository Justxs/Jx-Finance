import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";
import {
  getDeleteSecurityPriceMockHandler,
  getSecurityPricesMockHandler,
} from "@/api/generated/investments/investments.msw";
import { withWidth } from "@/storybook/decorators";
import { securityNotHeldProblem, securityPrices, worldEtf } from "@/storybook/fixtures";
import { errorHandlers, failWith, loadingHandlers, withHandlers } from "@/storybook/handlers";
import { openedDialog, type Canvas } from "@/storybook/interactions";
import { PriceHistory } from "./price-history";

const meta = {
  title: "Features/Investments/PriceHistory",
  component: PriceHistory,
  args: { security: worldEtf },
  decorators: [withWidth("form")],
} satisfies Meta<typeof PriceHistory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findAllByRole("listitem")).toHaveLength(securityPrices.length);
    await expect(canvas.getByText("Last price")).toBeVisible();
  },
};

export const Empty: Story = {
  parameters: withHandlers(getSecurityPricesMockHandler([])),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("No prices recorded yet.")).toBeVisible();
  },
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const Lithuanian: Story = { globals: { locale: "lt" } };

async function confirmFirstDelete(canvas: Canvas) {
  const buttons = await canvas.findAllByRole("button", { name: /^Delete: / });
  const first = buttons[0];
  if (!first) {
    throw new Error("The delete button is missing.");
  }
  await userEvent.click(first);
  const dialog = within(await openedDialog("alertdialog"));
  await expect(dialog.getByText(/VWCE/)).toBeVisible();
  await userEvent.click(dialog.getByRole("button", { name: "Delete" }));
}

export const DeletesPoint: Story = {
  play: async ({ canvas }) => {
    await confirmFirstDelete(canvas);

    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    await expect(canvas.queryByRole("alert")).toBeNull();
  },
};

export const DeleteRefused: Story = {
  parameters: withHandlers(getDeleteSecurityPriceMockHandler(failWith(securityNotHeldProblem))),
  play: async ({ canvas }) => {
    await confirmFirstDelete(canvas);

    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};
