const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

let setupNeededCache: boolean | null = null;
let authenticatedCache: boolean | null = null;

export function setSetupNeeded(value: boolean) {
  setupNeededCache = value;
}

export function setAuthenticated(value: boolean) {
  authenticatedCache = value;
}

export async function checkSetupNeeded(): Promise<boolean> {
  if (setupNeededCache !== null) {
    return setupNeededCache;
  }

  try {
    const response = await fetch(`${baseUrl}/api/setup/status`, { credentials: "include" });
    const body = (await response.json()) as { needsSetup: boolean };
    setupNeededCache = body.needsSetup;
    return setupNeededCache;
  } catch {
    return false;
  }
}

export async function checkIsAuthenticated(): Promise<boolean> {
  if (authenticatedCache !== null) {
    return authenticatedCache;
  }

  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, { credentials: "include" });
    authenticatedCache = response.ok;
    return authenticatedCache;
  } catch {
    authenticatedCache = false;
    return false;
  }
}

export async function checkIsAdmin(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, { credentials: "include" });
    if (!response.ok) {
      return false;
    }
    const body = (await response.json()) as { role: string };
    return body.role === "Admin";
  } catch {
    return false;
  }
}
