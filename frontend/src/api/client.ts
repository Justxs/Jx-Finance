import { normalizeMoney } from "@/lib/validation";

interface ApiErrorDetail {
  name: string;
  reason: string;
  code?: string | null;
}

export interface ApiError {
  status: number;
  title?: string;
  detail?: string;
  errors?: ApiErrorDetail[];
}

const moneyKeys = new Set([
  "amount",
  "startingBalance",
  "limitAmount",
  "targetAmount",
  "currentAmount",
  "currentValue",
  "outstandingAmount",
  "fromAmount",
  "toAmount",
  "feeAmount",
  "receivedAmount",
  "fee",
  "price",
  "quantity",
  "lastPrice",
]);

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
        moneyKeys.has(key) && typeof value === "string" ? normalizeMoney(value) : value,
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
    const problem = (typeof body === "object" && body !== null ? body : {}) as Partial<ApiError>;
    const errors = Array.isArray(problem.errors) ? problem.errors : undefined;
    const apiError: ApiError = {
      status: response.status,
      title: problem.title ?? response.statusText,
      detail: problem.detail ?? errors?.map((error) => error.reason).join(" "),
      errors,
    };
    throw apiError;
  }

  return body as T;
}
