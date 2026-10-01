import type { Page } from "@playwright/test";
import {
  CreateRecurringBillBody,
  CreateRecurringBillResponse,
  RecurringBillsResponse,
} from "../src/api/schemas/index.zod";
import { choose, createAccount, expect, readJson, test, today, unique } from "./support";

function isoOf(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthlyDueDates() {
  const due = new Date(`${today()}T00:00:00Z`);
  due.setUTCDate(due.getUTCDate() + 2);
  if (due.getUTCDate() > 28) {
    due.setUTCMonth(due.getUTCMonth() + 1, 1);
  }
  const following = new Date(due);
  following.setUTCMonth(following.getUTCMonth() + 1);
  return { first: isoOf(due), second: isoOf(following) };
}

function chipOn(page: Page, iso: string, name: string) {
  return page
    .getByRole("cell")
    .filter({ has: page.locator(`time[datetime="${iso}"]`) })
    .getByRole("listitem")
    .filter({ hasText: name });
}

test("a recurring bill is created and its payment confirmed", async ({ page }) => {
  const account = unique("Bills account");
  const bill = unique("Internet");
  await createAccount(page.request, account);

  await page.goto("/recurring-bills");
  await page.getByRole("button", { name: "Add recurring entry" }).click();
  const create = page.getByRole("dialog");
  await create.getByLabel("Name").fill(bill);
  await create.getByLabel("Amount").fill("24,90");
  await create.getByRole("button", { name: "Add recurring entry" }).click();
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

  const bills = await readJson(
    await page.request.get("/api/recurring-bills"),
    RecurringBillsResponse,
  );
  expect((bills.find((item) => item.name === bill)?.nextDueDate ?? "") > today()).toBe(true);

  await page.goto(`/transactions?search=${encodeURIComponent(bill)}`);
  const entry = page.getByRole("cell", { name: bill, exact: true });
  await expect(page.getByRole("row").filter({ has: entry })).toContainText("24.90");
});

test("the calendar shows a monthly entry on its due day and the next month", async ({ page }) => {
  const account = unique("Calendar account");
  const bill = unique("Gym");
  const accountId = await createAccount(page.request, account);
  const { first, second } = monthlyDueDates();
  const response = await page.request.post("/api/recurring-bills", {
    data: CreateRecurringBillBody.parse({
      name: bill,
      shape: "expense",
      kind: "fixed",
      amount: "31.40",
      categoryId: null,
      accountId,
      toAccountId: null,
      cadence: "monthly",
      nextDueDate: first,
      remindDaysBefore: 0,
      matchKey: null,
      debtId: null,
      scope: "personal",
      householdId: null,
      spreadMonths: null,
    }),
  });
  expect(response.status(), await response.text()).toBe(201);
  const created = await readJson(response, CreateRecurringBillResponse);

  await page.goto("/recurring-bills");
  await page.getByRole("radio", { name: "Calendar" }).click();
  await expect(page).toHaveURL(/view=calendar/);
  await page.goto(`/recurring-bills?view=calendar&month=${first.slice(0, 7)}`);

  const chip = chipOn(page, first, bill);
  await expect(chip).toContainText("31.40");
  await expect(chip).toContainText("Due");

  await chip.getByRole("button", { name: bill }).click();
  const confirm = page.getByRole("dialog");
  await expect(confirm.getByRole("heading", { name: "Confirm recurring entry" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(confirm).toBeHidden();

  await page.getByRole("button", { name: "Next month" }).click();
  await expect(page).toHaveURL(new RegExp(`month=${second.slice(0, 7)}`));
  const next = chipOn(page, second, bill);
  await expect(next).toContainText("31.40");
  await expect(next).toContainText("Due");

  const deleted = await page.request.delete(`/api/recurring-bills/${created.id}`);
  expect(deleted.ok(), await deleted.text()).toBe(true);
});
