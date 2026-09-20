import { choose, createAccount, expect, test, today, unique } from "./support";

test("a recurring bill is created and its payment confirmed", async ({ page }) => {
  const account = unique("Bills account");
  const bill = unique("Internet");
  await createAccount(page.request, account);

  await page.goto("/recurring-bills");
  await page.getByRole("button", { name: "Add recurring bill" }).first().click();
  const create = page.getByRole("dialog");
  await create.getByLabel("Name").fill(bill);
  await create.getByLabel("Amount").fill("24,90");
  await create.getByRole("button", { name: "Add recurring bill" }).click();
  await expect(create).toBeHidden();

  const row = page.getByRole("listitem").filter({ hasText: bill });
  await expect(row).toContainText("24.90");

  await row.getByRole("button", { name: "Record payment" }).click();
  const confirm = page.getByRole("dialog");
  await expect(confirm).toContainText(bill);
  await confirm.getByRole("button", { name: "Confirm" }).click();
  await expect(confirm.getByText("This field is required.")).toBeVisible();
  await choose(page, confirm.getByRole("combobox", { name: "Account" }), account);
  await confirm.getByRole("button", { name: "Confirm" }).click();
  await expect(confirm).toBeHidden();

  const bills = (await (await page.request.get("/api/recurring-bills")).json()) as {
    name: string;
    nextDueDate: string;
  }[];
  expect((bills.find((item) => item.name === bill)?.nextDueDate ?? "") > today()).toBe(true);

  await page.goto(`/transactions?search=${encodeURIComponent(bill)}`);
  await expect(page.getByRole("row", { name: new RegExp(bill) })).toContainText("24.90");
});
