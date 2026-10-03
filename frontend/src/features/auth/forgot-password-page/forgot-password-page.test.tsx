import { fireEvent, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { getForgotPasswordMockHandler } from "@/api/generated/auth/auth.msw";
import { failWithStatus } from "@/storybook/handlers";
import { mockApi, renderInApp } from "@/test/api";
import { ForgotPasswordPage } from "./forgot-password-page";

const api = mockApi();

async function askFor(email: string) {
  fireEvent.change(await screen.findByLabelText("Email"), { target: { value: email } });
  fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
}

test("a request sends the trimmed address and answers the same way for any address", async () => {
  renderInApp(<ForgotPasswordPage />, { path: "/forgot-password" });

  await askFor(" nobody@example.lt ");

  expect(await screen.findByRole("status")).toHaveTextContent(
    "If that address belongs to an account here, a link is on its way.",
  );
  expect(screen.queryByLabelText("Email")).toBeNull();
  expect(screen.getByRole("link", { name: "Back to sign in" })).toHaveAttribute("href", "/login");
  expect(await api.lastBody("POST", "/api/auth/forgot-password")).toEqual({
    email: "nobody@example.lt",
  });
});

test("an invalid address is refused before anything is sent", async () => {
  renderInApp(<ForgotPasswordPage />, { path: "/forgot-password" });

  await askFor("not-an-address");

  expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  expect(api.sent("POST", "/api/auth/forgot-password")).toHaveLength(0);
});

test("a throttled request keeps the form and asks to wait", async () => {
  api.use(getForgotPasswordMockHandler(failWithStatus(429)));
  renderInApp(<ForgotPasswordPage />, { path: "/forgot-password" });

  await askFor("ruta@example.lt");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Too many attempts. Wait a moment and try again.",
  );
  expect(screen.getByLabelText("Email")).toHaveValue("ruta@example.lt");
  expect(screen.queryByRole("status")).toBeNull();
});
