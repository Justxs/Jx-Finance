import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import {
  getDeleteAssetMockHandler,
  getAssetsMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import { assets, many } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { AssetsSection } from "./assets-section";

const manyItems = many(assets, 15);

const meta = {
  title: "Features/NetWorth/AssetsSection",
  component: AssetsSection,
  parameters: { route: "/net-worth" },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof AssetsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const LongList: Story = {
  parameters: withHandlers(getAssetsMockHandler(manyItems)),
};

export const AddDialogOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /add asset|pridėti turtą/i }));
    await openedDialog();
  },
};

export const DeletePending: Story = {
  parameters: withHandlers(getDeleteAssetMockHandler(pending)),
  play: async ({ canvas }) => {
    const deleteButtons = await canvas.findAllByRole("button", {
      name: /^(delete|ištrinti)(:|$)/i,
    });
    await userEvent.click(deleteButtons[0]!);
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
