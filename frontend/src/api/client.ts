import { decimalFields } from "@/api/generated/decimal-fields";
import type { ErrorCode } from "@/api/generated/model";
import { normalizeMoney } from "@/lib/validation";
import { readActiveHouseholdId } from "@/stores/active-household-store";

const ACTIVE_HOUSEHOLD_HEADER = "X-Active-Household";

export const SESSION_EXPIRED_EVENT = "jx:session-expired";

interface ApiErrorDetail {
  name: string;
  reason: string;
  code?: ErrorCode | null;
}

interface ApiProblem {
  status: number;
  title?: string;
  detail?: string;
  code?: ErrorCode | null;
  errors?: ApiErrorDetail[];
}

export class ApiError extends Error implements ApiProblem {
  readonly status: number;
  readonly title?: string;
  readonly detail?: string;
  readonly code?: ErrorCode | null;
  readonly errors?: ApiErrorDetail[];

  constructor({ status, title, detail, code, errors }: ApiProblem) {
    super(detail ?? title ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.code = code;
    this.errors = errors;
  }
}

export type ErrorType<_Problem> = ApiError;

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

let pendingRefresh: Promise<void> | null = null;

function refreshSession(): Promise<void> {
  pendingRefresh ??= fetch(`${baseUrl}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
  })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      pendingRefresh = null;
    });
  return pendingRefresh;
}

function canRenewSession(url: string): boolean {
  return !["/auth/login", "/auth/refresh", "/auth/2fa/"].some((path) => url.includes(path));
}

function readBody(response: Response) {
  const isJson = response.headers.get("content-type")?.match(/application\/(?:[\w.-]+\+)?json/i);
  if (!isJson) {
    return response.text();
  }
  return response.ok ? response.json() : response.json().catch(() => undefined);
}

function plainHeaders(init: HeadersInit | undefined): Record<string, string> {
  if (init === undefined) {
    return {};
  }
  if (init instanceof Headers || Array.isArray(init)) {
    return Object.fromEntries(new Headers(init));
  }
  return { ...init };
}

async function request(url: string, options?: RequestInit): Promise<Response> {
  let requestOptions = options;
  const headers = plainHeaders(options?.headers);
  if (options?.body !== undefined && options.body !== null && !(options.body instanceof FormData)) {
    headers["Content-Type"] ??= "application/json";
  }

  const activeHouseholdId = readActiveHouseholdId();
  if (activeHouseholdId) {
    headers[ACTIVE_HOUSEHOLD_HEADER] = activeHouseholdId;
  }

  if (typeof options?.body === "string" && headers["Content-Type"] === "application/json") {
    requestOptions = {
      ...options,
      body: JSON.stringify(JSON.parse(options.body), (key, value) =>
        decimalFields.has(key) && typeof value === "string" ? normalizeMoney(value) : value,
      ),
    };
  }

  function send(): Promise<Response> {
    return fetch(`${baseUrl}${url}`, {
      credentials: "include",
      ...requestOptions,
      headers,
    });
  }

  const response = await send();
  if (response.status !== 401 || !canRenewSession(url)) {
    return response;
  }

  await refreshSession();
  const retried = await send();
  if (retried.status === 401) {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  return retried;
}

async function failure(response: Response): Promise<ApiError> {
  const body: unknown = await readBody(response);
  const problem = (typeof body === "object" && body !== null ? body : {}) as Partial<ApiProblem>;
  const errors = Array.isArray(problem.errors) ? problem.errors : undefined;
  return new ApiError({
    status: response.status,
    title: problem.title ?? response.statusText,
    detail: problem.detail ?? errors?.map((error) => error.reason).join(" "),
    code: problem.code,
    errors,
  });
}

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await request(url, options);
  if (!response.ok) {
    throw await failure(response);
  }

  return readBody(response);
}

export interface DownloadedFile {
  blob: Blob;
  filename: string | undefined;
}

export async function fetchFile(url: string): Promise<DownloadedFile> {
  const response = await request(url);
  if (!response.ok) {
    throw await failure(response);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1];
  return { blob: await response.blob(), filename };
}
