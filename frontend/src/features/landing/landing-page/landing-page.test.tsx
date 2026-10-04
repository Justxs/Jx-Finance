import { fireEvent, screen, waitFor } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { setAuthenticated } from "@/lib/auth-gate";
import { handlers } from "@/storybook/handlers";
import { APP_TEST_TIMEOUT, appWait, mountApp } from "@/test/app-router";

vi.setConfig({ testTimeout: APP_TEST_TIMEOUT });

const server = setupServer(...handlers);

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

async function landingShown() {
  return screen.findByRole(
    "heading",
    { level: 1, name: "Your personal finances, kept private" },
    appWait,
  );
}

test("a guest at the root sees the landing page while the address stays at the root", async () => {
  setAuthenticated(false);
  const { router } = mountApp("/");

  await landingShown();
  expect(router.state.location.pathname).toBe("/welcome");
  expect(router.history.location.pathname).toBe("/");
});

test("sign in on the landing page opens the sign-in form", async () => {
  setAuthenticated(false);
  const { router } = mountApp("/");

  await landingShown();
  const [signIn] = screen.getAllByRole("link", { name: "Sign in" });
  if (!signIn) {
    throw new Error("no sign-in link");
  }
  fireEvent.click(signIn);

  await waitFor(() => expect(router.state.location.pathname).toBe("/login"), appWait);
  expect(await screen.findByLabelText("Email", {}, appWait)).toBeInTheDocument();
});

test("a guest at a private page still goes to sign in", async () => {
  setAuthenticated(false);
  const { router } = mountApp("/transactions");

  await waitFor(() => expect(router.state.location.pathname).toBe("/login"), appWait);
});

test("a signed-in user who opens the landing page goes to the dashboard", async () => {
  setAuthenticated(true);
  const { router } = mountApp("/welcome");

  await waitFor(() => expect(router.state.location.pathname).toBe("/"), appWait);
  expect(router.state.location.maskedLocation).toBeUndefined();
});

test("a guest can open the features page from the landing page", async () => {
  setAuthenticated(false);
  const { router } = mountApp("/");

  await landingShown();
  fireEvent.click(screen.getByRole("link", { name: "Features" }));

  await waitFor(() => expect(router.state.location.pathname).toBe("/features"), appWait);
  expect(
    await screen.findByRole("heading", { level: 1, name: "What Jx Finance can do" }, appWait),
  ).toBeInTheDocument();
});

test("a signed-in user who opens the features page goes to the dashboard", async () => {
  setAuthenticated(true);
  const { router } = mountApp("/features");

  await waitFor(() => expect(router.state.location.pathname).toBe("/"), appWait);
});
