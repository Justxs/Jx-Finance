import { admin, expect, expectSignedIn, fillSignIn, newVisitor, test, unique } from "./support";

test("an administrator creates, deactivates, reactivates a member and resets their password", async ({
  page,
  browser,
}, testInfo) => {
  const name = unique("Member");
  const email = `${name.replace(" ", "-").toLowerCase()}@localhost.test`;
  const firstPassword = "First-Password-123!";
  const temporaryPassword = "Temporary-Password-456!";

  await page.goto("/users");
  await page.getByRole("button", { name: "Create user" }).click();
  const create = page.getByRole("dialog");
  await create.getByLabel("Display name").fill(name);
  await create.getByLabel("Email").fill(email);
  await create.getByLabel("Password", { exact: true }).fill(firstPassword);
  await create.getByRole("button", { name: "Create user" }).click();
  await expect(create).toBeHidden();

  const row = page.getByRole("row", { name: new RegExp(name) });
  await expect(row).toContainText("Active");

  await row.getByRole("button", { name: `Deactivate: ${name}` }).click();
  const confirm = page.getByRole("alertdialog");
  await expect(confirm).toContainText("signed out everywhere");
  await confirm.getByRole("button", { name: "Deactivate" }).click();
  await expect(row).toContainText("Deactivated");

  await row.getByRole("button", { name: `Reactivate: ${name}` }).click();
  await expect(row.getByRole("button", { name: `Deactivate: ${name}` })).toBeVisible();

  await row.getByRole("button", { name: `Reset password: ${name}` }).click();
  const reset = page.getByRole("dialog");
  await reset.getByLabel("Temporary password").fill(temporaryPassword);
  await reset.getByLabel("Your current password").fill("not-the-admin-password");
  await reset.getByRole("button", { name: "Reset password" }).click();
  await expect(reset.getByText("The current password is wrong.")).toBeVisible();
  await expect(reset.getByLabel("Your current password")).toHaveValue("");

  await reset.getByLabel("Your current password").fill(admin.password);
  await reset.getByRole("button", { name: "Reset password" }).click();
  await expect(reset).toBeHidden();

  const visitor = await newVisitor(browser, testInfo, "member");
  const memberPage = await visitor.newPage();
  await fillSignIn(memberPage, email, firstPassword);
  await expect(memberPage.getByText("Wrong email or password.")).toBeVisible();
  await fillSignIn(memberPage, email, temporaryPassword);
  await expectSignedIn(memberPage);
  await expect(memberPage.getByRole("link", { name: "Users" })).toHaveCount(0);
  await visitor.close();
});
