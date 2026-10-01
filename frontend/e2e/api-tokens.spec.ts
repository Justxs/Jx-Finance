import { randomUUID } from "node:crypto";
import type { APIRequest, APIRequestContext, APIResponse } from "@playwright/test";
import {
  CreatePersonalApiTokenBody,
  CreatePersonalApiTokenResponse,
  CreateTransactionResponse,
  ProblemDetailsResponse,
  TransactionsResponse,
} from "../src/api/schemas/index.zod";
import {
  createAccount,
  expect,
  memberPassword,
  readJson,
  setFeature,
  signedInMember,
  test,
  today,
  unique,
} from "./support";

async function errorCode(response: APIResponse) {
  return (await readJson(response, ProblemDetailsResponse)).errors?.[0]?.code;
}

test("a read-and-write token records one transaction however often the same Idempotency-Key is retried", async ({
  page,
  browser,
  playwright,
  baseURL,
}, testInfo) => {
  const description = unique("Token coffee");
  const tokenContexts: APIRequestContext[] = [];

  async function withToken(request: APIRequest, token: string) {
    const context = await request.newContext({
      baseURL,
      extraHTTPHeaders: { Authorization: `Bearer ${token}` },
    });
    tokenContexts.push(context);
    return context;
  }

  try {
    await setFeature(page.request, "apiTokens", true);
    const { member } = await signedInMember(page, browser, testInfo, "token-writer");
    const accountId = await createAccount(member.request, unique("Token account"));

    await member.goto("/profile?section=security");
    const tokens = member.getByRole("region", { name: "Personal API tokens" });
    await tokens.getByRole("button", { name: "Create a token" }).click();
    const create = member.getByRole("dialog");
    await create.getByLabel("Name", { exact: true }).fill(unique("Shortcut"));
    await create.getByRole("radio", { name: "Read and write" }).click();
    await create.getByLabel("Current password").fill(memberPassword);
    await create.getByRole("button", { name: "Create a token" }).click();
    const secret = create.getByLabel("Your new token");
    await expect(secret).toHaveValue(/^jxp_/);
    await expect(create.getByText(/can also add, change and delete/)).toBeVisible();
    const writer = await withToken(playwright.request, await secret.inputValue());
    await create.getByRole("button", { name: "Done" }).click();
    await expect(create).toBeHidden();
    await expect(tokens.getByText("Read and write")).toBeVisible();

    const entry = {
      accountId,
      categoryId: null,
      type: "expense",
      amount: "12.40",
      date: today(),
      description,
      spreadMonths: null,
    };
    const key = randomUUID();
    const first = await writer.post("/api/transactions", {
      data: entry,
      headers: { "Idempotency-Key": key },
    });
    expect(first.status(), await first.text()).toBe(201);
    expect(first.headers()["idempotency-replayed"]).toBeUndefined();
    const recorded = await readJson(first, CreateTransactionResponse);
    expect(recorded.source).toBe("api");

    const retry = await writer.post("/api/transactions", {
      data: entry,
      headers: { "Idempotency-Key": key },
    });
    expect(retry.status(), await retry.text()).toBe(201);
    expect(retry.headers()["idempotency-replayed"]).toBe("true");
    expect(retry.headers().location).toBe(first.headers().location);
    expect((await readJson(retry, CreateTransactionResponse)).id).toBe(recorded.id);

    const reused = await writer.post("/api/transactions", {
      data: { ...entry, amount: "99.00" },
      headers: { "Idempotency-Key": key },
    });
    expect(reused.status()).toBe(409);
    expect(await errorCode(reused)).toBe("idempotency.keyReused");

    const entries = await readJson(
      await member.request.get(
        `/api/transactions?search=${encodeURIComponent(description)}&page=1&pageSize=200`,
      ),
      TransactionsResponse,
    );
    expect(entries.items.map((item) => item.id)).toEqual([recorded.id]);

    const readOnly = await member.request.post("/api/auth/tokens", {
      data: CreatePersonalApiTokenBody.parse({
        name: unique("Spreadsheet"),
        access: "read",
        expiresInDays: 30,
        password: memberPassword,
      }),
    });
    expect(readOnly.status(), await readOnly.text()).toBe(201);
    const reader = await withToken(
      playwright.request,
      (await readJson(readOnly, CreatePersonalApiTokenResponse)).token,
    );
    const refused = await reader.post("/api/transactions", {
      data: { ...entry, description: unique("Refused coffee") },
    });
    expect(refused.status()).toBe(403);
    expect(await errorCode(refused)).toBe("token.notAllowed");

    await member.context().close();
  } finally {
    await Promise.all(tokenContexts.map((context) => context.dispose()));
    await setFeature(page.request, "apiTokens", false);
  }
});
