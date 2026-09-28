import { expect, test } from "./support";

test("the account menu turns a page Lithuanian and back", async ({ page }) => {
  await page.goto("/accounts");
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();

  await page.getByRole("button", { name: /Account menu/ }).click();
  await page.getByRole("menuitem", { name: /^Language/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { level: 1, name: "Sąskaitos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pridėti sąskaitą" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "lt");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Sąskaitos" })).toBeVisible();

  await page.getByRole("button", { name: /Paskyros meniu/ }).click();
  await page.getByRole("menuitem", { name: /^Kalba/ }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
});
