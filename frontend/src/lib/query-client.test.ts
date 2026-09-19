import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ApiError } from "@/api/client";
import { queryClient } from "./query-client";

const generic = "Something went wrong. Please try again.";
const toastError = vi.fn();
let queryCount = 0;

async function failingQuery(failure: unknown, meta?: { silent?: boolean }) {
  queryCount += 1;
  try {
    await queryClient.fetchQuery({
      queryKey: ["failing", queryCount],
      queryFn: () => Promise.reject(failure),
      retry: false,
      meta,
    });
  } catch {
    return;
  }
  throw new Error("expected the query to fail");
}

async function failingMutation(failure: unknown) {
  const mutation = queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: () => Promise.reject(failure) });
  try {
    await mutation.execute(undefined);
  } catch {
    return;
  }
  throw new Error("expected the mutation to fail");
}

beforeEach(() => {
  toastError.mockReset();
  vi.spyOn(toast, "error").mockImplementation(toastError);
});

afterEach(() => {
  queryClient.clear();
});

describe("query errors", () => {
  test("API errors toast their title and detail", async () => {
    const error: ApiError = { status: 409, title: "Conflict", detail: "Name is taken." };

    await failingQuery(error);

    expect(toastError).toHaveBeenCalledExactlyOnceWith("Conflict", {
      description: "Name is taken.",
      duration: 12_000,
    });
  });

  test("validation reasons stand in for a missing detail", async () => {
    const error: ApiError = {
      status: 400,
      errors: [
        { name: "amount", reason: "Amount is required." },
        { name: "date", reason: "Date is invalid." },
      ],
    };

    await failingQuery(error);

    expect(toastError).toHaveBeenCalledExactlyOnceWith(generic, {
      description: "Amount is required. Date is invalid.",
      duration: 12_000,
    });
  });

  test("unknown errors toast the generic message", async () => {
    await failingQuery(new TypeError("offline"));

    expect(toastError).toHaveBeenCalledExactlyOnceWith(generic, {
      description: undefined,
      duration: 12_000,
    });
  });

  test("silent queries do not toast", async () => {
    await failingQuery({ status: 500, title: "Boom" }, { silent: true });

    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("mutation errors", () => {
  test("toast like query errors", async () => {
    await failingMutation({ status: 422, title: "Invalid", detail: "Bad amount." });

    expect(toastError).toHaveBeenCalledExactlyOnceWith("Invalid", {
      description: "Bad amount.",
      duration: 12_000,
    });
  });
});

test("queries retry once, refetch on focus and throw to boundaries", () => {
  expect(queryClient.getDefaultOptions().queries).toEqual({
    refetchOnWindowFocus: true,
    retry: 1,
    throwOnError: true,
  });
});
