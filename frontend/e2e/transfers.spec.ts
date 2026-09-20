import { choose, createAccount, expect, test, unique } from "./support";

test("a transfer between currencies is recorded and then corrected", async ({ page }) => {
  const euros = unique("Euro account");
  const dollars = unique("Dollar account");
  await createAccount(page.request, euros, { currency: "eur" });
  await createAccount(page.request, dollars, { currency: "usd", startingBalance: "0.00" });

  await page.goto("/accounts");
  await page.getByRole("button", { name: "Transfer", exact: true }).click();
  const create = page.getByRole("dialog");
  await choose(page, create.getByRole("combobox", { name: "From" }), euros);
  await choose(page, create.getByRole("combobox", { name: "To" }), dollars);
  await create.getByLabel("Amount").fill("100");
  await expect(create.getByLabel("Received", { exact: true })).toBeEnabled();
  await create.getByLabel("Received", { exact: true }).fill("108,50");
  await create.getByLabel("Description").fill("Broker top-up");
  await create.getByRole("button", { name: "Transfer", exact: true }).click();
  await expect(create).toBeHidden();

  const row = page.getByRole("listitem").filter({ hasText: `${euros} → ${dollars}` });
  await expect(row).toContainText("108.50");
  await expect(row).toContainText("Broker top-up");

  await row.getByRole("button", { name: /^Edit: / }).click();
  const edit = page.getByRole("dialog");
  await expect(edit.getByLabel("Amount")).toHaveValue("100.00");
  await expect(edit.getByLabel("Received", { exact: true })).toHaveValue("108.50");
  await edit.getByLabel("Received", { exact: true }).fill("109.25");
  await edit.getByLabel("Description").fill("Broker top-up, corrected");
  await edit.getByRole("button", { name: "Save" }).click();
  await expect(edit).toBeHidden();

  await expect(row).toContainText("109.25");
  await expect(row).toContainText("Broker top-up, corrected");

  const accounts = (await (await page.request.get("/api/accounts")).json()) as {
    name: string;
    balances: { currency: string; amount: string }[];
  }[];
  const received = accounts.find((account) => account.name === dollars);
  expect(received?.balances).toEqual([{ currency: "usd", amount: "109.25" }]);
});
