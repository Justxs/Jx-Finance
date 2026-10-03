import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test } from "vitest";
import { usersSearchSchema } from "@/routes/users";
import { currentUser, memberUser } from "@/storybook/fixtures";
import { openedDialog } from "@/storybook/interactions";
import { mockApi, renderInApp } from "@/test/api";
import { UsersPage } from "./users-page";

const api = mockApi();

function renderPage(path = "/users") {
  return renderInApp(<UsersPage />, { path, validateSearch: usersSearchSchema });
}

function listRequests() {
  return api.sent("GET", "/api/users");
}

test("the list is asked for with the filters in the address", async () => {
  renderPage("/users?role=Admin&isActive=true");

  expect((await screen.findAllByText(currentUser.email)).length).toBeGreaterThan(0);
  expect(screen.queryByText(memberUser.email)).toBeNull();
  const asked = new URL(listRequests().at(-1)!.url).searchParams;
  expect(asked.get("role")).toBe("Admin");
  expect(asked.get("isActive")).toBe("true");
});

test("a created user closes the dialog and the list is asked for again", async () => {
  renderPage();
  await screen.findAllByText(memberUser.email);
  const before = listRequests().length;

  await userEvent.click(screen.getByRole("button", { name: "Create user" }));
  const dialog = within(await openedDialog());
  fireEvent.change(dialog.getByLabelText("Display name"), { target: { value: "Ona" } });
  fireEvent.change(dialog.getByLabelText("Email"), { target: { value: "ona@example.lt" } });
  fireEvent.change(dialog.getByLabelText("Password"), { target: { value: "Correct-horse-42" } });
  fireEvent.click(dialog.getByRole("button", { name: "Create user" }));

  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(api.sent("POST", "/api/users")).toHaveLength(1);
  await waitFor(() => expect(listRequests().length).toBeGreaterThan(before));
});
