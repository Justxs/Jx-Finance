import {
  getDisableTwoFactorMockHandler,
  getEnableTwoFactorMockHandler,
  getForgotPasswordMockHandler,
  getLoginMockHandler,
  getLogoutMockHandler,
  getMeMockHandler,
  getResetPasswordMockHandler,
  getRevokeOtherSessionsMockHandler,
  getRevokeSessionMockHandler,
  getSendVerificationEmailMockHandler,
  getSessionsMockHandler,
  getSetupTwoFactorMockHandler,
  getVerifyEmailMockHandler,
} from "@/api/generated/auth/auth.msw";
import {
  currentUser,
  loginSuccess,
  loginTwoFactorRequired,
  resetLink,
  resetTokenInvalidProblem,
  sessionCurrentProblem,
  sessions,
  twoFactorRecoveryCodes,
  twoFactorSetup,
  unauthorizedProblem,
  verificationTokenInvalidProblem,
} from "@/storybook/fixtures";
import { found, problem, readBody, text } from "./http";

export const authHandlers = [
  getMeMockHandler(currentUser),
  getLoginMockHandler(async ({ request }) => {
    const body = await readBody(request);
    if (body.password === "wrong") {
      throw problem({
        ...unauthorizedProblem,
        instance: "/api/auth/login",
        detail: "Invalid credentials.",
      });
    }
    const needsCode = (text(body.email) ?? "").includes("2fa") && !text(body.twoFactorCode);
    return needsCode ? loginTwoFactorRequired : loginSuccess;
  }),
  getLogoutMockHandler(),
  getSetupTwoFactorMockHandler(twoFactorSetup),
  getEnableTwoFactorMockHandler(twoFactorRecoveryCodes),
  getDisableTwoFactorMockHandler(),
  getSessionsMockHandler(sessions),
  getRevokeSessionMockHandler(({ params }) => {
    if (found(sessions.find((session) => session.id === params.id)).isCurrent) {
      throw problem(sessionCurrentProblem);
    }
  }),
  getRevokeOtherSessionsMockHandler(),
  getForgotPasswordMockHandler(),
  getResetPasswordMockHandler(async ({ request }) => {
    const body = await readBody(request);
    if (text(body.token) !== resetLink.token) {
      throw problem(resetTokenInvalidProblem);
    }
  }),
  getVerifyEmailMockHandler(async ({ request }) => {
    const body = await readBody(request);
    if (text(body.token) !== resetLink.token) {
      throw problem(verificationTokenInvalidProblem);
    }
  }),
  getSendVerificationEmailMockHandler(),
];
