export type Query = Record<string, string | number | boolean | undefined>;

export interface JxApi {
  get(path: string, query?: Query): Promise<unknown>;
}

export class JxApiError extends Error {}

interface Problem {
  errors?: { code?: string; reason?: string }[];
}

function describeProblem(status: number, body: string) {
  try {
    const problem = JSON.parse(body) as Problem;
    const details = (problem.errors ?? []).map((error) => `${error.code}: ${error.reason}`);
    return `Jx Finance answered ${status}. ${details.join(" ")}`.trim();
  } catch {
    return `Jx Finance answered ${status}.`;
  }
}

export function createJxApi(
  baseUrl: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): JxApi {
  const root = new URL(baseUrl);

  async function get(path: string, query: Query = {}) {
    const url = new URL(path, root);
    for (const [name, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(name, String(value));
      }
    }

    const response = await fetchImpl(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
    const body = await response.text();
    if (!response.ok) {
      throw new JxApiError(describeProblem(response.status, body));
    }

    return JSON.parse(body) as unknown;
  }

  return { get };
}
