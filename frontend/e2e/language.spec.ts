import type { Page } from "@playwright/test";
import { MeResponse } from "../src/api/schemas/auth/auth.zod";
import { expect, readJson, test } from "./support";

async function savedLanguage(page: Page) {
  return (await readJson(await page.request.get("/api/auth/me"), MeResponse)).language;
}

test("the account menu turns a page Lithuanian and back", async ({ page }) => {
  await page.goto("/accounts");
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();

  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: /^Language/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { level: 1, name: "Sąskaitos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pridėti sąskaitą" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "lt");
  await expect.poll(() => savedLanguage(page)).toBe("lt");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Sąskaitos" })).toBeVisible();

  await page.getByRole("button", { name: /Paskyros meniu/ }).click();
  await page.getByRole("menuitem", { name: /^Kalba/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
  await expect.poll(() => savedLanguage(page)).toBe("en");
});
