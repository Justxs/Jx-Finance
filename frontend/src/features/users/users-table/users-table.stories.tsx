import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import {
  getDeactivateUserMockHandler,
  getReactivateUserMockHandler,
  getUpdateUserRoleMockHandler,
} from "@/api/generated/users/users.msw";
import { UserRole } from "@/lib/user-role";
import { withWidth } from "@/storybook/decorators";
import { currentUser, inactiveUser, longNameUser, memberUser, users } from "@/storybook/fixtures";
import { pending, withHandlers } from "@/storybook/handlers";
import { chooseOption, first, openedDialog } from "@/storybook/interactions";
import { UsersTable } from "./users-table";

const meta = {
  title: "Features/Users/UsersTable",
  component: UsersTable,
  parameters: { layout: "padded", route: "/users" },
  args: { users, stale: false },
} satisfies Meta<typeof UsersTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SelfRow: Story = { args: { users: [currentUser] } };

export const OtherRow: Story = { args: { users: [memberUser] } };

export const ViewedByAnotherAdmin: Story = {
  parameters: withHandlers(getMeMockHandler({ ...memberUser, role: UserRole.admin })),
};

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

export const RoleChangePending: Story = {
  parameters: withHandlers(getUpdateUserRoleMockHandler(pending)),
  play: async ({ canvas }) => {
    const role = first(
      await canvas.findAllByRole("combobox", {
        name: new RegExp(`${memberUser.displayName}$`, "u"),
      }),
    );
    await chooseOption(role, "Admin");
    await waitFor(() => expect(role).toHaveAttribute("aria-busy", "true"));
  },
};

export const DeactivatePending: Story = {
  parameters: withHandlers(getDeactivateUserMockHandler(pending)),
  play: async ({ canvas }) => {
    const deactivate = first(
      await canvas.findAllByRole("button", { name: `Deactivate: ${memberUser.displayName}` }),
    );
    await userEvent.click(deactivate);
    const confirm = within(await openedDialog("alertdialog"));
    await userEvent.click(confirm.getByRole("button", { name: "Deactivate" }));
    await waitFor(() => expect(deactivate).toHaveAttribute("aria-busy", "true"));
  },
};

export const ReactivatePending: Story = {
  args: { users: [inactiveUser] },
  parameters: withHandlers(getReactivateUserMockHandler(pending)),
  play: async ({ canvas }) => {
    const reactivate = first(
      await canvas.findAllByRole("button", { name: `Reactivate: ${inactiveUser.displayName}` }),
    );
    await userEvent.click(reactivate);
    await waitFor(() => expect(reactivate).toHaveAttribute("aria-busy", "true"));
  },
};

export const OffersActionsPerRow: Story = {
  play: async ({ canvas }) => {
    await canvas.findAllByRole("button", { name: `Reset password: ${memberUser.displayName}` });
    const own = new RegExp(`: ${currentUser.displayName}$`, "u");
    await expect(canvas.queryAllByRole("button", { name: own })).toHaveLength(0);

    await userEvent.click(
      first(canvas.getAllByRole("button", { name: `Deactivate: ${memberUser.displayName}` })),
    );
    const confirm = within(await openedDialog("alertdialog"));
    await expect(confirm.getByText(memberUser.displayName)).toBeVisible();
    await userEvent.click(confirm.getByRole("button", { name: "Cancel" }));

    await userEvent.click(
      first(canvas.getAllByRole("button", { name: `Reset password: ${memberUser.displayName}` })),
    );
    await expect(
      within(await openedDialog()).getByText("Set a temporary password"),
    ).toBeInTheDocument();
  },
};

export const FiltersWithoutTheTableHeader: Story = {
  play: async ({ canvas }) => {
    const filters = within(await canvas.findByRole("group", { name: "Filters" }));
    const role = filters.getByRole("combobox", { name: "Role" });
    await chooseOption(role, "Admin");
    await waitFor(() => expect(role).toHaveTextContent("Admin"));

    const status = filters.getByRole("combobox", { name: "Status" });
    await chooseOption(status, "Deactivated");
    await waitFor(() => expect(status).toHaveTextContent("Deactivated"));
  },
};

export const NarrowContainer: Story = {
  decorators: [withWidth("card")],
};
