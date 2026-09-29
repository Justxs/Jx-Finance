import {
  getAddPasskeyMockHandler,
  getBeginPasskeyRegistrationMockHandler,
  getBeginPasskeySignInMockHandler,
  getCreatePersonalApiTokenMockHandler,
  getDisableTwoFactorMockHandler,
  getEnableTwoFactorMockHandler,
  getForgotPasswordMockHandler,
  getLoginMockHandler,
  getLogoutMockHandler,
  getMeMockHandler,
  getPasskeySignInMockHandler,
  getPasskeysMockHandler,
  getPersonalApiTokensMockHandler,
  getRemovePasskeyMockHandler,
  getRenamePasskeyMockHandler,
  getResetPasswordMockHandler,
  getRevokeOtherSessionsMockHandler,
  getRevokePersonalApiTokenMockHandler,
  getRevokeSessionMockHandler,
  getSendVerificationEmailMockHandler,
  getSessionsMockHandler,
  getSetupTwoFactorMockHandler,
  getVerifyEmailMockHandler,
} from "@/api/generated/auth/auth.msw";
import type { ProblemDetails } from "@/api/generated/model";
import {
  createdPersonalApiToken,
  currentUser,
  loginSuccess,
  loginTwoFactorRequired,
  passkeyOptions,
  passkeys,
  personalApiTokens,
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

function requireLinkToken(rejection: ProblemDetails) {
  return async function check({ request }: { request: Request }) {
    const body = await readBody(request);
    if (text(body.token) !== resetLink.token) {
      throw problem(rejection);
    }
  };
}

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
  getPasskeysMockHandler(passkeys),
  getBeginPasskeyRegistrationMockHandler(passkeyOptions),
  getAddPasskeyMockHandler(async ({ request }) => ({
    id: "bmV3LXN0b3J5LXBhc3NrZXk",
    name: text((await readBody(request)).name) ?? "",
    createdAt: "2026-09-20T09:15:00Z",
    isSynced: true,
  })),
  getRenamePasskeyMockHandler(async ({ request, params }) => ({
    ...found(passkeys.find((passkey) => passkey.id === params.id)),
    name: text((await readBody(request)).name) ?? "",
  })),
  getRemovePasskeyMockHandler(({ params }) => {
    found(passkeys.find((passkey) => passkey.id === params.id));
  }),
  getBeginPasskeySignInMockHandler(passkeyOptions),
  getPasskeySignInMockHandler(loginSuccess),
  getForgotPasswordMockHandler(),
  getResetPasswordMockHandler(requireLinkToken(resetTokenInvalidProblem)),
  getVerifyEmailMockHandler(requireLinkToken(verificationTokenInvalidProblem)),
  getSendVerificationEmailMockHandler(),
  getPersonalApiTokensMockHandler(personalApiTokens),
  getCreatePersonalApiTokenMockHandler(createdPersonalApiToken),
  getRevokePersonalApiTokenMockHandler(({ params }) => {
    found(personalApiTokens.find((token) => token.id === params.id));
  }),
];
