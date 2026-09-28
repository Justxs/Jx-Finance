import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  getAssetValuationsMockHandler,
  getAssetValueHistoryMockHandler,
  getAssetsMockHandler,
  getDeleteAssetValuationMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { withPageFrame } from "@/storybook/decorators";
import {
  assets,
  fullyDepreciatedAsset,
  ids,
  lastValuationProblem,
  serverErrorProblem,
} from "@/storybook/fixtures";
import {
  errorHandlers,
  failWith,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { AssetPage } from "./asset-page";

const meta = {
  title: "Features/NetWorth/AssetPage",
  component: AssetPage,
  args: { assetId: ids.assets.car },
  parameters: { layout: "fullscreen", route: "/net-worth/assets/story" },
  decorators: [withPageFrame],
} satisfies Meta<typeof AssetPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Depreciating: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByRole("heading", { name: "Toyota Corolla 2021" })).toBeVisible();
    await expect(await canvas.findByText("Technical inspection")).toBeVisible();
    await expect(canvas.getByText("Purchase price")).toBeVisible();
  },
};

export const ManualOnly: Story = { args: { assetId: ids.assets.apartment } };

export const FullyDepreciated: Story = {
  args: { assetId: fullyDepreciatedAsset.id },
  parameters: withHandlers(getAssetsMockHandler([...assets, fullyDepreciatedAsset])),
};

export const SingleValuation: Story = { args: { assetId: ids.assets.investments } };

export const UnknownAsset: Story = { args: { assetId: ids.assets.watch } };

export const AddingValuation: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /add valuation/i }));
    await openedDialog();
  },
};

export const LastValuationRefused: Story = {
  args: { assetId: ids.assets.investments },
  parameters: withHandlers(getDeleteAssetValuationMockHandler(failWith(lastValuationProblem))),
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /^Delete: / }));
    const dialog = within(await openedDialog("alertdialog"));
    await userEvent.click(dialog.getByRole("button", { name: "Delete" }));
    await expect(await canvas.findByRole("alert")).toBeVisible();
  },
};

export const Lithuanian: Story = { globals: { locale: "lt" } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ValuationsLoading: Story = {
  parameters: withHandlers(getAssetValuationsMockHandler(pending)),
};

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const ChartFails: Story = {
  parameters: withHandlers(getAssetValueHistoryMockHandler(failWith(serverErrorProblem))),
};
