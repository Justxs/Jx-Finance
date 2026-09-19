import { beforeEach, describe, expect, test, vi } from "vitest";

const fetchMock = vi.fn<typeof fetch>();

async function loadGate() {
  vi.resetModules();
  return import("./auth-gate");
}

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), init);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("checkSetupNeeded", () => {
  test("asks the API once and caches the answer", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({ needsSetup: true }));

    await expect(gate.checkSetupNeeded()).resolves.toBe(true);
    await expect(gate.checkSetupNeeded()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/setup/status", {
      credentials: "include",
    });
  });

  test("a known answer skips the request", async () => {
    const gate = await loadGate();
    gate.setSetupNeeded(false);

    await expect(gate.checkSetupNeeded()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a failed request assumes no setup and asks again next time", async () => {
    const gate = await loadGate();
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    fetchMock.mockResolvedValueOnce(json({ needsSetup: true }));

    await expect(gate.checkSetupNeeded()).resolves.toBe(false);
    await expect(gate.checkSetupNeeded()).resolves.toBe(true);
  });
});

describe("checkIsAuthenticated", () => {
  test("follows the status of the me endpoint and caches it", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({ role: "User" }));

    await expect(gate.checkIsAuthenticated()).resolves.toBe(true);
    await expect(gate.checkIsAuthenticated()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith("/api/auth/me", { credentials: "include" });
  });

  test("a 401 means signed out", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({}, { status: 401 }));

    await expect(gate.checkIsAuthenticated()).resolves.toBe(false);
  });

  test("a network failure means signed out and is cached", async () => {
    const gate = await loadGate();
    fetchMock.mockRejectedValue(new TypeError("offline"));

    await expect(gate.checkIsAuthenticated()).resolves.toBe(false);
    await expect(gate.checkIsAuthenticated()).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test("login and logout overwrite the cache", async () => {
    const gate = await loadGate();
    gate.setAuthenticated(true);
    await expect(gate.checkIsAuthenticated()).resolves.toBe(true);

    gate.setAuthenticated(false);
    await expect(gate.checkIsAuthenticated()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("checkIsAdmin", () => {
  test.each([
    ["Admin", true],
    ["User", false],
  ])("role %s gives %s", async (role, expected) => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({ role }));

    await expect(gate.checkIsAdmin()).resolves.toBe(expected);
  });

  test("signed out or offline is not admin", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValueOnce(json({}, { status: 401 }));
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));

    await expect(gate.checkIsAdmin()).resolves.toBe(false);
    await expect(gate.checkIsAdmin()).resolves.toBe(false);
  });

  test("always asks the API", async () => {
    const gate = await loadGate();
    fetchMock.mockImplementation(() => Promise.resolve(json({ role: "Admin" })));

    await gate.checkIsAdmin();
    await gate.checkIsAdmin();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
