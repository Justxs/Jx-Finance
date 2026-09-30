import type { ErrorCode, ProblemDetails } from "@/api/generated/model";

const statusDefaults = {
  400: {
    type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.1",
    title: "One or more validation errors occurred.",
  },
  401: { type: "https://www.rfc-editor.org/rfc/rfc7235#section-3.1", title: "Unauthorized" },
  403: { type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.3", title: "Forbidden" },
  404: { type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.4", title: "Not Found" },
  409: { type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.5.8", title: "Conflict" },
  429: {
    type: "https://www.rfc-editor.org/rfc/rfc6585#section-4",
    title: "Too many failed attempts.",
  },
  500: {
    type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.6.1",
    title: "Internal Server Error",
  },
  503: {
    type: "https://www.rfc-editor.org/rfc/rfc7231#section-6.6.4",
    title: "Service Unavailable",
  },
};

type ProblemStatus = keyof typeof statusDefaults;

interface ProblemOptions {
  name?: string;
  type?: string;
  title?: string;
  instance?: string;
}

export function statusProblem(status: ProblemStatus) {
  return { ...statusDefaults[status], status };
}

export function problemOf(
  status: ProblemStatus,
  code: ErrorCode,
  reason: string,
  { name = "generalErrors", ...rest }: ProblemOptions = {},
) {
  return { ...statusProblem(status), ...rest, errors: [{ name, reason, code }] };
}

export const serverErrorProblem = {
  ...statusProblem(500),
  instance: "/api",
  traceId: "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00",
  detail: "Something went wrong while processing the request.",
};

export const unauthorizedProblem = {
  ...statusProblem(401),
  instance: "/api/auth/me",
  traceId: "00-7c1d2a9e4f5b4c6d8e9f0a1b2c3d4e5f-1a2b3c4d5e6f7a8b-00",
  detail: "You are not signed in.",
};

export const notFoundProblem = {
  ...statusProblem(404),
  detail: "The requested resource does not exist.",
};

export const validationProblem: ProblemDetails = {
  ...statusProblem(400),
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

export const exportTooManyRowsProblem = problemOf(
  400,
  "export.tooManyRows",
  "The PDF export holds at most 5000 transactions.",
  { instance: "/api/transactions/export/pdf" },
);

export const spreadRefundProblem = problemOf(
  400,
  "transaction.spreadRefund",
  "A refund cannot be spread over months.",
  { name: "spreadMonths", instance: "/api/transactions" },
);

export const duplicateTagProblem = problemOf(
  409,
  "conflict.duplicate",
  'You already have a tag named "Atostogos 2026".',
  { instance: "/api/tags" },
);

export const debtPaymentTooSmallProblem = problemOf(
  400,
  "debt.paymentTooSmall",
  "The monthly payment does not repay the debt within 50 years; it has to be more than the first month's interest.",
  { name: "monthlyPayment", instance: "/api/debts" },
);

export const lastValuationProblem = problemOf(
  400,
  "asset.lastValuation",
  "An asset keeps at least one valuation. Delete the asset instead.",
  { instance: "/api/assets/bbbbbbbb-0000-0000-0000-000000000003/valuations/2026-09-01" },
);

export const scheduleIncompleteProblem = problemOf(
  400,
  "debt.scheduleIncomplete",
  "The debt needs a loan amount, an interest rate, a first payment date, and a term or a monthly payment.",
  { instance: "/api/debts/cccccccc-0000-0000-0000-000000000002/schedule" },
);

export const dashboardCardUnknownProblem = problemOf(
  400,
  "dashboard.cardUnknown",
  "'weather' is not a dashboard card.",
  { name: "order[0]", instance: "/api/users/me/dashboard-layout" },
);

export const csvMappingIncompleteProblem = problemOf(
  400,
  "import.mappingIncomplete",
  "Name the amount column for a signed amount, the debit and credit columns, or the amount, direction and money-out value.",
  { instance: "/api/import/csv-mappings" },
);

export const missingColumnsProblem = problemOf(400, "import.missingColumns", '"Completed Date"', {
  instance: "/api/import/preview",
});
