import { TransactionGroupsResponse } from "../src/api/schemas/index.zod";
import { createAccount, createTransaction, expect, readJson, test, unique } from "./support";

test("two rows are grouped, opened in place, ungrouped and brought back with undo", async ({
  page,
}) => {
  const reference = unique("E2EGROUP").replace(" ", "-");
  const hotel = `Hotel ${reference}`;
  const dinner = `Dinner ${reference}`;
  const name = unique("E2E trip");
  const accountId = await createAccount(page.request, unique("Group account"));
  await createTransaction(page.request, accountId, hotel, "12.30");
  await createTransaction(page.request, accountId, dinner, "7.70");

  await page.goto(`/transactions?search=${encodeURIComponent(reference)}`);
  const hotelRow = page.getByRole("row").filter({ hasText: hotel });
  const dinnerRow = page.getByRole("row").filter({ hasText: dinner });
  await hotelRow.getByRole("checkbox").check();
  await dinnerRow.getByRole("checkbox").check();
  await page
    .getByRole("group", { name: "Selected transactions" })
    .getByRole("button", { name: "More", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Group", exact: true }).click();

  const create = page.getByRole("dialog");
  await create.getByLabel("Group name").fill(name);
  await create.getByRole("button", { name: "Group", exact: true }).click();
  await expect(create).toBeHidden();

  const groupRow = page.getByRole("row").filter({ hasText: name });
  await expect(groupRow).toContainText("2 rows");
  await expect(groupRow).toContainText("20.00");
  await expect(hotelRow).toHaveCount(0);
  await expect(dinnerRow).toHaveCount(0);

  const toggle = groupRow.getByRole("button", { name: `Show the 2 rows of ${name}` });
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(hotelRow).toContainText("12.30");
  await expect(dinnerRow).toContainText("7.70");

  await groupRow.getByRole("button", { name: `Ungroup: ${name}` }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.getByRole("button", { name: "Ungroup" }).click();
  await expect(page.getByText(`Deleted ${name}`)).toBeVisible();
  await expect(groupRow).toHaveCount(0);
  await expect(hotelRow.getByRole("checkbox")).toBeVisible();
  await expect(dinnerRow.getByRole("checkbox")).toBeVisible();

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByText("Brought back")).toBeVisible();
  await expect(groupRow).toContainText("2 rows");

  const groups = await readJson(
    await page.request.get("/api/transaction-groups"),
    TransactionGroupsResponse,
  );
  expect(groups.find((group) => group.name === name)?.memberCount).toBe(2);
});
