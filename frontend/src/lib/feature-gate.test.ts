import { isRedirect } from "@tanstack/react-router";
import { afterEach, expect, test, vi } from "vitest";
import { settingsQueryOptions } from "@/hooks/use-settings";
import { settingsFixture } from "@/test/settings";
import { requireFeature } from "./feature-gate";
import { queryClient } from "./query-client";

const gateArgs = { context: { queryClient } };

function settingsWith(budgets: boolean) {
  return settingsFixture({ features: { ...settingsFixture().features, budgets } });
}

async function thrownBy(run: () => Promise<void>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  return undefined;
}

afterEach(() => {
  queryClient.clear();
});

test("an enabled feature loads", async () => {
  queryClient.setQueryData(settingsQueryOptions().queryKey, settingsWith(true));

  await expect(requireFeature("budgets")(gateArgs)).resolves.toBeUndefined();
});

test("a disabled feature redirects home", async () => {
  queryClient.setQueryData(settingsQueryOptions().queryKey, settingsWith(false));

  const thrown = await thrownBy(() => requireFeature("budgets")(gateArgs));

  expect(isRedirect(thrown)).toBe(true);
  expect(thrown).toMatchObject({ options: { to: "/" } });
});

test("settings that fail to load let the page through", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(null, { status: 500 }))),
  );

  await expect(requireFeature("budgets")(gateArgs)).resolves.toBeUndefined();
});
