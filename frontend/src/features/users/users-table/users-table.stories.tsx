import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { UserRole } from "@/lib/user-role";
import { withWidth } from "@/storybook/decorators";
import { currentUser, inactiveUser, longNameUser, memberUser, users } from "@/storybook/fixtures";
import { first } from "@/storybook/interactions";
import { UsersTable } from "./users-table";

const meta = {
  title: "Features/Users/UsersTable",
  component: UsersTable,
  parameters: { layout: "padded", route: "/users" },
  args: {
    users,
    stale: false,
    currentUserId: currentUser.id,
    onRoleChange: fn(),
    rolePendingId: null,
    onDeactivate: fn(),
    deactivatePendingId: null,
    onReactivate: fn(),
    reactivatePendingId: null,
    onResetPassword: fn(),
  },
} satisfies Meta<typeof UsersTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SelfRow: Story = { args: { users: [currentUser] } };

export const OtherRow: Story = { args: { users: [memberUser] } };

export const ViewedByAnotherAdmin: Story = { args: { currentUserId: memberUser.id } };

export const InactiveUser: Story = { args: { users: [inactiveUser] } };

export const LongNameAndEmail: Story = {
  args: {
    users: [longNameUser, { ...longNameUser, id: "long-name-admin", role: UserRole.admin }],
  },
};

export const Empty: Story = { args: { users: [] } };

export const FilteredNoMatches: Story = {
  args: { users: [] },
  parameters: { route: "/users?search=nobody&role=Admin" },
};

export const FilteredAndSorted: Story = {
  args: { users: [longNameUser, memberUser] },
  parameters: { route: "/users?role=Member&isActive=true&sort=displayName&direction=desc" },
};

export const Stale: Story = { args: { stale: true } };

export const RoleChangePending: Story = { args: { rolePendingId: memberUser.id ?? null } };

export const DeactivatePending: Story = { args: { deactivatePendingId: memberUser.id ?? null } };

export const ReactivatePending: Story = {
  args: { users: [inactiveUser], reactivatePendingId: inactiveUser.id },
};

export const OffersActionsPerRow: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const own = new RegExp(`: ${currentUser.displayName}$`, "u");
    await expect(canvas.queryAllByRole("button", { name: own })).toHaveLength(0);

    const reactivate = first(
      canvas.getAllByRole("button", {
        name: `Reactivate: ${inactiveUser.displayName}`,
      }),
    );
    await userEvent.click(reactivate);
    await expect(args.onReactivate).toHaveBeenCalledWith(inactiveUser.id);

    const deactivate = first(
      canvas.getAllByRole("button", {
        name: `Deactivate: ${memberUser.displayName}`,
      }),
    );
    await userEvent.click(deactivate);
    await expect(args.onDeactivate).toHaveBeenCalledWith(memberUser.id);

    const reset = first(
      canvas.getAllByRole("button", {
        name: `Reset password: ${memberUser.displayName}`,
      }),
    );
    await userEvent.click(reset);
    await expect(args.onResetPassword).toHaveBeenCalledWith(memberUser.id);
  },
};

export const NarrowContainer: Story = {
  decorators: [withWidth("card")],
};
