import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { getMeMockHandler } from "@/api/generated/auth/auth.msw";
import type { UserProfileResponse } from "@/api/generated/model";
import { getUpdateUserRoleMockHandler } from "@/api/generated/users/users.msw";
import { UserRole } from "@/lib/user-role";
import { usersSearchSchema } from "@/routes/users";
import {
  currentUser,
  inactiveUser,
  lastAdministratorProblem,
  memberUser,
  users,
} from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { chooseOption, first, openedDialog } from "@/storybook/interactions";
import { mockApi, renderInApp } from "@/test/api";
import { UsersTable } from "./users-table";

const api = mockApi();

function renderTable(shown: UserProfileResponse[] = users, path = "/users") {
  return renderInApp(<UsersTable users={shown} stale={false} />, {
    path,
    validateSearch: usersSearchSchema,
  });
}

async function actionFor(action: string, user: UserProfileResponse) {
  return first(await screen.findAllByRole("button", { name: `${action}: ${user.displayName}` }));
}

function actionsOf(user: UserProfileResponse) {
  return screen.queryAllByRole("button", { name: new RegExp(`: ${user.displayName}$`, "u") });
}

async function roleSelectOf(user: UserProfileResponse) {
  return first(await screen.findAllByRole("combobox", { name: `Role: ${user.displayName}` }));
}

async function filterBar() {
  return within(await screen.findByRole("group", { name: "Filters" }));
}

test("the signed-in administrator can neither change their own role nor deactivate themselves", async () => {
  renderTable();

  await actionFor("Deactivate", memberUser);
  expect(actionsOf(currentUser)).toHaveLength(0);
  for (const select of screen.getAllByRole("combobox", {
    name: `Role: ${currentUser.displayName}`,
  })) {
    expect(select).toBeDisabled();
  }
  expect(await roleSelectOf(memberUser)).toBeEnabled();
});

test("the own-row rule follows whoever is signed in, not a fixed administrator", async () => {
  api.use(getMeMockHandler({ ...memberUser, role: UserRole.admin }));
  renderTable();

  expect(await actionFor("Deactivate", currentUser)).toBeEnabled();
  expect(actionsOf(memberUser)).toHaveLength(0);
});

test("an active user can be deactivated and a deactivated one reactivated, both reset", async () => {
  renderTable();

  expect(await actionFor("Deactivate", memberUser)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: `Reactivate: ${memberUser.displayName}` }),
  ).toBeNull();
  expect(await actionFor("Reactivate", inactiveUser)).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: `Deactivate: ${inactiveUser.displayName}` }),
  ).toBeNull();
  expect(await actionFor("Reset password", memberUser)).toBeInTheDocument();
  expect(await actionFor("Reset password", inactiveUser)).toBeInTheDocument();
});

test("cancelling the deactivation sends nothing", async () => {
  renderTable();

  await userEvent.click(await actionFor("Deactivate", memberUser));
  const confirm = within(await openedDialog("alertdialog"));
  expect(confirm.getByText(memberUser.displayName)).toBeInTheDocument();
  await userEvent.click(confirm.getByRole("button", { name: "Cancel" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(api.sent("POST", `/api/users/${memberUser.id}/deactivate`)).toHaveLength(0);
});

test("a confirmed deactivation is sent for that user and announced", async () => {
  renderTable();

  await userEvent.click(await actionFor("Deactivate", memberUser));
  const confirm = within(await openedDialog("alertdialog"));
  await userEvent.click(confirm.getByRole("button", { name: "Deactivate" }));

  expect(await screen.findByText("User deactivated")).toBeInTheDocument();
  expect(api.sent("POST", `/api/users/${memberUser.id}/deactivate`)).toHaveLength(1);
});

test("reactivation is sent at once without a confirmation", async () => {
  renderTable();

  await userEvent.click(await actionFor("Reactivate", inactiveUser));

  expect(await screen.findByText("User reactivated")).toBeInTheDocument();
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(api.sent("POST", `/api/users/${inactiveUser.id}/reactivate`)).toHaveLength(1);
});

test("a role change is sent for that user and announced", async () => {
  renderTable();

  await chooseOption(await roleSelectOf(memberUser), "Admin");

  expect(await screen.findByText("Role updated")).toBeInTheDocument();
  expect(await api.lastBody("PUT", `/api/users/${memberUser.id}/role`)).toEqual({ role: "Admin" });
});

test("demoting the last other administrator is refused with the server's reason", async () => {
  const secondAdmin = { ...memberUser, role: UserRole.admin };
  api.use(getUpdateUserRoleMockHandler(failWith(lastAdministratorProblem)));
  renderTable([secondAdmin]);

  await chooseOption(await roleSelectOf(secondAdmin), "Member");

  expect(
    (await screen.findAllByText("At least one active administrator must remain.")).length,
  ).toBeGreaterThan(0);
  expect(screen.queryByText("Role updated")).toBeNull();
});

test("the reset password action opens the dialog for that user", async () => {
  renderTable();

  await userEvent.click(await actionFor("Reset password", memberUser));

  const dialog = within(await openedDialog());
  expect(dialog.getByRole("heading", { name: "Set a temporary password" })).toBeInTheDocument();
  expect(dialog.getByText(/pass it on yourself/u)).toHaveTextContent(memberUser.displayName);
});

test("the role and status filters write to the address and clear from it", async () => {
  const { router } = renderTable();

  await chooseOption((await filterBar()).getByRole("combobox", { name: "Role" }), "Admin");
  await waitFor(() => expect(router.state.location.search).toEqual({ role: "Admin" }));

  await chooseOption((await filterBar()).getByRole("combobox", { name: "Status" }), "Deactivated");
  await waitFor(() =>
    expect(router.state.location.search).toEqual({ role: "Admin", isActive: false }),
  );

  await chooseOption((await filterBar()).getByRole("combobox", { name: "Role" }), "All roles");
  await waitFor(() => expect(router.state.location.search).toEqual({ isActive: false }));
});

test("typed search text reaches the address after a pause", async () => {
  const { router } = renderTable();

  fireEvent.change(await screen.findByRole("searchbox", { name: "Search" }), {
    target: { value: "egle" },
  });

  expect(router.state.location.search).toEqual({});
  await waitFor(() => expect(router.state.location.search).toEqual({ search: "egle" }));
});

test("a column header sorts through the address", async () => {
  const { router } = renderTable();

  fireEvent.click(await screen.findByRole("button", { name: "Sort Display name ascending" }));

  await waitFor(() =>
    expect(router.state.location.search).toEqual({ sort: "displayName", direction: "asc" }),
  );
});

test("an empty list says no other users, and an empty filtered list says nothing matches", async () => {
  const { unmount } = renderTable([]);
  expect((await screen.findAllByText("No other users yet.")).length).toBeGreaterThan(0);
  unmount();

  renderTable([], "/users?role=Admin");
  expect((await screen.findAllByText("No rows match these filters.")).length).toBeGreaterThan(0);
});
