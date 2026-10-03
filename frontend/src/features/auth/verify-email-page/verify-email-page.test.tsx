import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { emailTokenSearchSchema } from "@/lib/search-schema";
import { resetLink } from "@/storybook/fixtures";
import { mockApi, renderInApp } from "@/test/api";
import { VerifyEmailPage } from "./verify-email-page";

const api = mockApi();

function renderWithToken(token: string) {
  return renderInApp(<VerifyEmailPage />, {
    path: `/verify-email?email=${encodeURIComponent(resetLink.email)}&token=${token}`,
    validateSearch: emailTokenSearchSchema,
  });
}

test("nothing is confirmed until the button is pressed", async () => {
  renderWithToken(resetLink.token);

  expect(await screen.findByText(resetLink.email)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Confirm this address" })).toBeEnabled();
  expect(api.sent("POST", "/api/auth/verify-email")).toHaveLength(0);
});

test("confirming sends the link's address and token and shows the address confirmed", async () => {
  renderWithToken(resetLink.token);

  fireEvent.click(await screen.findByRole("button", { name: "Confirm this address" }));

  expect(await screen.findByRole("status")).toHaveTextContent("Your address is confirmed.");
  expect(screen.queryByRole("button", { name: "Confirm this address" })).toBeNull();
  expect(await api.lastBody("POST", "/api/auth/verify-email")).toEqual({
    email: resetLink.email,
    token: resetLink.token,
  });
});

test("a stale link is refused and the button stays for another try", async () => {
  renderWithToken("old");

  fireEvent.click(await screen.findByRole("button", { name: "Confirm this address" }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/no longer valid/u);
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByRole("button", { name: "Confirm this address" })).toBeInTheDocument();
});

test("a link without its token offers nothing to confirm", async () => {
  renderInApp(<VerifyEmailPage />, {
    path: "/verify-email",
    validateSearch: emailTokenSearchSchema,
  });

  expect(await screen.findByText(/This link is incomplete/u)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Confirm this address" })).toBeNull();
});
