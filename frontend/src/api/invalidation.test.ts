import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "vitest";
import * as api from "@/api/generated";
import {
  hasInvalidationRule,
  invalidateAfterMutation,
  mutationsWithoutInvalidation,
} from "./invalidation";

type MutationKeyGetter = () => readonly [string];

const accountsKey = ["/api/accounts"];
const accountKey = ["/api/accounts/abc"];
const goalsKey = ["/api/goals"];

function isMutationKeyGetter(entry: [string, unknown]): entry is [string, MutationKeyGetter] {
  return /^get\w+MutationKey$/.test(entry[0]) && typeof entry[1] === "function";
}

function mutationKeyGetters() {
  const exportsByName: Record<string, unknown> = api;
  return Object.entries(exportsByName).filter(isMutationKeyGetter);
}

function seededClient() {
  const client = new QueryClient();
  client.setQueryData(accountsKey, []);
  client.setQueryData(accountKey, {});
  client.setQueryData(goalsKey, []);
  return client;
}

function isInvalidated(client: QueryClient, queryKey: readonly unknown[]) {
  return client.getQueryState(queryKey)?.isInvalidated;
}

describe("invalidation rules", () => {
  test("finds the generated mutation keys", () => {
    expect(mutationKeyGetters().length).toBeGreaterThan(0);
  });

  test.each(mutationKeyGetters())("%s is classified", (_name, getKey) => {
    const exempt = mutationsWithoutInvalidation.some((getExempt) => getExempt()[0] === getKey()[0]);

    expect(hasInvalidationRule(getKey()) || exempt).toBe(true);
  });

  test("no mutation is both exempt and covered by a rule", () => {
    const both = mutationsWithoutInvalidation.filter((getKey) => hasInvalidationRule(getKey()));

    expect(both).toEqual([]);
  });
});

describe("invalidateAfterMutation", () => {
  test("invalidates every query under the mapped roots and nothing else", async () => {
    const client = seededClient();

    await invalidateAfterMutation(client, ["createAccount"]);

    expect(isInvalidated(client, accountsKey)).toBe(true);
    expect(isInvalidated(client, accountKey)).toBe(true);
    expect(isInvalidated(client, goalsKey)).toBe(false);
  });

  test("invalidates everything after settings change", async () => {
    const client = seededClient();

    await invalidateAfterMutation(client, ["updateSettings"]);

    expect(isInvalidated(client, accountsKey)).toBe(true);
    expect(isInvalidated(client, accountKey)).toBe(true);
    expect(isInvalidated(client, goalsKey)).toBe(true);
  });

  test.each([[["somethingUnknown"]], [undefined]])(
    "invalidates nothing for mutation key %j",
    async (mutationKey) => {
      const client = seededClient();

      await invalidateAfterMutation(client, mutationKey);

      expect(isInvalidated(client, accountsKey)).toBe(false);
      expect(isInvalidated(client, accountKey)).toBe(false);
      expect(isInvalidated(client, goalsKey)).toBe(false);
    },
  );
});
