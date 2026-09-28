import { AccountsResponse, TransfersResponse } from "../src/api/schemas/index.zod";
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

  await page.goto("/profile?section=import");
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
    TransfersResponse,
  );
  const matched = transfers.items.filter((item) => item.description?.includes(reference));
  expect(matched).toHaveLength(1);
  expect(matched[0]?.fromAccountImported).toBe(true);

  await page.goto(`/transactions?search=${encodeURIComponent(reference)}`);
  await expect(page.getByRole("row", { name: new RegExp(`PIRKINYS ${reference}`) })).toBeVisible();
  await expect(
    page.getByRole("row", { name: new RegExp(`Atlyginimas ${reference}`) }),
  ).toBeVisible();

  const accounts = await readJson(await page.request.get("/api/accounts"), AccountsResponse);
  expect(accounts.find((account) => account.id === checkingId)?.currentBalance).toBe("1934.23");
});

test("a statement row is linked to the same purchase entered by hand two days earlier", async ({
  page,
}) => {
  const reference = unique("E2ELINK").replace(" ", "-");
  const checking = unique("Link checking");
  const date = today();
  const checkingId = await createAccount(page.request, checking);
  const entered = await page.request.post("/api/transactions", {
    data: {
      accountId: checkingId,
      categoryId: null,
      type: "expense",
      amount: "15.77",
      date: new Date(Date.parse(date) - 2 * 86_400_000).toISOString().slice(0, 10),
      description: `Lunch ${reference}`,
    },
  });
  expect(entered.status(), await entered.text()).toBe(201);

  await page.goto("/profile?section=import");
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

  const purchaseRow = dialog.getByRole("row", { name: /LIDL\/50191/ });
  await expect(purchaseRow).toContainText("Matches your entry");
  await expect(purchaseRow.getByRole("checkbox")).toBeChecked();
  await dialog.getByRole("button", { name: "Import 2 rows" }).click();
  await expect(
    dialog.getByText("Imported 1 row. 1 linked to an entry you made by hand."),
  ).toBeVisible();

  await page.goto(`/transactions?search=${encodeURIComponent(reference)}`);
  await expect(page.getByRole("row", { name: new RegExp(`Lunch ${reference}`) })).toBeVisible();
  await expect(page.getByRole("row", { name: new RegExp(`PIRKINYS ${reference}`) })).toHaveCount(0);
});

function camtEntry(
  reference: string,
  amount: string,
  direction: string,
  parties: string,
  text: string,
  date: string,
  status = "BOOK",
) {
  return `<Ntry><AcctSvcrRef>${reference}</AcctSvcrRef><Amt Ccy="EUR">${amount}</Amt><CdtDbtInd>${direction}</CdtDbtInd><Sts><Cd>${status}</Cd></Sts><BookgDt><Dt>${date}</Dt></BookgDt><NtryDtls><TxDtls><RltdPties>${parties}</RltdPties><RmtInf><Ustrd>${text}</Ustrd></RmtInf></TxDtls></NtryDtls></Ntry>`;
}

function camtStatement(iban: string, savingsIban: string, reference: string, date: string) {
  const entries = [
    camtEntry(
      `${reference}-A`,
      "15.77",
      "DBIT",
      "<Cdtr><Pty><Nm>LIDL</Nm></Pty></Cdtr>",
      `PIRKINYS ${reference}`,
      date,
    ),
    camtEntry(
      `${reference}-B`,
      "1000.00",
      "CRDT",
      "<Dbtr><Pty><Nm>Employer</Nm></Pty></Dbtr>",
      `Atlyginimas ${reference}`,
      date,
    ),
    camtEntry(
      `${reference}-C`,
      "50.00",
      "DBIT",
      `<Cdtr><Pty><Nm>Me</Nm></Pty></Cdtr><CdtrAcct><Id><IBAN>${savingsIban}</IBAN></Id></CdtrAcct>`,
      `Taupymas ${reference}`,
      date,
    ),
    camtEntry(`${reference}-D`, "9.99", "DBIT", "", `Pending ${reference}`, date, "PDNG"),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?><Document xmlns="urn:iso:std:iso:20022:tech:xsd:camt.053.001.08"><BkToCstmrStmt><Stmt><Acct><Id><IBAN>${iban}</IBAN></Id></Acct><Bal><Tp><CdOrPrtry><Cd>CLBD</Cd></CdOrPrtry></Tp><Amt Ccy="EUR">1934.23</Amt><CdtDbtInd>CRDT</CdtDbtInd><Dt><Dt>${date}</Dt></Dt></Bal>${entries.join("")}</Stmt></BkToCstmrStmt></Document>`;
}

test("a camt.053 statement proposes the transfer from the IBAN and agrees with the closing balance", async ({
  page,
}) => {
  const reference = unique("E2ECAMT").replace(" ", "-");
  const checking = unique("Camt checking");
  const savings = unique("Camt savings");
  const date = today();
  const stamp = Date.now() * 10;
  const checkingIban = `LT${String(stamp + 1).padStart(18, "0")}`;
  const savingsIban = `LT${String(stamp + 2).padStart(18, "0")}`;
  const checkingId = await createAccount(page.request, checking, { iban: checkingIban });
  await createAccount(page.request, savings, { type: "savings", iban: savingsIban });

  await page.goto("/profile?section=import");
  await page.getByRole("button", { name: "Import bank statement" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /ISO 20022/ }).click();
  await choose(page, dialog.getByRole("combobox", { name: "Account" }), checking);
  await dialog.locator("#import-file").setInputFiles({
    name: "statement.xml",
    mimeType: "application/xml",
    buffer: Buffer.from(camtStatement(checkingIban, savingsIban, reference, date), "utf8"),
  });
  await dialog.getByRole("button", { name: "Preview" }).click();

  await expect(dialog.getByText(`Statement for ${checkingIban}`)).toBeVisible();
  await expect(dialog.getByText("1 pending or informational entry skipped")).toBeVisible();
  const transferRow = dialog.getByRole("row", { name: /· Me / });
  await expect(transferRow.getByRole("combobox", { name: "Record as" })).toContainText(savings);
  await expect(transferRow.getByRole("checkbox")).not.toBeChecked();

  await dialog.getByRole("checkbox", { name: "Select all rows" }).check();
  await expect(dialog.getByText(/Matches the ledger after the selected rows/)).toBeVisible();
  await dialog.getByRole("button", { name: "Import 3 rows" }).click();
  await expect(dialog.getByText("Imported 3 rows.")).toBeVisible();

  const accounts = await readJson(await page.request.get("/api/accounts"), AccountsResponse);
  expect(accounts.find((account) => account.id === checkingId)?.currentBalance).toBe("1934.23");
});
