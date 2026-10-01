import { AccountsResponse, TransactionResponse } from "../src/api/schemas/index.zod";
import { createAccount, createTransaction, expect, readJson, test, unique } from "./support";

test("part of a purchase is refunded from the ledger and the purchase shows what came back", async ({
  page,
}) => {
  const account = unique("Refund account");
  const purchase = unique("Headphones");
  const accountId = await createAccount(page.request, account);
  const purchaseId = await createTransaction(page.request, accountId, purchase, "40.00");

  await page.goto(`/transactions?search=${encodeURIComponent(purchase)}`);
  const rows = page.getByRole("row").filter({ hasText: purchase });
  await expect(rows).toHaveCount(1);
  await rows.getByRole("button", { name: /^Actions: / }).click();
  await page.getByRole("menuitem", { name: "Record refund" }).click();

  const refund = page.getByRole("dialog");
  await expect(refund.getByText(new RegExp(`^Refund of ${purchase}`))).toBeVisible();
  await refund.getByLabel("Amount").fill("15");
  await refund.getByRole("button", { name: "Add", exact: true }).click();
  await expect(refund).toBeHidden();

  await expect(rows).toHaveCount(2);
  const refundRow = rows.filter({ hasText: "Refund of" });
  await expect(refundRow).toContainText("15.00");
  const purchaseRow = rows.filter({ hasNotText: "Refund of" });
  await expect(purchaseRow).toContainText("Refunded");
  await expect(purchaseRow).toContainText("15.00");

  const saved = await readJson(
    await page.request.get(`/api/transactions/${purchaseId}`),
    TransactionResponse,
  );
  expect(saved.refundedAmount).toBe("15.00");
  const accounts = await readJson(await page.request.get("/api/accounts"), AccountsResponse);
  expect(accounts.find((item) => item.id === accountId)?.currentBalance).toBe("975.00");
});
