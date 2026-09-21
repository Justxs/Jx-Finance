import type {
  EnableTwoFactorResponse,
  LoginResponse,
  ProblemDetails,
  SessionResponse,
  TwoFactorSetupResponse,
} from "@/api/generated/model";
import { currentUser } from "./users";

export const twoFactorSetup: TwoFactorSetupResponse = {
  sharedKey: "jbsw y3dp ehpk 3pxp k5tq mzxw 6ytb onqx",
  authenticatorUri:
    "otpauth://totp/Jx%20Finance:ruta.kazlauskiene%40example.lt?secret=JBSWY3DPEHPK3PXPK5TQMZXW6YTBONQX&issuer=Jx%20Finance&digits=6",
};

export const twoFactorRecoveryCodes: EnableTwoFactorResponse = {
  recoveryCodes: [
    "7KQ2M-X9PLD",
    "B4TNV-R6HWC",
    "ZP83J-5FYGA",
    "M2DXC-Q7LRT",
    "H9WVB-3KNSE",
    "T6RFA-8JCMP",
    "C5GLY-W2ZQH",
    "N8ESK-4VBTD",
    "R3JHP-6MXFN",
    "Y7UCW-9DGKL",
  ],
};

export const loginSuccess: LoginResponse = {
  twoFactorRequired: false,
  profile: currentUser,
};

export const loginTwoFactorRequired: LoginResponse = {
  twoFactorRequired: true,
  profile: null,
};

export const sessions: SessionResponse[] = [
  {
    id: "5d0f6a52-5a0e-4f0e-9b57-0a4f3a1c9e01",
    createdAt: "2026-09-18T07:42:00Z",
    lastSeenAt: "2026-09-20T09:15:00Z",
    expiresAt: "2026-10-18T07:42:00Z",
    isPersistent: true,
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    isCurrent: true,
  },
  {
    id: "5d0f6a52-5a0e-4f0e-9b57-0a4f3a1c9e02",
    createdAt: "2026-09-12T18:05:00Z",
    lastSeenAt: "2026-09-19T21:30:00Z",
    expiresAt: "2026-10-12T18:05:00Z",
    isPersistent: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
    isCurrent: false,
  },
  {
    id: "5d0f6a52-5a0e-4f0e-9b57-0a4f3a1c9e03",
    createdAt: "2026-09-19T16:20:00Z",
    lastSeenAt: "2026-09-19T16:20:00Z",
    expiresAt: "2026-09-20T16:20:00Z",
    isPersistent: false,
    userAgent: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:143.0) Gecko/20100101 Firefox/143.0",
    isCurrent: false,
  },
  {
    id: "5d0f6a52-5a0e-4f0e-9b57-0a4f3a1c9e04",
    createdAt: "2026-09-10T06:00:00Z",
    lastSeenAt: "2026-09-10T06:00:00Z",
    expiresAt: "2026-10-10T06:00:00Z",
    isPersistent: true,
    userAgent: null,
    isCurrent: false,
  },
];

export const sessionCurrentProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.3",
  title: "Forbidden",
  status: 403,
  instance: "/api/auth/sessions/5d0f6a52-5a0e-4f0e-9b57-0a4f3a1c9e01",
  errors: [
    {
      name: "generalErrors",
      reason: "Sign out to end the session of this browser.",
      code: "session.current",
    },
  ],
};
