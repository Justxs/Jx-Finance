import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect } from "storybook/test";
import { getCreateAccountMockHandler } from "@/api/generated/accounts/accounts.msw";
import { withPageFrame } from "@/storybook/decorators";
import { ids } from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { openedDialog } from "@/storybook/interactions";
import { AccountsPage } from "./accounts-page";

const meta = {
  title: "Features/Accounts/AccountsPage",
  component: AccountsPage,
  parameters: { layout: "fullscreen", route: "/accounts" },
  decorators: [withPageFrame],
} satisfies Meta<typeof AccountsPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FilteredByType: Story = { parameters: { route: "/accounts?type=savings" } };

export const SortedByBalance: Story = {
  parameters: { route: "/accounts?sort=currentBalance&direction=desc" },
};

export const NoSearchMatches: Story = {
  parameters: { route: "/accounts?search=does-not-exist" },
};

export const Empty: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const CreatePending: Story = {
  parameters: withHandlers(getCreateAccountMockHandler(pending)),
};

export const ReconcileFromLink: Story = {
  parameters: { route: `/accounts?reconcile=${ids.accounts.checking}` },
  play: async () => {
    const dialog = await openedDialog();
    await expect(dialog).toHaveAccessibleName("Reconcile Swedbank einamoji");
  },
};
