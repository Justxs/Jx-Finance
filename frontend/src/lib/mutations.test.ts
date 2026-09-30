import { describe, expect, test, vi } from "vitest";
import { notify, upsert } from "./mutations";

function mutation(overrides: { isPending?: boolean; error?: Error | null } = {}) {
  return {
    mutateAsync: vi.fn((variables: { id: string }) => Promise.resolve(variables)),
    isPending: false,
    error: null,
    ...overrides,
  };
}

test("notify carries the success message", () => {
  expect(notify("Saved")).toEqual({ meta: { success: "Saved" } });
});

describe("upsert", () => {
  test("routes create and update to their own mutation", async () => {
    const createMutation = mutation();
    const updateMutation = mutation();
    const save = upsert(createMutation, updateMutation);

    await save.create({ id: "new" });
    await save.update({ id: "old" });

    expect(createMutation.mutateAsync).toHaveBeenCalledExactlyOnceWith({ id: "new" });
    expect(updateMutation.mutateAsync).toHaveBeenCalledExactlyOnceWith({ id: "old" });
  });

  test("is pending and failed when either mutation is", () => {
    const failure = new Error("boom");

    expect(upsert(mutation(), mutation())).toMatchObject({ pending: false, error: null });
    expect(upsert(mutation({ isPending: true }), mutation()).pending).toBe(true);
    expect(upsert(mutation(), mutation({ error: failure })).error).toBe(failure);
  });
});
