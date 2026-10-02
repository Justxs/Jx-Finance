import type { Page } from "@playwright/test";
import { AssetsResponse, SettleUpResponse } from "../src/api/schemas/index.zod";
import {
  choose,
  createAccount,
  createHousehold,
  createTransaction,
  expect,
  readJson,
  signedInMember,
  test,
  unique,
} from "./support";

function householdCard(page: Page, household: string) {
  return page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: household, exact: true }) });
}

function escaped(text: string) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("an expense split with the household shows who owes whom until the payment is recorded", async ({
  page,
  browser,
}, testInfo) => {
  const household = unique("Settle household");
  const description = unique("Groceries");
  const { email, member } = await signedInMember(page, browser, testInfo, "settle");
  const memberName = email.split("@")[0] ?? "";
  const householdId = await createHousehold(page.request, household, email);
  const accountId = await createAccount(page.request, unique("Settle account"));
  await createTransaction(page.request, accountId, description, "30.00");

  await page.goto(`/transactions?search=${encodeURIComponent(description)}`);
  const row = page.getByRole("row").filter({ hasText: description });
  await row.getByRole("button", { name: /^Actions: / }).click();
  await page.getByRole("menuitem", { name: "Split with household" }).click();
  const split = page.getByRole("dialog");
  await choose(page, split.getByRole("combobox", { name: "Household" }), household);
  await expect(split.getByText(`${memberName} pays`)).toContainText("15.00");
  await split.getByRole("button", { name: "Save", exact: true }).click();
  await expect(split).toBeHidden();
  await expect(row).toContainText(`Split with ${household}`);

  await page.goto("/households");
  const card = householdCard(page, household);
  await expect(card.getByText(/^You are owed .*15\.00$/)).toBeVisible();
  await expect(card.getByText(new RegExp(`^${escaped(memberName)} owes .*15\\.00$`))).toBeVisible();
  const suggestion = card
    .getByRole("listitem")
    .filter({ hasText: new RegExp(`^${escaped(memberName)} pays .*15\\.00`) });
  await expect(suggestion).toBeVisible();

  await member.goto("/households");
  const memberCard = householdCard(member, household);
  await expect(memberCard.getByText(/^You owe .*15\.00$/)).toBeVisible();
  await expect(memberCard.getByRole("button", { name: "Record payment" })).toBeVisible();

  await suggestion.getByRole("button", { name: "Record payment" }).click();
  const record = page.getByRole("dialog");
  await expect(record.getByLabel("Amount")).toHaveValue("15.00");
  await record.getByRole("button", { name: "Record payment" }).click();
  await expect(record).toBeHidden();
  await expect(card.getByText("Everyone is even.")).toBeVisible();
  await expect(card.getByRole("button", { name: "Record payment" })).toHaveCount(0);

  await member.reload();
  await expect(memberCard.getByText("Everyone is even.")).toBeVisible();

  const settleUp = await readJson(
    await page.request.get(`/api/households/${householdId}/settle-up`),
    SettleUpResponse,
  );
  expect(settleUp.balances).toEqual([]);
  expect(settleUp.payments).toEqual([]);

  await member.context().close();
});

test("an asset shared with the household shows up in the other member's net worth", async ({
  page,
  browser,
}, testInfo) => {
  const household = unique("Asset household");
  const asset = unique("Family car");
  const { email, member } = await signedInMember(page, browser, testInfo, "asset");
  await createHousehold(page.request, household, email);

  await page.goto("/net-worth");
  await page.getByRole("button", { name: "Add asset" }).click();
  const create = page.getByRole("dialog");
  await create.getByLabel("Name", { exact: true }).fill(asset);
  await create.getByLabel("Current value").fill("25000");
  await choose(page, create.getByRole("combobox", { name: "Visibility" }), "Shared");
  await choose(page, create.getByRole("combobox", { name: "Household" }), household);
  await create.getByRole("button", { name: "Add", exact: true }).click();
  await expect(create).toBeHidden();
  await expect(page.getByRole("listitem").filter({ hasText: asset })).toContainText(
    `Shared · ${household}`,
  );

  await member.goto("/net-worth");
  const row = member.getByRole("listitem").filter({ hasText: asset });
  await expect(row).toContainText(`Shared · ${household}`);
  await expect(row).toContainText("25,000.00");

  const assets = await readJson(await member.request.get("/api/assets"), AssetsResponse);
  expect(assets.find((item) => item.name === asset)?.scope).toBe("shared");

  await member.context().close();
});
