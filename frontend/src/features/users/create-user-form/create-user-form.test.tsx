import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { getCreateUserMockHandler } from "@/api/generated/users/users.msw";
import { problemOf } from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { chooseOption } from "@/storybook/interactions";
import { mockApi, renderInApp } from "@/test/api";
import { CreateUserForm } from "./create-user-form";

const api = mockApi();

const emailTakenProblem = problemOf(400, "email.taken", "Email is already taken.", {
  name: "email",
});

async function fillIn(values: { name: string; email: string; password: string }) {
  fireEvent.change(await screen.findByLabelText("Display name"), {
    target: { value: values.name },
  });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: values.password } });
}

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Create user" }));
}

test("a new member is sent trimmed with the default role and the form closes", async () => {
  const onClose = vi.fn();
  renderInApp(<CreateUserForm onClose={onClose} />, { path: "/users" });

  await fillIn({
    name: " Ona Petrauskienė ",
    email: " ona@example.lt ",
    password: "Correct-horse-42",
  });
  submit();

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("POST", "/api/users")).toEqual({
    displayName: "Ona Petrauskienė",
    email: "ona@example.lt",
    role: "Member",
    password: "Correct-horse-42",
  });
});

test("the chosen role is sent with the new user", async () => {
  const onClose = vi.fn();
  renderInApp(<CreateUserForm onClose={onClose} />, { path: "/users" });

  await fillIn({ name: "Ona", email: "ona@example.lt", password: "Correct-horse-42" });
  await chooseOption(screen.getByRole("combobox", { name: "Role" }), "Admin");
  submit();

  await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  expect(await api.lastBody("POST", "/api/users")).toMatchObject({ role: "Admin" });
});

test("an empty form is refused on every field and nothing is sent", async () => {
  const onClose = vi.fn();
  renderInApp(<CreateUserForm onClose={onClose} />, { path: "/users" });

  fireEvent.click(await screen.findByRole("button", { name: "Create user" }));

  await waitFor(() => expect(screen.getByLabelText("Display name")).toBeInvalid());
  expect(screen.getByLabelText("Email")).toBeInvalid();
  expect(screen.getByLabelText("Password")).toBeInvalid();
  expect(api.sent("POST", "/api/users")).toHaveLength(0);
  expect(onClose).not.toHaveBeenCalled();
});

test("a password under eight characters is named before sending", async () => {
  renderInApp(<CreateUserForm onClose={vi.fn()} />, { path: "/users" });

  await fillIn({ name: "Ona", email: "ona@example.lt", password: "short" });
  submit();

  expect(await screen.findByText("Must be at least 8 characters.")).toBeInTheDocument();
  expect(api.sent("POST", "/api/users")).toHaveLength(0);
});

test("an address already in use is reported on the email field and the form stays open", async () => {
  api.use(getCreateUserMockHandler(failWith(emailTakenProblem)));
  const onClose = vi.fn();
  renderInApp(<CreateUserForm onClose={onClose} />, { path: "/users" });

  await fillIn({
    name: "Ona",
    email: "ruta.kazlauskiene@example.lt",
    password: "Correct-horse-42",
  });
  submit();

  expect(await screen.findByText("This email is already in use.")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toBeInvalid();
  expect(screen.getByLabelText("Email")).toHaveValue("ruta.kazlauskiene@example.lt");
  expect(onClose).not.toHaveBeenCalled();
});
