import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, onTestFinished, test } from "vitest";
import { getLoginMockHandler, getPasskeySignInMockHandler } from "@/api/generated/auth/auth.msw";
import { getPublicSettingsMockHandler } from "@/api/generated/settings/settings.msw";
import { hasSession, setAuthenticated } from "@/lib/auth-gate";
import {
  lockedOutProblem,
  loginTwoFactorRequired,
  passkeyInvalidProblem,
  problemOf,
  publicSettings,
} from "@/storybook/fixtures";
import { failWith, failWithStatus, problem } from "@/storybook/handlers";
import { readBody } from "@/storybook/handlers/http";
import { fakePasskeyBrowser } from "@/storybook/passkeys";
import { mockApi, renderInApp } from "@/test/api";
import { LoginPage } from "./login-page";

const api = mockApi();

const wrongCredentialsProblem = problemOf(401, "credentials.invalid", "Invalid credentials.");
const wrongCodeProblem = problemOf(401, "twoFactor.invalidCode", "Invalid code.");

beforeEach(() => {
  setAuthenticated(false);
});

function renderLogin() {
  return renderInApp(<LoginPage />, { path: "/login" });
}

function withPasskeyBrowser(outcome?: Parameters<typeof fakePasskeyBrowser>[0]) {
  onTestFinished(fakePasskeyBrowser(outcome)());
}

type AppRouter = ReturnType<typeof renderLogin>["router"];

async function enteredTheApp(router: AppRouter) {
  await waitFor(() => expect(router.state.location.pathname).toBe("/"));
}

async function signInWith(email: string, password: string) {
  fireEvent.change(await screen.findByLabelText("Email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
  const signIn = screen.getByRole("button", { name: "Sign in" });
  await waitFor(() => expect(signIn).toBeEnabled());
  fireEvent.click(signIn);
}

async function enterCode(code: string) {
  fireEvent.change(await screen.findByLabelText("Authenticator code"), {
    target: { value: code },
  });
  fireEvent.click(screen.getByRole("button", { name: "Verify code" }));
}

test("empty fields are refused before anything is sent", async () => {
  renderLogin();

  fireEvent.click(await screen.findByRole("button", { name: "Sign in" }));

  await waitFor(() => expect(screen.getByLabelText("Email")).toBeInvalid());
  expect(screen.getByLabelText("Password")).toBeInvalid();
  expect(api.sent("POST", "/api/auth/login")).toHaveLength(0);
});

test("an address without an at sign is refused on the email field", async () => {
  renderLogin();

  await signInWith("ruta.example.lt", "fixture-value");

  expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
  expect(api.sent("POST", "/api/auth/login")).toHaveLength(0);
});

test("a correct password signs in with the remember me choice and opens the dashboard", async () => {
  const { router } = renderLogin();

  fireEvent.click(await screen.findByRole("checkbox", { name: "Remember me on this device" }));
  await signInWith("ruta@example.lt", "fixture-value");

  await enteredTheApp(router);
  expect(hasSession()).toBe(true);
  expect(await api.lastBody("POST", "/api/auth/login")).toEqual({
    email: "ruta@example.lt",
    password: "fixture-value",
    rememberMe: true,
    twoFactorCode: null,
  });
});

test("a wrong password keeps the form with the reason and stays on the sign-in page", async () => {
  api.use(getLoginMockHandler(failWith(wrongCredentialsProblem)));
  const { router } = renderLogin();

  await signInWith("ruta@example.lt", "wrong");

  expect(await screen.findByRole("alert")).toHaveTextContent("Wrong email or password.");
  expect(router.state.location.pathname).toBe("/login");
  expect(hasSession()).toBe(false);
});

test("a locked account is told to wait fifteen minutes", async () => {
  api.use(getLoginMockHandler(failWith(lockedOutProblem)));
  renderLogin();

  await signInWith("ruta@example.lt", "fixture-value");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Too many failed attempts. Wait 15 minutes and try again.",
  );
});

test("a throttled sign-in without a body asks to wait a moment", async () => {
  api.use(getLoginMockHandler(failWithStatus(429)));
  renderLogin();

  await signInWith("ruta@example.lt", "fixture-value");

  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Too many attempts. Wait a moment and try again.",
  );
});

test("an account with two-factor asks for a code and locks the email and password", async () => {
  const { router } = renderLogin();

  await signInWith("ruta.2fa@example.lt", "fixture-value");

  expect(await screen.findByLabelText("Authenticator code")).toBeInTheDocument();
  expect(screen.getByLabelText("Email")).toBeDisabled();
  expect(screen.getByLabelText("Password")).toBeDisabled();
  expect(screen.queryByRole("checkbox", { name: "Remember me on this device" })).toBeNull();
  expect(router.state.location.pathname).toBe("/login");
  expect(hasSession()).toBe(false);
});

test("the code step refuses an empty code without sending it", async () => {
  renderLogin();
  await signInWith("ruta.2fa@example.lt", "fixture-value");

  fireEvent.click(await screen.findByRole("button", { name: "Verify code" }));

  await waitFor(() => expect(screen.getByLabelText("Authenticator code")).toBeInvalid());
  expect(api.sent("POST", "/api/auth/login")).toHaveLength(1);
});

test("an authenticator code is sent with the same email and password and signs in", async () => {
  const { router } = renderLogin();
  await signInWith("ruta.2fa@example.lt", "fixture-value");

  await enterCode("123456");

  await enteredTheApp(router);
  expect(await api.lastBody("POST", "/api/auth/login")).toEqual({
    email: "ruta.2fa@example.lt",
    password: "fixture-value",
    rememberMe: false,
    twoFactorCode: "123456",
  });
});

test("a recovery code goes in the same field and signs in", async () => {
  const { router } = renderLogin();
  await signInWith("ruta.2fa@example.lt", "fixture-value");

  await enterCode("R3JHP-6MXFN");

  await enteredTheApp(router);
  expect(await api.lastBody("POST", "/api/auth/login")).toMatchObject({
    twoFactorCode: "R3JHP-6MXFN",
  });
});

test("a wrong code is reported on the code step, which stays open", async () => {
  api.use(
    getLoginMockHandler(async ({ request }) => {
      const { twoFactorCode } = await readBody(request);
      if (twoFactorCode) {
        throw problem(wrongCodeProblem);
      }
      return loginTwoFactorRequired;
    }),
  );
  const { router } = renderLogin();
  await signInWith("ruta@example.lt", "fixture-value");

  await enterCode("000000");

  expect(await screen.findByRole("alert")).toHaveTextContent("The code is not valid.");
  expect(screen.getByLabelText("Authenticator code")).toBeInTheDocument();
  expect(router.state.location.pathname).toBe("/login");
});

test("the forgot password link appears only when the installation can send mail", async () => {
  api.use(getPublicSettingsMockHandler({ ...publicSettings, emailEnabled: true }));
  renderLogin();

  expect(await screen.findByRole("link", { name: "Forgot your password?" })).toHaveAttribute(
    "href",
    "/forgot-password",
  );
});

test("the passkey button is not offered when the server says passkeys are unavailable", async () => {
  withPasskeyBrowser();
  api.use(
    getPublicSettingsMockHandler({
      ...publicSettings,
      emailEnabled: true,
      passkeysAvailable: false,
    }),
  );
  renderLogin();

  await screen.findByRole("link", { name: "Forgot your password?" });
  expect(screen.queryByRole("button", { name: "Sign in with a passkey" })).toBeNull();
});

test("the passkey button is not offered in a browser without passkey support", async () => {
  api.use(getPublicSettingsMockHandler({ ...publicSettings, emailEnabled: true }));
  renderLogin();

  await screen.findByRole("link", { name: "Forgot your password?" });
  expect(screen.queryByRole("button", { name: "Sign in with a passkey" })).toBeNull();
});

test("a passkey signs in with the browser's credential and the remember me choice", async () => {
  withPasskeyBrowser();
  const { router } = renderLogin();

  fireEvent.click(await screen.findByRole("checkbox", { name: "Remember me on this device" }));
  fireEvent.click(await screen.findByRole("button", { name: "Sign in with a passkey" }));

  await enteredTheApp(router);
  expect(hasSession()).toBe(true);
  expect(api.sent("POST", "/api/auth/passkeys/sign-in-options")).toHaveLength(1);
  expect(await api.lastBody("POST", "/api/auth/passkeys/sign-in")).toMatchObject({
    rememberMe: true,
    credentialJson: expect.stringContaining('"type":"public-key"'),
  });
});

test("a passkey the server cannot verify is reported and nothing opens", async () => {
  withPasskeyBrowser();
  api.use(getPasskeySignInMockHandler(failWith(passkeyInvalidProblem)));
  const { router } = renderLogin();

  fireEvent.click(await screen.findByRole("button", { name: "Sign in with a passkey" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("The passkey could not be verified.");
  expect(router.state.location.pathname).toBe("/login");
});

test("a passkey prompt the person cancels sends nothing further and shows no error", async () => {
  withPasskeyBrowser("cancelled");
  renderLogin();

  const button = await screen.findByRole("button", { name: "Sign in with a passkey" });
  fireEvent.click(button);

  await waitFor(() =>
    expect(api.sent("POST", "/api/auth/passkeys/sign-in-options")).toHaveLength(1),
  );
  await waitFor(() => expect(button).toBeEnabled());
  expect(screen.queryByRole("alert")).toBeNull();
  expect(api.sent("POST", "/api/auth/passkeys/sign-in")).toHaveLength(0);
});

test("the code step offers a passkey instead", async () => {
  withPasskeyBrowser();
  renderLogin();

  await signInWith("ruta.2fa@example.lt", "fixture-value");

  expect(await screen.findByRole("button", { name: "Use a passkey instead" })).toBeInTheDocument();
});
