import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { getMeQueryKey, getSetupStatusQueryKey } from "@/api/generated";
import { getSetupMockHandler } from "@/api/generated/setup/setup.msw";
import { serverErrorProblem } from "@/storybook/fixtures";
import { failWith } from "@/storybook/handlers";
import { mockApi, renderInApp } from "@/test/api";
import { SetupPage } from "./setup-page";

const api = mockApi();

async function fillIn(values: { name: string; email: string; password: string }) {
  fireEvent.change(await screen.findByLabelText("Display name"), {
    target: { value: values.name },
  });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: values.email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: values.password } });
  fireEvent.click(screen.getByRole("button", { name: "Create admin account" }));
}

test("the first administrator is created trimmed, signed in and taken to the guided setup", async () => {
  const { router, queryClient } = renderInApp(<SetupPage />, { path: "/setup" });

  await fillIn({ name: " Justas ", email: " justas@example.lt ", password: "Correct-horse-42" });

  await waitFor(() => expect(router.state.location.search).toEqual({ step: "basics" }));
  expect(router.state.location.pathname).toBe("/setup");
  expect(queryClient.getQueryData(getSetupStatusQueryKey())).toEqual({ needsSetup: false });
  expect(queryClient.getQueryData(getMeQueryKey())).toMatchObject({ email: "justas@example.lt" });
  expect(await api.lastBody("POST", "/api/setup")).toEqual({
    displayName: "Justas",
    email: "justas@example.lt",
    password: "Correct-horse-42",
  });
});

test("an empty form is refused on every field and nothing is sent", async () => {
  renderInApp(<SetupPage />, { path: "/setup" });

  fireEvent.click(await screen.findByRole("button", { name: "Create admin account" }));

  await waitFor(() => expect(screen.getByLabelText("Display name")).toBeInvalid());
  expect(screen.getByLabelText("Email")).toBeInvalid();
  expect(screen.getByLabelText("Password")).toBeInvalid();
  expect(api.sent("POST", "/api/setup")).toHaveLength(0);
});

test("a short password and a malformed address are named before sending", async () => {
  renderInApp(<SetupPage />, { path: "/setup" });

  await fillIn({ name: "Justas", email: "justas", password: "short" });

  expect(await screen.findByText("Must be at least 8 characters.")).toBeInTheDocument();
  expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
  expect(api.sent("POST", "/api/setup")).toHaveLength(0);
});

test("a server failure keeps the form and the setup still pending", async () => {
  api.use(getSetupMockHandler(failWith({ ...serverErrorProblem, instance: "/api/setup" })));
  const { router, queryClient } = renderInApp(<SetupPage />, { path: "/setup" });

  await fillIn({ name: "Justas", email: "justas@example.lt", password: "Correct-horse-42" });

  expect(await screen.findByRole("alert")).toHaveTextContent(serverErrorProblem.title);
  expect(router.state.location.pathname).toBe("/setup");
  expect(queryClient.getQueryData(getSetupStatusQueryKey())).toBeUndefined();
});
