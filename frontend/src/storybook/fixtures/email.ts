import type { ProblemDetails, SmtpSettingsResponse, SmtpTestResponse } from "@/api/generated/model";

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

export const smtpSendFailedProblem: ProblemDetails = {
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "generalErrors",
      reason: "535 5.7.8 Authentication credentials invalid",
      code: "email.sendFailed",
    },
  ],
};

export const emailNotConfiguredProblem: ProblemDetails = {
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "generalErrors",
      reason: "Email is switched off, or the server and sender address are missing.",
      code: "email.notConfigured",
    },
  ],
};

export const smtpPasswordRequiredProblem: ProblemDetails = {
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "generalErrors",
      reason:
        "Enter the password again: the stored one is only kept for the same mail server and user name.",
      code: "email.passwordRequired",
    },
  ],
};

export const smtpInsecureConnectionProblem: ProblemDetails = {
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "encryption",
      reason:
        "A user name and password are only sent over an encrypted connection. Choose STARTTLS or SSL/TLS.",
      code: "email.insecureConnection",
    },
  ],
};

export const emailAlreadyVerifiedProblem: ProblemDetails = {
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "generalErrors",
      reason: "This address is already confirmed.",
      code: "email.alreadyVerified",
    },
  ],
};

export const resetTokenInvalidProblem: ProblemDetails = {
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "generalErrors",
      reason: "This link is no longer valid. Ask for a new one.",
      code: "passwordReset.tokenInvalid",
    },
  ],
};

export const verificationTokenInvalidProblem: ProblemDetails = {
  type: "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  errors: [
    {
      name: "generalErrors",
      reason: "This link is no longer valid. Ask for a new one.",
      code: "email.tokenInvalid",
    },
  ],
};

export const resetLink = {
  email: "ruta.kazlauskiene@example.lt",
  token: "CfDJ8Kdv4yLlQyFOjKetJ9Hi5IWLVjntZDXcf7IQ",
} as const;
