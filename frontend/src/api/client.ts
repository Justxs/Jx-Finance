export interface ApiError {
  status: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string> | undefined),
  };
  if (options?.body !== undefined && options.body !== null && !(options.body instanceof FormData)) {
    headers["Content-Type"] ??= "application/json";
  }

  if (typeof options?.body === "string" && headers["Content-Type"] === "application/json") {
    const moneyKeys = new Set([
      "amount",
      "startingBalance",
      "limitAmount",
      "targetAmount",
      "currentAmount",
      "currentValue",
      "outstandingAmount",
    ]);
    options = {
      ...options,
      body: JSON.stringify(JSON.parse(options.body), (key, value) =>
        moneyKeys.has(key) && typeof value === "string" ? value.trim().replace(",", ".") : value,
      ),
    };
  }

  const response = await fetch(`${baseUrl}${url}`, {
    credentials: "include",
    ...options,
    headers,
  });

  const isJson =
    response.headers.get("content-type")?.match(/application\/(?:[\w.-]+\+)?json/i) ?? false;
  const body: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (response.status === 401 && !url.includes("/auth/login") && !url.includes("/auth/2fa/")) {
      window.dispatchEvent(new Event("jx:session-expired"));
    }
    const problem = (typeof body === "object" && body !== null ? body : {}) as Partial<ApiError>;
    const apiError: ApiError = {
      status: response.status,
      title: problem.title ?? response.statusText,
      detail: problem.detail,
      errors: problem.errors,
    };
    throw apiError;
  }

  return body as T;
}
