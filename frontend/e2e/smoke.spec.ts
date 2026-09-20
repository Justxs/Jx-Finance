import { expect, type Page, test } from "@playwright/test";
import { z } from "zod";
import { readJson } from "./support";

const admin = {
  displayName: "E2E Admin",
  email: "e2e-admin@localhost.test",
  password: "E2e-Smoke-Password-123!",
};

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password", { exact: true }).fill(admin.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("link", { name: "Transactions" }).first()).toBeVisible();
}

test("a fresh install asks for the administrator, then for a sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/setup$/);

  await page.getByLabel("Display name").fill(admin.displayName);
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password", { exact: true }).fill(admin.password);
  await page.getByRole("button", { name: "Create admin account" }).click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("setup is closed once an administrator exists", async ({ page }) => {
  await page.goto("/setup");

  await expect(page).toHaveURL(/\/login/);
});

test("a wrong password is refused with a translated message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(admin.email);
  await page.getByLabel("Password", { exact: true }).fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByText("Wrong email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("an account added through the form shows up with its balance", async ({ page }) => {
  await signIn(page);
  await page.goto("/accounts");
  await page.getByRole("button", { name: "Add account" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Name").fill("E2E checking");
  await dialog.getByLabel("Starting balance").fill("1000.00");
  await dialog.getByRole("button", { name: "Add", exact: true }).click();

  await expect(dialog).toBeHidden();
  const row = page.getByRole("row", { name: /E2E checking/ });
  await expect(row).toBeVisible();
  await expect(row).toContainText("1,000.00");
});

test("a transaction posted to the API appears in the ledger and moves the balance", async ({
  page,
}) => {
  await signIn(page);
  const accounts = await page.request.get("/api/accounts");
  const account = (
    await readJson(accounts, z.array(z.object({ id: z.string(), name: z.string() })))
  ).find((candidate) => candidate.name === "E2E checking");
  expect(account).toBeDefined();
  const categories = await page.request.get("/api/categories");
  const category = (
    await readJson(categories, z.array(z.object({ id: z.string(), type: z.string() })))
  ).find((candidate) => candidate.type === "expense");
  expect(category).toBeDefined();

  const created = await page.request.post("/api/transactions", {
    data: {
      accountId: account?.id,
      categoryId: category?.id,
      type: "expense",
      amount: "12.50",
      date: new Date().toISOString().slice(0, 10),
      description: "E2E smoke lunch",
    },
  });
  expect(created.status()).toBe(201);

  await page.goto("/transactions");
  await expect(page.getByRole("row", { name: /E2E smoke lunch/ })).toBeVisible();

  const refreshed = await page.request.get("/api/accounts");
  const balance = (
    await readJson(refreshed, z.array(z.object({ id: z.string(), currentBalance: z.string() })))
  ).find((candidate) => candidate.id === account?.id)?.currentBalance;
  expect(balance).toBe("987.50");
});

test("signing out returns to the login page and protects the app", async ({ page }) => {
  await signIn(page);
  await page.getByRole("button", { name: /log out/i }).click();

  await expect(page).toHaveURL(/\/login/);
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login/);
});
