import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { currentUser, inactiveUser, longNameUser, memberUser, users } from "@/storybook/fixtures";
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
  args: { users: [longNameUser, { ...longNameUser, id: "long-name-admin", role: "Admin" }] },
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

export const NarrowContainer: Story = {
  render: (args) => (
    <div className="w-80">
      <UsersTable {...args} />
    </div>
  ),
};
