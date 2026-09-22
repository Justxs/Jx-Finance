import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import {
  getDeactivateUserMockHandler,
  getReactivateUserMockHandler,
  getUpdateUserRoleMockHandler,
  getUsersMockHandler,
} from "@/api/generated/users/users.msw";
import { QueryBoundary } from "@/components/query-boundary/query-boundary";
import { Skeleton } from "@/components/ui/skeleton/skeleton";
import { UserRole } from "@/lib/user-role";
import {
  adminPassword,
  inactiveUser,
  lastAdministratorProblem,
  longNameUser,
  memberUser,
  serverErrorProblem,
} from "@/storybook/fixtures";
import {
  emptyHandlers,
  errorHandlers,
  failWith,
  loadingHandlers,
  pending,
  withHandlers,
} from "@/storybook/handlers";
import { chooseOption, first, openedDialog } from "@/storybook/interactions";
import { UsersPage } from "./users-page";

const meta = {
  title: "Features/Users/UsersPage",
  component: UsersPage,
  parameters: { layout: "fullscreen", route: "/users" },
  render: () => (
    <div className="p-6">
      <QueryBoundary fallback={<Skeleton className="h-96 w-full" />}>
        <UsersPage />
      </QueryBoundary>
    </div>
  ),
} satisfies Meta<typeof UsersPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const FilteredByRole: Story = { parameters: { route: "/users?role=Admin" } };

export const InactiveOnly: Story = { parameters: { route: "/users?isActive=false" } };

export const SearchNoMatches: Story = { parameters: { route: "/users?search=nobody" } };

export const SortedByNameDescending: Story = {
  parameters: { route: "/users?sort=displayName&direction=desc" },
};

export const OnlyCurrentUser: Story = { parameters: { msw: { handlers: emptyHandlers } } };

export const NoUsers: Story = {
  parameters: withHandlers(getUsersMockHandler([])),
};

export const SignedInAsAnotherAdmin: Story = {
  parameters: withHandlers(getMeMockHandler({ ...memberUser, role: UserRole.admin })),
};

export const LongNamesAndInactive: Story = {
  parameters: withHandlers(getUsersMockHandler([longNameUser, inactiveUser])),
};

export const Loading: Story = { parameters: { msw: { handlers: loadingHandlers } } };

export const ServerError: Story = { parameters: { msw: { handlers: errorHandlers } } };

export const DeactivatesUserAfterConfirmation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const deactivate = first(
      await canvas.findAllByRole("button", {
        name: `Deactivate: ${memberUser.displayName}`,
      }),
    );
    await userEvent.click(deactivate);

    const confirm = within(await openedDialog("alertdialog"));
    await expect(confirm.getByText(memberUser.displayName)).toBeVisible();
    await expect(confirm.getByText(/signed out everywhere/u)).toBeVisible();
    await userEvent.click(confirm.getByRole("button", { name: "Deactivate" }));

    await expect(await body.findByText("User deactivated")).toBeInTheDocument();
  },
};

export const CancelsDeactivation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const deactivate = first(
      await canvas.findAllByRole("button", {
        name: `Deactivate: ${memberUser.displayName}`,
      }),
    );
    await userEvent.click(deactivate);
    const confirm = within(await openedDialog("alertdialog"));
    await userEvent.click(confirm.getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(body.queryByRole("alertdialog")).toBeNull());
    await expect(deactivate).toBeEnabled();
  },
};

export const DeactivationFails: Story = {
  parameters: withHandlers(getDeactivateUserMockHandler(failWith(serverErrorProblem, 500))),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deactivate = first(
      await canvas.findAllByRole("button", {
        name: `Deactivate: ${memberUser.displayName}`,
      }),
    );
    await userEvent.click(deactivate);
    const confirm = within(await openedDialog("alertdialog"));
    await userEvent.click(confirm.getByRole("button", { name: "Deactivate" }));

    await expect(
      await within(document.body).findByText(serverErrorProblem.title ?? ""),
    ).toBeInTheDocument();
  },
};

const secondAdmin = { ...memberUser, role: UserRole.admin };

export const DeactivatingLastAdministratorRefused: Story = {
  parameters: withHandlers(
    getUsersMockHandler([secondAdmin]),
    getDeactivateUserMockHandler(failWith(lastAdministratorProblem, 403)),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deactivate = first(
      await canvas.findAllByRole("button", {
        name: `Deactivate: ${secondAdmin.displayName}`,
      }),
    );
    await userEvent.click(deactivate);
    const confirm = within(await openedDialog("alertdialog"));
    await userEvent.click(confirm.getByRole("button", { name: "Deactivate" }));

    const refusals = await within(document.body).findAllByText(
      "At least one active administrator must remain.",
    );
    await expect(refusals.length).toBeGreaterThan(0);
  },
};

export const DemotingLastAdministratorRefused: Story = {
  parameters: withHandlers(
    getUsersMockHandler([secondAdmin]),
    getUpdateUserRoleMockHandler(failWith(lastAdministratorProblem, 403)),
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const role = first(
      await canvas.findAllByRole("combobox", {
        name: new RegExp(`${secondAdmin.displayName}$`, "u"),
      }),
    );
    await chooseOption(role, "Member");

    const refusals = await within(document.body).findAllByText(
      "At least one active administrator must remain.",
    );
    await expect(refusals.length).toBeGreaterThan(0);
  },
};

export const ReactivatesUser: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const reactivate = first(
      await canvas.findAllByRole("button", {
        name: `Reactivate: ${inactiveUser.displayName}`,
      }),
    );
    await userEvent.click(reactivate);

    await expect(await within(document.body).findByText("User reactivated")).toBeInTheDocument();
  },
};

export const ReactivationPending: Story = {
  parameters: withHandlers(getReactivateUserMockHandler(pending)),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const reactivate = first(
      await canvas.findAllByRole("button", {
        name: `Reactivate: ${inactiveUser.displayName}`,
      }),
    );
    await userEvent.click(reactivate);

    await waitFor(() => expect(reactivate).toHaveAttribute("aria-busy", "true"));
  },
};

export const ResetsPassword: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const reset = first(
      await canvas.findAllByRole("button", {
        name: `Reset password: ${memberUser.displayName}`,
      }),
    );
    await userEvent.click(reset);

    const dialog = within(await openedDialog());
    await fireEvent.change(dialog.getByLabelText("Temporary password"), {
      target: { value: "Temporary-42-horse" },
    });
    await fireEvent.change(dialog.getByLabelText("Your current password"), {
      target: { value: adminPassword },
    });
    const submit = dialog.getByRole("button", { name: "Reset password" });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);

    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
    await expect(await body.findByText(/^Password reset\./u)).toBeInTheDocument();
  },
};

export const ChangesRole: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    const role = first(
      await canvas.findAllByRole("combobox", {
        name: new RegExp(`${memberUser.displayName}$`),
      }),
    );
    await chooseOption(role, /^(admin|administratorius)/i);

    await expect(await body.findByText(/role updated|rolė atnaujinta/i)).toBeInTheDocument();
  },
};

export const CreatesUser: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const body = within(document.body);
    await userEvent.click(
      await canvas.findByRole("button", { name: /create user|sukurti naudotoją/i }),
    );
    const dialog = within(await body.findByRole("dialog"));
    await fireEvent.change(dialog.getByLabelText(/display name|rodomas vardas/i), {
      target: { value: "Ona Petrauskienė" },
    });
    await fireEvent.change(dialog.getByLabelText(/^(email|el\. paštas)/i), {
      target: { value: "ona.petrauskiene@example.lt" },
    });
    await fireEvent.change(dialog.getByLabelText(/^(password|slaptažodis)/i), {
      target: { value: "Correct-horse-42" },
    });
    await userEvent.click(dialog.getByRole("button", { name: /create user|sukurti naudotoją/i }));

    await waitFor(() => expect(body.queryByRole("dialog")).toBeNull());
  },
};
