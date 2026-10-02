import type { Meta, StoryObj } from "@storybook/react-vite";
import { screen, userEvent, within } from "storybook/test";
import {
  getDeleteDebtMockHandler,
  getDebtsMockHandler,
} from "@/api/generated/net-worth/net-worth.msw";
import { withWidth } from "@/storybook/decorators";
import { debts, many } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { DebtsSection } from "./debts-section";

const manyItems = many(debts, 15);

const meta = {
  title: "Features/NetWorth/DebtsSection",
  component: DebtsSection,
  parameters: { route: "/net-worth" },
  decorators: [withWidth("wide")],
} satisfies Meta<typeof DebtsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const LongList: Story = {
  parameters: withHandlers(getDebtsMockHandler(manyItems)),
};

export const AddDialogOpen: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(await canvas.findByRole("button", { name: /add debt|pridėti skolą/i }));
    await openedDialog();
  },
};

export const DeletePending: Story = {
  parameters: withHandlers(getDeleteDebtMockHandler(pending)),
  play: async ({ canvas }) => {
    const menus = await canvas.findAllByRole("button", { name: /^(actions|veiksmai):/i });
    await userEvent.click(menus[0]!);
    await userEvent.click(await screen.findByRole("menuitem", { name: /^(delete|ištrinti)$/i }));
    const dialog = await openedDialog("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: /delete|ištrinti/i }));
  },
};
