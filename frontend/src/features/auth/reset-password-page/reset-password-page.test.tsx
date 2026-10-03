import { fireEvent, screen, waitFor } from "@testing-library/react";
import { expect, test } from "vitest";
import { emailTokenSearchSchema } from "@/lib/search-schema";
import { resetLink } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { ResetPasswordPage } from "./reset-password-page";

const api = mockApi();

function linkWith(token: string) {
  return `/reset-password?email=${encodeURIComponent(resetLink.email)}&token=${token}`;
}

function renderAt(path: string) {
  return renderInApp(<ResetPasswordPage />, { path, validateSearch: emailTokenSearchSchema });
}

async function choosePassword(value: string) {
  fireEvent.change(await screen.findByLabelText("New password"), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
}

test("a new password is sent with the link's address and token, then sign-in opens", async () => {
  const { router } = renderAt(linkWith(resetLink.token));

  expect(await screen.findByText(resetLink.email)).toBeInTheDocument();
  await choosePassword("Correct-horse-42");

  await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  expect(
    await screen.findByText("Your password was changed. Sign in with it."),
  ).toBeInTheDocument();
  expect(await api.lastBody("POST", "/api/auth/reset-password")).toEqual({
    email: resetLink.email,
    token: resetLink.token,
    newPassword: "Correct-horse-42",
  });
});

test("a password under eight characters is refused before anything is sent", async () => {
  renderAt(linkWith(resetLink.token));

  await choosePassword("short");

  expect(await screen.findByText("Must be at least 8 characters.")).toBeInTheDocument();
  expect(api.sent("POST", "/api/auth/reset-password")).toHaveLength(0);
});

test("a used link is refused with the server's reason and the page stays", async () => {
  const { router } = renderAt(linkWith("used"));

  await choosePassword("Correct-horse-42");

  expect(await screen.findByRole("alert")).toHaveTextContent(/no longer valid/u);
  expect(router.state.location.pathname).toBe("/reset-password");
});

test("a link without its token offers no form", async () => {
  renderAt(`/reset-password?email=${encodeURIComponent(resetLink.email)}`);

  expect(await screen.findByText(/This link is incomplete/u)).toBeInTheDocument();
  expect(screen.queryByLabelText("New password")).toBeNull();
});
