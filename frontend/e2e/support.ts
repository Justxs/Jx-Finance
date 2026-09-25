import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type APIRequestContext,
  type Browser,
  type BrowserContext,
  type Locator,
  type Page,
  type TestInfo,
  test as base,
  expect,
} from "@playwright/test";
import { z } from "zod";
import { adminStatePath } from "../playwright.config";
import type { AccountType } from "../src/api/generated/model/accountType";
import type { Currency } from "../src/api/generated/model/currency";
import type { FeatureFlags } from "../src/api/generated/model/featureFlags";
import { SettingsResponse, UpdateSettingsBody } from "../src/api/schemas/index.zod";
import { UserRole } from "../src/lib/user-role";

export const admin = {
  displayName: "E2E Admin",
  email: "e2e-admin@localhost.test",
  password: "E2e-Smoke-Password-123!",
};

export function clientAddress(testInfo: TestInfo, salt = "") {
  const hash = createHash("sha256")
    .update(`${testInfo.titlePath.join("/")}/${salt}`)
    .digest();
  return `10.${hash[0]}.${hash[1]}.${(hash[2] ?? 0) % 254 || 1}`;
}

export function unique(prefix: string) {
  return `${prefix} ${randomUUID().slice(0, 8)}`;
}

export function uniqueEmail(prefix: string) {
  return `${unique(prefix).replace(" ", "-")}@localhost.test`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export async function saveAdminState(context: BrowserContext) {
  const state = await context.storageState();
  mkdirSync(path.dirname(adminStatePath), { recursive: true });
  writeFileSync(adminStatePath, JSON.stringify({ cookies: state.cookies, origins: [] }));
}

export async function fillSignIn(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function expectSignedIn(page: Page) {
  await expect(page.getByRole("link", { name: "Transactions" }).first()).toBeVisible();
}

export async function signIn(page: Page, email = admin.email, password = admin.password) {
  await fillSignIn(page, email, password);
  await expectSignedIn(page);
}

export async function newVisitor(browser: Browser, testInfo: TestInfo, salt: string) {
  const visitor = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    storageState: { cookies: [], origins: [] },
    extraHTTPHeaders: { "X-Forwarded-For": clientAddress(testInfo, salt) },
  });
  return visitor.newPage();
}

type JsonResponse = Awaited<ReturnType<APIRequestContext["get"]>>;

export async function readJson<T>(response: JsonResponse, schema: z.ZodType<T>): Promise<T> {
  return schema.parse(await response.json());
}

const createdBody = z.object({ id: z.string() });

async function created(response: JsonResponse) {
  expect(response.status(), await response.text()).toBe(201);
  return (await readJson(response, createdBody)).id;
}

export async function createAccount(
  request: APIRequestContext,
  name: string,
  options: { currency?: Currency; startingBalance?: string; type?: AccountType } = {},
) {
  return created(
    await request.post("/api/accounts", {
      data: {
        name,
        description: null,
        iban: null,
        type: options.type ?? "checking",
        startingBalance: options.startingBalance ?? "1000.00",
        currency: options.currency ?? "eur",
        scope: "personal",
        householdId: null,
      },
    }),
  );
}

export async function createMember(request: APIRequestContext, email: string, password: string) {
  return created(
    await request.post("/api/users", {
      data: { email, displayName: email.split("@")[0], role: UserRole.member, password },
    }),
  );
}

export async function setFeature(
  request: APIRequestContext,
  feature: keyof FeatureFlags,
  enabled: boolean,
) {
  const current = await request.get("/api/settings");
  expect(current.ok()).toBe(true);
  const settings = await readJson(current, SettingsResponse);
  const updated = await request.put("/api/settings", {
    data: UpdateSettingsBody.parse({
      ...settings,
      features: { ...settings.features, [feature]: enabled },
    }),
  });
  expect(updated.ok(), await updated.text()).toBe(true);
}

export const test = base.extend<{ keepAdminState: undefined }>({
  extraHTTPHeaders: async ({ browserName: _browserName }, provide, testInfo) => {
    await provide({ "X-Forwarded-For": clientAddress(testInfo) });
  },
  keepAdminState: [
    async ({ context }, provide) => {
      const me = await context.request.get("/api/auth/me");
      if (me.status() === 401) {
        const refreshed = await context.request.post("/api/auth/refresh");
        if (!refreshed.ok()) {
          const signedIn = await context.request.post("/api/auth/login", {
            data: {
              email: admin.email,
              password: admin.password,
              rememberMe: false,
              twoFactorCode: null,
            },
          });
          expect(signedIn.ok(), await signedIn.text()).toBe(true);
        }
      }
      await provide(undefined);
      const cookies = await context.cookies();
      if (cookies.some((cookie) => cookie.name === "jx_refresh")) {
        await saveAdminState(context);
      }
    },
    { auto: true },
  ],
});

export { expect };

export async function choose(page: Page, trigger: Locator, option: string | RegExp) {
  await trigger.click();
  await page.getByRole("option", { name: option }).click();
  await expect(page.getByRole("listbox")).toHaveCount(0);
}
