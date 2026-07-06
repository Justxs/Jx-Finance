const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

export async function checkSetupNeeded(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/setup/status`, { credentials: "include" });
    const body = (await response.json()) as { needsSetup: boolean };
    return body.needsSetup;
  } catch {
    return false;
  }
}

export async function checkIsAuthenticated(): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/auth/me`, { credentials: "include" });
    return response.ok;
  } catch {
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
