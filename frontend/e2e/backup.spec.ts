import { admin, expect, signIn, test, unique } from "./support";

test("a backup is taken and restored with the administrator's password", async ({ page }) => {
  const note = unique("E2E backup");

  await page.goto("/settings?section=backups");
  await page.getByLabel("Note").fill(note);
  await page.getByRole("button", { name: "Back up now" }).click();
  const row = page.getByRole("row").filter({ hasText: note });
  await expect(row).toBeVisible();

  await row.getByRole("button", { name: /^Restore:/ }).click();
  const confirm = page.getByRole("alertdialog");
  const replace = confirm.getByRole("button", { name: "Replace all data" });
  await expect(replace).toBeDisabled();
  await confirm.getByLabel("Type RESTORE to confirm").fill("RESTORE");
  await confirm.getByLabel("Current password").fill("not-the-admin-password");
  await replace.click();
  await expect(confirm.getByText("The current password is wrong.")).toBeVisible();

  await confirm.getByLabel("Current password").fill(admin.password);
  await replace.click();
  await expect(page).toHaveURL(/\/login/, { timeout: 60_000 });

  await signIn(page);
  await page.goto("/settings?section=backups");
  await expect(page.getByRole("row").filter({ hasText: note })).toBeVisible();
});
