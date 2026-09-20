import { expect, test } from "./support";

test("the language toggle turns a page Lithuanian and back", async ({ page }) => {
  await page.goto("/accounts");
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();

  await page.getByRole("button", { name: "EN, Lietuvių" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Sąskaitos" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pridėti sąskaitą" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "lt");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: "Sąskaitos" })).toBeVisible();

  await page.getByRole("button", { name: "LT, English" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();
});
