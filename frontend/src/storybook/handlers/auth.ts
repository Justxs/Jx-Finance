import {
  getDisableTwoFactorMockHandler,
  getEnableTwoFactorMockHandler,
  getLoginMockHandler,
  getLogoutMockHandler,
  getMeMockHandler,
  getSetupTwoFactorMockHandler,
} from "@/api/generated/auth/auth.msw";
import {
  currentUser,
  loginSuccess,
  loginTwoFactorRequired,
  twoFactorRecoveryCodes,
  twoFactorSetup,
  unauthorizedProblem,
} from "@/storybook/fixtures";
import { problem, readBody, text } from "./http";

export const authHandlers = [
  getMeMockHandler(currentUser),
  getLoginMockHandler(async ({ request }) => {
    const body = await readBody(request);
    if (body.password === "wrong") {
      throw problem(
        { ...unauthorizedProblem, instance: "/api/auth/login", detail: "Invalid credentials." },
        401,
      );
    }
    const needsCode = (text(body.email) ?? "").includes("2fa") && !text(body.twoFactorCode);
    return needsCode ? loginTwoFactorRequired : loginSuccess;
  }),
  getLogoutMockHandler(),
  getSetupTwoFactorMockHandler(twoFactorSetup),
  getEnableTwoFactorMockHandler(twoFactorRecoveryCodes),
  getDisableTwoFactorMockHandler(),
];
