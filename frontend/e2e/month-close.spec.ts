import { MonthCloseYearResponse, MonthReviewResponse } from "../src/api/schemas/index.zod";
import {
  createAccount,
  createTransaction,
  expect,
  readJson,
  signedInMember,
  test,
  unique,
} from "./support";

function previousMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const key = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`;
  const name = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { key, name, year: start.getFullYear() };
}

test("a member works through last month on its page and closes it with a note", async ({
  page,
  browser,
}, testInfo) => {
  const month = previousMonth();
  const note = unique("Matched the bank statement");
  const { member } = await signedInMember(page, browser, testInfo, "month-close");
  const accountId = await createAccount(member.request, unique("Close account"));
  await createTransaction(member.request, accountId, unique("Rent"), "640.00", {
    date: `${month.key}-05`,
  });
  await createTransaction(member.request, accountId, unique("Salary"), "2100.00", {
    type: "income",
    date: `${month.key}-20`,
  });

  await member.goto(`/?month=${month.key}`);
  await member.getByRole("link", { name: "Review month" }).click();
  await expect(member).toHaveURL(new RegExp(`/reports/month\\?month=${month.key}$`));
  await expect(member.getByRole("heading", { name: `${month.name} has ended` })).toBeVisible();
  await expect(member.getByRole("status").first()).toContainText("lines still open");
  const uncategorized = member.getByRole("region", { name: /^Uncategorized/ });
  await expect(uncategorized.getByRole("combobox", { name: /^Category for / })).toHaveCount(2);

  await member.getByLabel("Note", { exact: true }).fill(note);
  await member.getByRole("button", { name: `Close ${month.name}`, exact: true }).click();
  const dialog = member.getByRole("alertdialog");
  await expect(dialog).toContainText("2 items still need attention");
  await dialog.getByRole("button", { name: "Close anyway" }).click();
  await expect(dialog).toBeHidden();

  await expect(member.getByRole("heading", { name: `${month.name} is closed` })).toBeVisible();
  await expect(member.getByText(/^Closed on /)).toBeVisible();
  await expect(member.getByText(note)).toBeVisible();
  await expect(member.getByText("Income kept")).toBeVisible();
  await expect(member.getByRole("heading", { name: /^Uncategorized/ })).toBeHidden();
  await expect(member.getByRole("button", { name: "Reopen" })).toBeVisible();
  await expect(member.getByRole("button", { name: "Edit note" })).toBeVisible();

  const review = await readJson(
    await member.request.get(`/api/month-close/${month.key}`),
    MonthReviewResponse,
  );
  expect(review.status).toBe("closed");
  expect(review.note).toBe(note);
  const year = await readJson(
    await member.request.get(`/api/month-close?year=${month.year}`),
    MonthCloseYearResponse,
  );
  expect(year.months.find((entry) => entry.month === `${month.key}-01`)?.status).toBe("closed");

  await member.context().close();
});
