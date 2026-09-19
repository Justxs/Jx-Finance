import { decimalFields } from "@/api/generated/decimal-fields";
import { normalizeMoney } from "@/lib/validation";

interface ApiErrorDetail {
  name: string;
  reason: string;
  code?: string | null;
}

interface ApiProblem {
  status: number;
  title?: string;
  detail?: string;
  errors?: ApiErrorDetail[];
}

export class ApiError extends Error implements ApiProblem {
  readonly status: number;
  readonly title?: string;
  readonly detail?: string;
  readonly errors?: ApiErrorDetail[];

  constructor({ status, title, detail, errors }: ApiProblem) {
    super(detail ?? title ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.title = title;
    this.detail = detail;
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

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  let requestOptions = options;
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (options?.body !== undefined && options.body !== null && !(options.body instanceof FormData)) {
    headers["Content-Type"] ??= "application/json";
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

  let response = await send();
  if (response.status === 401 && canRenewSession(url)) {
    await refreshSession();
    response = await send();
  }

  const isJson =
    response.headers.get("content-type")?.match(/application\/(?:[\w.-]+\+)?json/i) ?? false;
  const body: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && canRenewSession(url)) {
      window.dispatchEvent(new Event("jx:session-expired"));
    }
    const problem = (typeof body === "object" && body !== null ? body : {}) as Partial<ApiProblem>;
    const errors = Array.isArray(problem.errors) ? problem.errors : undefined;
    throw new ApiError({
      status: response.status,
      title: problem.title ?? response.statusText,
      detail: problem.detail ?? errors?.map((error) => error.reason).join(" "),
      errors,
    });
  }

  return body as T;
}
