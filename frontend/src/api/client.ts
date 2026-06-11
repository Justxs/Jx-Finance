export interface ApiError {
  status: number;
  title?: string;
  detail?: string;
  errors?: Record<string, string[]>;
}

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function customFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${url}`, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const isJson = response.headers.get("content-type")?.includes("application/json") ?? false;
  const body: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
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
