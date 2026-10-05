import { expect, test } from "./support";

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

test("the navigation strip moves between pages on a phone", async ({ page }) => {
  await page.goto("/dashboard");
  const navigation = page.getByRole("navigation", { name: "Main navigation" });
  await expect(navigation).toHaveCount(1);
  await expect(navigation.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await navigation.getByRole("link", { name: "Accounts" }).click();
  await expect(page).toHaveURL(/\/accounts$/);
  await expect(page.getByRole("heading", { level: 1, name: "Accounts" })).toBeVisible();

  await navigation.getByRole("link", { name: "Reports" }).click();
  await expect(page).toHaveURL(/\/reports/);
  await expect(page.getByRole("heading", { level: 1, name: "Reports" })).toBeVisible();

  const overflow = await page
    .locator("html")
    .evaluate((root) => root.scrollWidth - root.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
