import { z } from "zod";
import { choose, createAccount, expect, readJson, test, today, unique } from "./support";

function statement(reference: string, date: string) {
  const header =
    '"Sąskaitos Nr.","","Data","Gavėjas","Paaiškinimai","Suma","Valiuta","D/K","Įrašo Nr."';
  const rows = [
    `"LT476300010172306416","10","${date}","","Likutis pradziai","653.56","EUR","K",""`,
    `"LT476300010172306416","20","${date}","LIDL/50191","PIRKINYS ${reference}","15.77","EUR","D","${reference}-A"`,
    `"LT476300010172306416","20","${date}","","Atlyginimas ${reference}","1000.00","EUR","K","${reference}-B"`,
    `"LT476300010172306416","20","${date}","","Pervedimas ${reference}","50.00","EUR","D","${reference}-C"`,
  ];
  return [header, ...rows].join("\n");
}

test("a Swedbank statement is imported and one row is matched to an existing transfer", async ({
  page,
}) => {
  const reference = unique("E2EREF").replace(" ", "-");
  const checking = unique("Import checking");
  const savings = unique("Import savings");
  const date = today();
  const checkingId = await createAccount(page.request, checking);
  const savingsId = await createAccount(page.request, savings, { type: "savings" });
  const transfer = await page.request.post("/api/transfers", {
    data: {
      fromAccountId: checkingId,
      toAccountId: savingsId,
      amount: "50.00",
      currency: "eur",
      receivedAmount: null,
      receivedCurrency: "eur",
      date,
      description: `Savings ${reference}`,
    },
  });
  expect(transfer.status(), await transfer.text()).toBe(201);

  await page.goto("/settings?section=import");
  await page.getByRole("button", { name: "Import bank statement" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Swedbank/ }).click();
  await choose(page, dialog.getByRole("combobox", { name: "Account" }), checking);
  await dialog.locator("#import-file").setInputFiles({
    name: "swedbank.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(statement(reference, date), "utf8"),
  });
  await dialog.getByRole("button", { name: "Preview" }).click();

  const transferRow = dialog.getByRole("row", { name: new RegExp(`Pervedimas ${reference}`) });
  await expect(transferRow).toBeVisible();
  await expect(transferRow).toContainText("Looks like a transfer");
  await expect(transferRow.getByRole("checkbox")).not.toBeChecked();
  await choose(
    page,
    transferRow.getByRole("combobox", { name: "Record as" }),
    `Transfer · ${savings}`,
  );
  await choose(
    page,
    transferRow.getByRole("combobox", { name: "Match a transfer" }),
    new RegExp(`Savings ${reference}`),
  );

  await dialog.getByRole("checkbox", { name: "Select all rows" }).check();
  await dialog.getByRole("button", { name: "Import 3 rows" }).click();
  await expect(dialog.getByText("Imported 3 rows.")).toBeVisible();

  const transfers = await readJson(
    await page.request.get(`/api/transfers?date=${date}&page=1&pageSize=200`),
    z.object({
      items: z.array(
        z.object({ description: z.string().nullable(), fromAccountImported: z.boolean() }),
      ),
    }),
  );
  const matched = transfers.items.filter((item) => item.description?.includes(reference));
  expect(matched).toHaveLength(1);
  expect(matched[0]?.fromAccountImported).toBe(true);

  await page.goto(`/transactions?search=${encodeURIComponent(reference)}`);
  await expect(page.getByRole("row", { name: new RegExp(`PIRKINYS ${reference}`) })).toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(`Atlyginimas ${reference}`) }),
  ).toBeVisible();

  const accounts = await readJson(
    await page.request.get("/api/accounts"),
    z.array(z.object({ id: z.string(), currentBalance: z.string() })),
  );
  expect(accounts.find((account) => account.id === checkingId)?.currentBalance).toBe("1934.23");
});
