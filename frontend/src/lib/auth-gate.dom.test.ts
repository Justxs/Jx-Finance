import { QueryClient } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { UserRole } from "@/lib/user-role";
import { freshModuleLoader } from "@/test/fresh-module";
import { seedPreferences, storedPreferences } from "@/test/preferences";

const fetchMock = vi.fn<typeof fetch>();

const loadGate = await freshModuleLoader(() => import("./auth-gate"));

function json(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { "content-type": "application/json" },
  });
}

function queryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

function requestedUrls() {
  return fetchMock.mock.calls.map(([url]) => url);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("checkSetupNeeded", () => {
  test("asks the API once and caches the answer", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({ needsSetup: true }));
    const client = queryClient();

    await expect(gate.checkSetupNeeded(client)).resolves.toBe(true);
    await expect(gate.checkSetupNeeded(client)).resolves.toBe(true);
    expect(requestedUrls()).toEqual(["/api/setup/status"]);
  });

  test("a known answer skips the request", async () => {
    const gate = await loadGate();
    const client = queryClient();
    gate.setSetupNeeded(client, false);

    await expect(gate.checkSetupNeeded(client)).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a failed request assumes no setup and asks again next time", async () => {
    const gate = await loadGate();
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    fetchMock.mockResolvedValueOnce(json({ needsSetup: true }));
    const client = queryClient();

    await expect(gate.checkSetupNeeded(client)).resolves.toBe(false);
    await expect(gate.checkSetupNeeded(client)).resolves.toBe(true);
  });
});

describe("checkIsAuthenticated", () => {
  test("follows the status of the me endpoint and caches it", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({ role: "User" }));

    const client = queryClient();
    await expect(gate.checkIsAuthenticated(client)).resolves.toBe(true);
    await expect(gate.checkIsAuthenticated(client)).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/me",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  test("an expired access cookie is renewed before giving up", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValueOnce(json({}, { status: 401 }));
    fetchMock.mockResolvedValueOnce(json({}));
    fetchMock.mockResolvedValueOnce(json({ role: "User" }));

    await expect(gate.checkIsAuthenticated(queryClient())).resolves.toBe(true);
    expect(requestedUrls()).toEqual(["/api/auth/me", "/api/auth/refresh", "/api/auth/me"]);
  });

  test("a 401 that survives the refresh means signed out", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({}, { status: 401 }));

    await expect(gate.checkIsAuthenticated(queryClient())).resolves.toBe(false);
  });

  test("a network failure means signed out and is cached", async () => {
    const gate = await loadGate();
    fetchMock.mockRejectedValue(new TypeError("offline"));

    await expect(gate.checkIsAuthenticated(queryClient())).resolves.toBe(false);
    await expect(gate.checkIsAuthenticated(queryClient())).resolves.toBe(false);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  test("login and logout overwrite the cache", async () => {
    const gate = await loadGate();
    gate.setAuthenticated(true);
    await expect(gate.checkIsAuthenticated(queryClient())).resolves.toBe(true);

    gate.setAuthenticated(false);
    await expect(gate.checkIsAuthenticated(queryClient())).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("endSession", () => {
  test("signs out, forgets the user's own preferences and keeps the device's", async () => {
    seedPreferences({
      theme: "dark",
      pageSize: 50,
      activeHouseholdId: "8f14e45f-ceea-467a-9f5b-2a1b7c3d4e5f",
      lastAccountId: "1679091c-5a88-4faf-9b4c-3d2e1f0a9b8c",
      commandRecents: ["accounts"],
      paceMilestones: [100_000],
      monthClosePromptHidden: "2026-09",
    });
    const gate = await loadGate();
    gate.setAuthenticated(true);
    const client = queryClient();
    client.setQueryData(["/api/accounts"], []);
    const navigate = vi.fn();

    gate.endSession(client, navigate);

    expect(gate.hasSession()).toBe(false);
    expect(client.getQueryData(["/api/accounts"])).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith({ to: "/login" });
    const stored = storedPreferences();
    expect(stored).toEqual(expect.objectContaining({ theme: "dark", pageSize: 50 }));
    for (const forgotten of [
      "activeHouseholdId",
      "lastAccountId",
      "commandRecents",
      "paceMilestones",
      "monthClosePromptHidden",
    ]) {
      expect(stored).not.toHaveProperty(forgotten);
    }
  });
});

describe("checkIsAdmin", () => {
  test.each([
    [UserRole.admin, true],
    ["User", false],
  ])("role %s gives %s", async (role, expected) => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({ role }));

    await expect(gate.checkIsAdmin(queryClient())).resolves.toBe(expected);
  });

  test("signed out or offline is not admin", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({}, { status: 401 }));
    await expect(gate.checkIsAdmin(queryClient())).resolves.toBe(false);

    fetchMock.mockRejectedValue(new TypeError("offline"));
    await expect(gate.checkIsAdmin(queryClient())).resolves.toBe(false);
  });

  test("reuses the profile the router already loaded", async () => {
    const gate = await loadGate();
    fetchMock.mockResolvedValue(json({ role: UserRole.admin }));
    const client = queryClient();

    await gate.checkIsAdmin(client);
    await gate.checkIsAdmin(client);

    expect(fetchMock).toHaveBeenCalledOnce();
  });
});
