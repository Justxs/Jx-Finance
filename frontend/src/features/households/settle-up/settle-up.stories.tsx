import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getSettleUpMockHandler } from "@/api/generated/households/households.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { withWidth } from "@/storybook/decorators";
import {
  evenSettleUp,
  familyHousehold,
  memberUser,
  serverErrorProblem,
  settleUp,
} from "@/storybook/fixtures";
import { failWith, pending, withHandlers } from "@/storybook/handlers";
import { first, openedDialog } from "@/storybook/interactions";
import { SettleUpSection, SettleUpSkeleton } from "./settle-up";

const meta = {
  title: "Features/Households/SettleUpSection",
  component: SettleUpSection,
  parameters: { layout: "padded", route: "/households" },
  args: { household: familyHousehold },
  decorators: [withWidth("panel")],
  render: (args) => (
    <QueryBoundary fallback={<SettleUpSkeleton />}>
      <SettleUpSection {...args} />
    </QueryBoundary>
  ),
} satisfies Meta<typeof SettleUpSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("You are owed €42.50")).toBeVisible();
    await expect(canvas.getByText(`${memberUser.displayName} owes €42.50`)).toBeVisible();
    await expect(canvas.getByText(/^You owe \S*12\.00$/u)).toBeVisible();
    await expect(canvas.getAllByRole("button", { name: "Record payment" })).toHaveLength(2);
  },
};

export const RecordPayment: Story = {
  play: async ({ canvas }) => {
    await userEvent.click(first(await canvas.findAllByRole("button", { name: "Record payment" })));
    const dialog = await openedDialog();
    await userEvent.click(await within(dialog).findByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
  },
};

export const FormerMember: Story = {
  parameters: withHandlers(
    getSettleUpMockHandler({
      ...settleUp,
      balances: settleUp.balances.map((balance) => ({
        ...balance,
        isMember: balance.userId !== memberUser.id,
      })),
    }),
  ),
  play: async ({ canvas }) => {
    await expect((await canvas.findAllByText("Former member")).length).toBeGreaterThan(0);
  },
};

export const Even: Story = {
  parameters: withHandlers(getSettleUpMockHandler(evenSettleUp)),
  play: async ({ canvas }) => {
    await expect(await canvas.findByText("Everyone is even.")).toBeVisible();
    await expect(canvas.queryByRole("button", { name: "Record payment" })).toBeNull();
  },
};

export const Loading: Story = {
  parameters: withHandlers(getSettleUpMockHandler(pending)),
};

export const Failed: Story = {
  parameters: withHandlers(getSettleUpMockHandler(failWith(serverErrorProblem))),
};

export const Lithuanian: Story = { globals: { locale: "lt" } };
