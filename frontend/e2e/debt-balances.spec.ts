import type { APIRequestContext } from "@playwright/test";
import {
  CreateDebtResponse,
  DebtBalancesResponse,
  DebtsResponse,
} from "../src/api/schemas/index.zod";
import { expect, readJson, test, today, unique } from "./support";

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

async function balancesOf(request: APIRequestContext, debtId: string) {
  return readJson(await request.get(`/api/debts/${debtId}/balances`), DebtBalancesResponse);
}

async function debtOf(request: APIRequestContext, debtId: string) {
  const debts = await readJson(await request.get("/api/debts"), DebtsResponse);
  return debts.find((debt) => debt.id === debtId);
}

test("a debt's recorded balance is added, corrected and deleted on its page", async ({ page }) => {
  const name = unique("Car loan");
  const firstDate = daysAgo(60);
  const created = await page.request.post("/api/debts", {
    data: {
      name,
      type: "loan",
      outstandingAmount: "5000.00",
      interestRate: null,
      asOf: firstDate,
    },
  });
  expect(created.status(), await created.text()).toBe(201);
  const { id } = await readJson(created, CreateDebtResponse);

  await page.goto(`/net-worth/debts/${id}`);
  await expect(page.getByRole("heading", { name: "Recorded balances" })).toBeVisible();
  const rows = page.getByRole("listitem").filter({ hasText: /€[\d,]+\.\d\d/ });
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("€5,000.00");
  await expect(rows.first()).toContainText("Outstanding amount");

  await page.getByRole("button", { name: "Add balance" }).click();
  const add = page.getByRole("dialog");
  await add.getByLabel("Outstanding amount (EUR)").fill("4800.00");
  await add.getByLabel(/^Note/).fill("Lender statement");
  await add.getByRole("button", { name: "Save" }).click();
  await expect(add).toBeHidden();

  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText("€4,800.00");
  await expect(rows.first()).toContainText("Lender statement");
  expect(await balancesOf(page.request, id)).toEqual([
    { date: today(), amount: "4800.00", note: "Lender statement" },
    { date: firstDate, amount: "5000.00", note: null },
  ]);
  expect(await debtOf(page.request, id)).toMatchObject({
    outstandingAmount: "4800.00",
    asOf: today(),
  });

  await page.getByRole("button", { name: /^Edit: €4,800\.00, / }).click();
  const edit = page.getByRole("dialog");
  await expect(edit.getByLabel("Date")).toBeDisabled();
  await edit.getByLabel("Outstanding amount (EUR)").fill("4750.00");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden();

  await expect(rows.first()).toContainText("€4,750.00");
  expect((await balancesOf(page.request, id))[0]).toEqual({
    date: today(),
    amount: "4750.00",
    note: "Lender statement",
  });
  expect((await debtOf(page.request, id))?.outstandingAmount).toBe("4750.00");

  await page.getByRole("button", { name: /^Delete: €4,750\.00, / }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();

  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText("€5,000.00");
  expect(await balancesOf(page.request, id)).toEqual([
    { date: firstDate, amount: "5000.00", note: null },
  ]);
  expect(await debtOf(page.request, id)).toMatchObject({
    outstandingAmount: "5000.00",
    asOf: firstDate,
  });

  await page.getByRole("button", { name: /^Delete: €5,000\.00, / }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
  await expect(
    page.getByText("A debt keeps at least one recorded balance. Delete the debt instead."),
  ).toBeVisible();
  expect(await balancesOf(page.request, id)).toHaveLength(1);
});
