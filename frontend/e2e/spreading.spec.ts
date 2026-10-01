import type { APIRequestContext } from "@playwright/test";
import {
  CreateCategoryResponse,
  ReportSummaryResponse,
  TransactionsResponse,
} from "../src/api/schemas/index.zod";
import { choose, createAccount, expect, readJson, test, unique } from "./support";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthAfter(date: string) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return {
    dateFrom: isoDate(new Date(Date.UTC(year, month, 1))),
    dateTo: isoDate(new Date(Date.UTC(year, month + 1, 0))),
  };
}

async function createExpenseCategory(request: APIRequestContext, name: string) {
  const response = await request.post("/api/categories", {
    data: { name, type: "expense", icon: null, scope: "personal", householdId: null },
  });
  expect(response.status(), await response.text()).toBe(201);
  return (await readJson(response, CreateCategoryResponse)).id;
}

async function categoryAmount(
  request: APIRequestContext,
  range: { dateFrom: string; dateTo: string },
  categoryId: string,
) {
  const summary = await readJson(
    await request.get(`/api/reports/summary?dateFrom=${range.dateFrom}&dateTo=${range.dateTo}`),
    ReportSummaryResponse,
  );
  return summary.expenseByCategory.find((item) => item.categoryId === categoryId)?.amount;
}

test("a payment spread over three months counts one slice in a later month's report", async ({
  page,
}) => {
  const account = unique("Spread account");
  const category = unique("Car insurance");
  const payment = unique("Insurance premium");
  await createAccount(page.request, account);
  const categoryId = await createExpenseCategory(page.request, category);

  await page.goto(`/transactions?search=${encodeURIComponent(payment)}`);
  await page.getByRole("button", { name: "Add transaction", exact: true }).click();
  const create = page.getByRole("dialog");
  await choose(page, create.getByRole("combobox", { name: "Account", exact: true }), account);
  await choose(page, create.getByRole("combobox", { name: "Category", exact: true }), category);
  await create.getByLabel("Amount", { exact: true }).fill("3600.00");
  await choose(page, create.getByRole("combobox", { name: "Spread over" }), "3 months");
  await create.getByLabel("Description").fill(payment);
  await create.getByRole("button", { name: "Add", exact: true }).click();
  await expect(create).toBeHidden();

  const row = page.getByRole("row").filter({ hasText: payment });
  await expect(row).toContainText("3,600.00");
  await expect(row).toContainText("Spread · 3 months");

  const listed = await readJson(
    await page.request.get(
      `/api/transactions?page=1&pageSize=10&search=${encodeURIComponent(payment)}`,
    ),
    TransactionsResponse,
  );
  expect(listed.items).toHaveLength(1);
  const saved = listed.items[0];
  expect(saved?.spreadMonths).toBe(3);
  const laterMonth = monthAfter(saved?.date ?? "");

  await page.goto(`/reports?dateFrom=${laterMonth.dateFrom}&dateTo=${laterMonth.dateTo}`);
  const breakdown = page.getByRole("region", { name: "Expense by category" });
  await expect(breakdown.getByRole("listitem").filter({ hasText: category })).toContainText(
    "1,200.00",
  );

  expect(await categoryAmount(page.request, laterMonth, categoryId)).toBe("1200.00");
  expect(
    await categoryAmount(page.request, monthAfter(saved?.spreadUntil ?? ""), categoryId),
  ).toBeUndefined();
});
