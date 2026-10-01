import { CreateCategoryResponse, TransactionResponse } from "../src/api/schemas/index.zod";
import {
  createAccount,
  createTransaction,
  expect,
  readJson,
  setFeature,
  signedInMember,
  test,
  unique,
} from "./support";

test("a category learned from three earlier rows is suggested for a new payee branch and applied", async ({
  page,
  browser,
}, testInfo) => {
  const category = unique("E2E coffee");
  const newcomer = "Kavine Aurora Kaunas";

  try {
    await setFeature(page.request, "learnedCategories", true);
    const { member } = await signedInMember(page, browser, testInfo, "learned");
    const created = await member.request.post("/api/categories", {
      data: { name: category, type: "expense", icon: null, scope: "personal", householdId: null },
    });
    expect(created.status(), await created.text()).toBe(201);
    const categoryId = (await readJson(created, CreateCategoryResponse)).id;
    const accountId = await createAccount(member.request, unique("Learned account"));
    const history = [
      ["Kavine Aurora Vilnius", "4.50"],
      ["Kavine Aurora Vilnius", "5.20"],
      ["Kavine Aurora Klaipeda", "3.80"],
    ] as const;
    await Promise.all(
      history.map(([description, amount]) =>
        createTransaction(member.request, accountId, description, amount, { categoryId }),
      ),
    );
    const transactionId = await createTransaction(member.request, accountId, newcomer, "4.90");

    await member.goto(`/transactions?search=${encodeURIComponent(newcomer)}&uncategorized=true`);
    await member.getByRole("button", { name: "Suggest categories" }).click();
    const dialog = member.getByRole("dialog", { name: "Suggested categories" });
    const group = dialog.getByRole("listitem").filter({ hasText: `${category}, 1 transaction` });
    await expect(group).toContainText("From your history");
    await expect(group).toContainText(newcomer);
    await expect(group).toContainText("100% sure");
    await group.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Apply to 1 transaction" }).click();
    await expect(dialog).toBeHidden();
    await expect(member.getByText("1 transaction categorized")).toBeVisible();

    await member.goto(`/transactions?search=${encodeURIComponent(newcomer)}`);
    await expect(member.getByRole("row").filter({ hasText: newcomer })).toContainText(category);
    const stored = await readJson(
      await member.request.get(`/api/transactions/${transactionId}`),
      TransactionResponse,
    );
    expect(stored.categoryId).toBe(categoryId);

    await member.context().close();
  } finally {
    await setFeature(page.request, "learnedCategories", false);
  }
});
