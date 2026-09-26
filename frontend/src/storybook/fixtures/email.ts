import type { SmtpSettingsResponse, SmtpTestResponse } from "@/api/generated/model";
import { problemOf } from "./problems";

const validationType = "https://tools.ietf.org/html/rfc9110#section-15.5.1";

export const smtpSettings: SmtpSettingsResponse = {
  enabled: true,
  host: "smtp.example.lt",
  port: 587,
  encryption: "startTls",
  userName: "finance@example.lt",
  hasPassword: true,
  fromAddress: "finance@example.lt",
  fromName: "Pranauskai",
};

export const smtpSettingsOff: SmtpSettingsResponse = {
  enabled: false,
  host: null,
  port: 587,
  encryption: "startTls",
  userName: null,
  hasPassword: false,
  fromAddress: null,
  fromName: null,
};

export const smtpTestSent: SmtpTestResponse = {
  sentTo: "ruta.kazlauskiene@example.lt",
};

export const smtpSendFailedProblem = problemOf(
  400,
  "email.sendFailed",
  "535 5.7.8 Authentication credentials invalid",
  { type: validationType },
);

export const emailNotConfiguredProblem = problemOf(
  400,
  "email.notConfigured",
  "Email is switched off, or the server and sender address are missing.",
  { type: validationType },
);

export const emailAlreadyVerifiedProblem = problemOf(
  400,
  "email.alreadyVerified",
  "This address is already confirmed.",
  { type: validationType },
);

export const resetTokenInvalidProblem = problemOf(
  400,
  "passwordReset.tokenInvalid",
  "This link is no longer valid. Ask for a new one.",
  { type: validationType },
);

export const verificationTokenInvalidProblem = problemOf(
  400,
  "email.tokenInvalid",
  "This link is no longer valid. Ask for a new one.",
  { type: validationType },
);

export const resetLink = {
  email: "ruta.kazlauskiene@example.lt",
  token: "CfDJ8Kdv4yLlQyFOjKetJ9Hi5IWLVjntZDXcf7IQ",
} as const;
