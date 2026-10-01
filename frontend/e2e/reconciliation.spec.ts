import { ReconciliationsResponse } from "../src/api/schemas/index.zod";
import {
  createAccount,
  createTransaction,
  expect,
  readJson,
  signedInMember,
  test,
  unique,
} from "./support";

function isoDate(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

test("an account is reconciled against a statement balance that first differs and then matches", async ({
  page,
  browser,
}, testInfo) => {
  const now = new Date();
  const statementDate = isoDate(new Date(now.getFullYear(), now.getMonth(), 0));
  const statementMonth = statementDate.slice(0, 7);
  const name = unique("Reconcile account");
  const groceries = unique("Groceries");
  const salary = unique("Salary");
  const afterStatement = unique("After statement");

  const { member } = await signedInMember(page, browser, testInfo, "reconcile");
  const accountId = await createAccount(member.request, name, { startingBalance: "1000.00" });
  await createTransaction(member.request, accountId, groceries, "120.50", {
    date: `${statementMonth}-03`,
  });
  await createTransaction(member.request, accountId, salary, "300.00", {
    type: "income",
    date: `${statementMonth}-15`,
  });
  await createTransaction(member.request, accountId, afterStatement, "50.00", {
    date: isoDate(now),
  });

  await member.goto("/accounts");
  await member.getByRole("button", { name: `Actions: ${name}` }).click();
  await member.getByRole("menuitem", { name: "Reconcile" }).click();
  const dialog = member.getByRole("dialog");
  await expect(dialog).toContainText(`Reconcile ${name}`);
  await expect(dialog.getByText(/Ledger balance on .*1,179\.50/)).toBeVisible();
  await expect(dialog.getByRole("listitem").filter({ hasText: groceries })).toContainText("120.50");
  await expect(dialog.getByRole("listitem").filter({ hasText: salary })).toContainText("300.00");
  await expect(dialog.getByRole("listitem").filter({ hasText: afterStatement })).toHaveCount(0);
  await expect(
    dialog.getByText("No statement balance is recorded for this account yet."),
  ).toBeVisible();

  const balance = dialog.getByLabel("Balance on the statement (EUR)");
  await balance.fill("1159.50");
  await expect(dialog.getByText(/20\.00 less on the statement/)).toBeVisible();

  await balance.fill("1179.50");
  await expect(dialog.getByText("Matches the statement")).toBeVisible();
  await dialog.getByRole("button", { name: "Save reconciliation" }).click();
  await expect(dialog).toBeHidden();
  await expect(member.getByText("Reconciliation saved")).toBeVisible();
  await expect(member).not.toHaveURL(/reconcile=/);

  await member.getByRole("button", { name: `Actions: ${name}` }).click();
  await member.getByRole("menuitem", { name: "Reconcile" }).click();
  const recorded = dialog.getByRole("listitem").filter({ hasText: "Typed" });
  await expect(recorded).toContainText("1,179.50");
  await expect(recorded).toContainText("Matches the statement");

  const reconciliations = await readJson(
    await member.request.get(`/api/accounts/${accountId}/reconciliations`),
    ReconciliationsResponse,
  );
  expect(reconciliations).toHaveLength(1);
  expect(reconciliations[0]?.date).toBe(statementDate);
  expect(reconciliations[0]?.source).toBe("manual");
  expect(Number(reconciliations[0]?.balance)).toBe(1179.5);
  expect(Number(reconciliations[0]?.difference)).toBe(0);

  await member.context().close();
});
