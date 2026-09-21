import type { ProblemDetails } from "@/api/generated/model";

export const serverErrorProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.6.1",
  title: "Internal Server Error",
  status: 500,
  instance: "/api",
  traceId: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
  detail: "Something went wrong while processing the request.",
};

export const unauthorizedProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7235#section-3.1",
  title: "Unauthorized",
  status: 401,
  instance: "/api/auth/me",
  traceId: "00-7c1d2a9e4f5b4c6d8e9f0a1b2c3d4e5f-1a2b3c4d5e6f7a8b-00",
  detail: "You are not signed in.",
};

export const notFoundProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.4",
  title: "Not Found",
  status: 404,
  detail: "The requested resource does not exist.",
};

export const validationProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  detail: "Amount must be greater than zero.",
  errors: [
    {
      name: "amount",
      reason: "Amount must be greater than zero.",
      code: "money.positive",
      severity: "Error",
    },
  ],
};

export const exportTooManyRowsProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/transactions/export/pdf",
  errors: [
    {
      name: "generalErrors",
      reason: "The PDF export holds at most 5000 transactions.",
      code: "export.tooManyRows",
    },
  ],
};

export const duplicateTagProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.8",
  title: "Conflict",
  status: 409,
  instance: "/api/tags",
  detail: 'You already have a tag named "Atostogos 2026".',
  code: "conflict.duplicate",
};

export const debtPaymentTooSmallProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/debts",
  errors: [
    {
      name: "monthlyPayment",
      reason:
        "The monthly payment does not repay the debt within 50 years; it has to be more than the first month's interest.",
      code: "debt.paymentTooSmall",
    },
  ],
};

export const scheduleIncompleteProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/debts/cccccccc-0000-0000-0000-000000000002/schedule",
  errors: [
    {
      name: "generalErrors",
      reason:
        "The debt needs a loan amount, an interest rate, a first payment date, and a term or a monthly payment.",
      code: "debt.scheduleIncomplete",
    },
  ],
};

export const dashboardCardUnknownProblem: ProblemDetails = {
  type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
  title: "One or more validation errors occurred.",
  status: 400,
  instance: "/api/users/me/dashboard-layout",
  errors: [
    {
      name: "order[0]",
      reason: "'weather' is not a dashboard card.",
      code: "dashboard.cardUnknown",
    },
  ],
};
