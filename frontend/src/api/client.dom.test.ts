import { beforeEach, describe, expect, test, vi } from "vitest";
import { type ApiError, customFetch } from "./client";

const fetchMock = vi.fn<typeof fetch>();

function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

function calledUrls() {
  return fetchMock.mock.calls.map(([url]) => url);
}

function sentInit(call = 0) {
  return fetchMock.mock.calls[call]?.[1] ?? {};
}

async function rejection(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    return error as ApiError;
  }
  throw new Error("expected the request to fail");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("requests", () => {
  test("sends cookies and returns parsed JSON", async () => {
    fetchMock.mockResolvedValueOnce(json({ id: "1" }));

    await expect(customFetch("/api/accounts")).resolves.toEqual({ id: "1" });
    expect(calledUrls()).toEqual(["/api/accounts"]);
    expect(sentInit()).toMatchObject({ credentials: "include", headers: {} });
  });

  test("reads vendor JSON content types", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response('{"ok":true}', { headers: { "content-type": "application/hal+json" } }),
    );

    await expect(customFetch("/api/x")).resolves.toEqual({ ok: true });
  });

  test("returns text for non-JSON responses", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("date,amount", { headers: { "content-type": "text/csv" } }),
    );

    await expect(customFetch("/api/export")).resolves.toBe("date,amount");
  });

  test("JSON bodies get a content type and normalized money fields", async () => {
    fetchMock.mockResolvedValueOnce(json({}));

    await customFetch("/api/transactions", {
      method: "POST",
      body: JSON.stringify({
        amount: " 12,50 ",
        description: "1,5 kg",
        lines: [{ amount: "0,99", note: "a,b" }],
        quantity: 2,
      }),
    });

    expect(sentInit().headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(sentInit().body as string)).toEqual({
      amount: "12.50",
      description: "1,5 kg",
      lines: [{ amount: "0.99", note: "a,b" }],
      quantity: 2,
    });
  });

  test("keeps the content type of the caller and leaves that body alone", async () => {
    fetchMock.mockResolvedValueOnce(json({}));

    await customFetch("/api/raw", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: '{"amount":"1,5"}',
    });

    expect(sentInit().headers).toEqual({ "Content-Type": "text/plain" });
    expect(sentInit().body).toBe('{"amount":"1,5"}');
  });

  test("form data uploads set no content type", async () => {
    fetchMock.mockResolvedValueOnce(json({}));
    const body = new FormData();
    body.append("file", new Blob(["a"]), "a.csv");

    await customFetch("/api/import/preview", { method: "POST", body });

    expect(sentInit().headers).toEqual({});
    expect(sentInit().body).toBe(body);
  });
});

describe("session renewal", () => {
  test("a 401 refreshes the session once and retries", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(json({ id: "1" }));

    await expect(customFetch("/api/accounts")).resolves.toEqual({ id: "1" });
    expect(calledUrls()).toEqual(["/api/accounts", "/api/auth/refresh", "/api/accounts"]);
    expect(sentInit(1)).toMatchObject({ method: "POST", credentials: "include" });
  });

  test("concurrent 401s share one refresh", async () => {
    const attempts = new Map<string, number>();
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url === "/api/auth/refresh") {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      const attempt = (attempts.get(url) ?? 0) + 1;
      attempts.set(url, attempt);
      return Promise.resolve(attempt === 1 ? json({}, { status: 401 }) : json({ url }));
    });

    await expect(Promise.all([customFetch("/api/a"), customFetch("/api/b")])).resolves.toEqual([
      { url: "/api/a" },
      { url: "/api/b" },
    ]);
    expect(calledUrls().filter((url) => url === "/api/auth/refresh")).toHaveLength(1);
  });

  test("a second 401 announces the expired session and throws", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(json({ title: "Unauthorized" }, { status: 401 })),
    );
    const onExpired = vi.fn();
    window.addEventListener("jx:session-expired", onExpired);

    const error = await rejection(customFetch("/api/accounts"));
    window.removeEventListener("jx:session-expired", onExpired);

    expect(error).toMatchObject({ status: 401, title: "Unauthorized" });
    expect(onExpired).toHaveBeenCalledOnce();
  });

  test("a failed refresh still retries and reports the 401", async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, { status: 401 }))
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(json({}, { status: 401 }));

    await expect(rejection(customFetch("/api/accounts"))).resolves.toMatchObject({ status: 401 });
  });

  test.each(["/api/auth/login", "/api/auth/refresh", "/api/auth/2fa/verify"])(
    "%s never renews the session",
    async (url) => {
      fetchMock.mockResolvedValueOnce(json({ title: "Nope" }, { status: 401 }));
      const onExpired = vi.fn();
      window.addEventListener("jx:session-expired", onExpired);

      const error = await rejection(customFetch(url, { method: "POST" }));
      window.removeEventListener("jx:session-expired", onExpired);

      expect(error.status).toBe(401);
      expect(fetchMock).toHaveBeenCalledOnce();
      expect(onExpired).not.toHaveBeenCalled();
    },
  );
});

describe("errors", () => {
  test("problem details pass through", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ title: "Conflict", detail: "Name is taken." }), {
        status: 409,
        headers: { "content-type": "application/problem+json" },
      }),
    );

    await expect(rejection(customFetch("/api/accounts"))).resolves.toEqual({
      status: 409,
      title: "Conflict",
      detail: "Name is taken.",
      errors: undefined,
    });
  });

  test("validation reasons join into the detail", async () => {
    const errors = [
      { name: "amount", reason: "Amount is required." },
      { name: "date", reason: "Date is invalid." },
    ];
    fetchMock.mockResolvedValueOnce(json({ title: "Invalid", errors }, { status: 400 }));

    await expect(rejection(customFetch("/api/transactions"))).resolves.toEqual({
      status: 400,
      title: "Invalid",
      detail: "Amount is required. Date is invalid.",
      errors,
    });
  });

  test("non-JSON failures fall back to the status text", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("<html>bad gateway</html>", { status: 502, statusText: "Bad Gateway" }),
    );

    await expect(rejection(customFetch("/api/accounts"))).resolves.toEqual({
      status: 502,
      title: "Bad Gateway",
      detail: undefined,
      errors: undefined,
    });
  });

  test("a malformed errors field is dropped", async () => {
    fetchMock.mockResolvedValueOnce(json({ title: "Invalid", errors: "nope" }, { status: 400 }));

    const error = await rejection(customFetch("/api/transactions"));

    expect(error.errors).toBeUndefined();
    expect(error.detail).toBeUndefined();
  });
});
