import type { APIRequestContext } from "@playwright/test";
import {
  CreateCategoryResponse,
  ReportSummaryResponse,
  TransactionResponse,
  TransactionsResponse,
} from "../src/api/schemas/index.zod";
import {
  choose,
  createAccount,
  createTransaction,
  expect,
  readJson,
  test,
  today,
  unique,
} from "./support";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthOf(date: string, offset: number) {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1 + offset;
  return {
    dateFrom: isoDate(new Date(Date.UTC(year, month, 1))),
    dateTo: isoDate(new Date(Date.UTC(year, month + 1, 0))),
  };
}

function monthAfter(date: string) {
  return monthOf(date, 1);
}

async function findTransaction(request: APIRequestContext, description: string) {
  const listed = await readJson(
    await request.get(
      `/api/transactions?page=1&pageSize=10&search=${encodeURIComponent(description)}`,
    ),
    TransactionsResponse,
  );
  expect(listed.items).toHaveLength(1);
  const [saved] = listed.items;
  if (!saved) {
    throw new Error(`No transaction ${description}`);
  }
  return saved;
}

function swedbankStatement(reference: string, date: string, payee: string) {
  return [
    '"Sąskaitos Nr.","","Data","Gavėjas","Paaiškinimai","Suma","Valiuta","D/K","Įrašo Nr."',
    `"LT476300010172306416","10","${date}","","Likutis pradziai","653.56","EUR","K",""`,
    `"LT476300010172306416","20","${date}","${payee}","PIRKINYS ${reference}","360.00","EUR","D","${reference}-A"`,
  ].join("\n");
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

test("a bill paid in arrears counts its slices in the months up to the payment", async ({
  page,
}) => {
  const account = unique("Arrears account");
  const category = unique("Water");
  const payment = unique("Quarterly water bill");
  await createAccount(page.request, account);
  const categoryId = await createExpenseCategory(page.request, category);

  await page.goto(`/transactions?search=${encodeURIComponent(payment)}`);
  await page.getByRole("button", { name: "Add transaction", exact: true }).click();
  const create = page.getByRole("dialog");
  await choose(page, create.getByRole("combobox", { name: "Account", exact: true }), account);
  await choose(page, create.getByRole("combobox", { name: "Category", exact: true }), category);
  await create.getByLabel("Amount", { exact: true }).fill("90.00");
  await choose(page, create.getByRole("combobox", { name: "Spread over" }), "3 months");
  await choose(
    page,
    create.getByRole("combobox", { name: "Months counted" }),
    "Up to the date's month",
  );
  await create.getByLabel("Description").fill(payment);
  await create.getByRole("button", { name: "Add", exact: true }).click();
  await expect(create).toBeHidden();

  await expect(page.getByRole("row").filter({ hasText: payment })).toContainText(
    "Spread · 3 months",
  );
  const saved = await findTransaction(page.request, payment);
  expect([saved.spreadMonths, saved.spreadDirection, saved.spreadUntil]).toEqual([
    3,
    "backward",
    saved.date,
  ]);
  expect(saved.spreadFrom?.slice(0, 7)).toBe(monthOf(saved.date, -2).dateFrom.slice(0, 7));

  const earlierMonth = monthOf(saved.date, -1);
  await page.goto(`/reports?dateFrom=${earlierMonth.dateFrom}&dateTo=${earlierMonth.dateTo}`);
  await expect(
    page
      .getByRole("region", { name: "Expense by category" })
      .getByRole("listitem")
      .filter({ hasText: category }),
  ).toContainText("30.00");
  expect(await categoryAmount(page.request, earlierMonth, categoryId)).toBe("30.00");
  expect(await categoryAmount(page.request, monthAfter(saved.date), categoryId)).toBeUndefined();
});

test("a spread split counts each line's share in every month it covers", async ({ page }) => {
  const accountId = await createAccount(page.request, unique("Split spread account"));
  const insurance = unique("Home insurance");
  const contents = unique("Contents insurance");
  const payment = unique("Insurance bundle");
  const homeId = await createExpenseCategory(page.request, insurance);
  const contentsId = await createExpenseCategory(page.request, contents);
  const response = await page.request.post("/api/transactions", {
    data: {
      accountId,
      categoryId: null,
      type: "expense",
      amount: "450.00",
      date: today(),
      description: payment,
      lines: [
        { categoryId: homeId, amount: "300.00", description: null },
        { categoryId: contentsId, amount: "150.00", description: null },
      ],
      tagIds: null,
      spreadMonths: 3,
    },
  });
  expect(response.status(), await response.text()).toBe(201);

  await page.goto(`/transactions?search=${encodeURIComponent(payment)}`);
  await expect(page.getByRole("row").filter({ hasText: payment })).toContainText(
    "Spread · 3 months",
  );

  const laterMonth = monthAfter(today());
  await page.goto(`/reports?dateFrom=${laterMonth.dateFrom}&dateTo=${laterMonth.dateTo}`);
  const breakdown = page.getByRole("region", { name: "Expense by category" });
  await expect(breakdown.getByRole("listitem").filter({ hasText: insurance })).toContainText(
    "100.00",
  );
  await expect(breakdown.getByRole("listitem").filter({ hasText: contents })).toContainText(
    "50.00",
  );
  expect(await categoryAmount(page.request, laterMonth, homeId)).toBe("100.00");
  expect(await categoryAmount(page.request, laterMonth, contentsId)).toBe("50.00");
});

test("a refund spread over three months takes a slice off each month's spending", async ({
  page,
}) => {
  const category = unique("Gym");
  const purchase = unique("Gym membership");
  const accountId = await createAccount(page.request, unique("Refund spread account"));
  const categoryId = await createExpenseCategory(page.request, category);
  const purchaseId = await createTransaction(page.request, accountId, purchase, "600.00", {
    categoryId,
  });

  await page.goto(`/transactions?search=${encodeURIComponent(purchase)}`);
  const rows = page.getByRole("row").filter({ hasText: purchase });
  await rows.getByRole("button", { name: /^Actions: / }).click();
  await page.getByRole("menuitem", { name: "Record refund" }).click();
  const refund = page.getByRole("dialog");
  await refund.getByLabel("Amount").fill("300");
  await choose(page, refund.getByRole("combobox", { name: "Spread over" }), "3 months");
  await refund.getByRole("button", { name: "Add", exact: true }).click();
  await expect(refund).toBeHidden();

  await expect(rows.filter({ hasText: "Refund of" })).toContainText("Spread · 3 months");
  const saved = await readJson(
    await page.request.get(`/api/transactions/${purchaseId}`),
    TransactionResponse,
  );
  expect(saved.refundedAmount).toBe("300.00");

  expect(await categoryAmount(page.request, monthOf(today(), 0), categoryId)).toBe("500.00");
  expect(await categoryAmount(page.request, monthAfter(today()), categoryId)).toBe("-100.00");
});

test("a statement row is spread over months from the import review", async ({ page }) => {
  const reference = unique("E2ESPREAD").replace(" ", "-");
  const account = unique("Spread import account");
  const payee = unique("Insurer");
  const date = today();
  await createAccount(page.request, account);

  await page.goto("/profile?section=import");
  await page.getByRole("button", { name: "Import bank statement" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Swedbank/ }).click();
  await choose(page, dialog.getByRole("combobox", { name: "Account" }), account);
  await dialog.locator("#import-file").setInputFiles({
    name: "swedbank.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(swedbankStatement(reference, date, payee), "utf8"),
  });
  await dialog.getByRole("button", { name: "Preview" }).click();

  const spread = dialog.getByRole("button", {
    name: new RegExp(`^Spread over months: .*${payee}`),
  });
  await spread.click();
  await choose(page, page.getByRole("combobox", { name: "Spread over" }), "12 months");
  await expect(page.getByRole("combobox", { name: "Months counted" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(spread).toContainText("Spread · 12 months");

  await dialog.getByRole("button", { name: "Import 1 row" }).click();
  await expect(dialog.getByText("Imported 1 row.")).toBeVisible();

  const saved = await findTransaction(page.request, `PIRKINYS ${reference}`);
  expect([saved.spreadMonths, saved.spreadDirection]).toEqual([12, "forward"]);
  await page.goto(`/transactions?search=${encodeURIComponent(reference)}`);
  await expect(page.getByRole("row").filter({ hasText: reference })).toContainText(
    "Spread · 12 months",
  );
});
