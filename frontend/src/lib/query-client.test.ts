import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ApiError } from "@/api/client";
import { queryClient, throwWithoutData } from "./query-client";

const generic = "Something went wrong. Please try again.";
const toastError = vi.fn();
const toastSuccess = vi.fn();
let queryCount = 0;

interface FailingQuery {
  silent?: boolean;
  cached?: boolean;
}

async function failingQuery(failure: unknown, { silent, cached = true }: FailingQuery = {}) {
  queryCount += 1;
  const queryKey = ["failing", queryCount];
  if (cached) {
    queryClient.setQueryData(queryKey, "earlier result");
  }
  try {
    await queryClient.query({
      queryKey,
      queryFn: () => Promise.reject(failure),
      retry: false,
      meta: { silent },
    });
  } catch {
    return;
  }
  throw new Error("expected the query to fail");
}

async function succeedingMutation(meta?: { silent?: boolean; success?: string }) {
  const mutation = queryClient
    .getMutationCache()
    .build(queryClient, { mutationFn: () => Promise.resolve("done"), meta });
  await mutation.execute(undefined);
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
  toastSuccess.mockReset();
  vi.spyOn(toast, "error").mockImplementation(toastError);
  vi.spyOn(toast, "success").mockImplementation(toastSuccess);
});

afterEach(() => {
  queryClient.clear();
});

describe("query errors", () => {
  test("a first load that fails is left to the error boundary", async () => {
    await failingQuery(new ApiError({ status: 500, title: "Boom" }), { cached: false });

    expect(toastError).not.toHaveBeenCalled();
  });

  test("a failed refresh of data already on screen toasts its title and detail", async () => {
    const error = new ApiError({ status: 409, title: "Conflict", detail: "Name is taken." });

    await failingQuery(error);

    expect(toastError).toHaveBeenCalledExactlyOnceWith("Conflict", {
      description: "Name is taken.",
      duration: 12_000,
    });
  });

  test("validation reasons stand in for a missing detail", async () => {
    const error = new ApiError({
      status: 400,
      errors: [
        { name: "amount", reason: "Amount is required." },
        { name: "date", reason: "Date is invalid." },
      ],
    });

    await failingQuery(error);

    expect(toastError).toHaveBeenCalledExactlyOnceWith(generic, {
      description: "Amount is required. Date is invalid.",
      duration: 12_000,
    });
  });

  test("a throttled request without a body names the reason", async () => {
    await failingQuery(new ApiError({ status: 429, title: "" }));

    expect(toastError).toHaveBeenCalledExactlyOnceWith(
      "Too many attempts. Wait a moment and try again.",
      { description: undefined, duration: 12_000 },
    );
  });

  test("a lockout keeps its own text", async () => {
    await failingQuery(
      new ApiError({ status: 429, title: "Too many requests", code: "credentials.lockedOut" }),
    );

    expect(toastError).toHaveBeenCalledExactlyOnceWith("Too many requests", {
      description: "Too many failed attempts. Wait 15 minutes and try again.",
      duration: 12_000,
    });
  });

  test("an empty title falls back to the generic message", async () => {
    await failingQuery(new ApiError({ status: 500, title: "" }));

    expect(toastError).toHaveBeenCalledExactlyOnceWith(generic, {
      description: undefined,
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
    await failingQuery(new ApiError({ status: 500, title: "Boom" }), { silent: true });

    expect(toastError).not.toHaveBeenCalled();
  });
});

describe("mutation errors", () => {
  test("toast like query errors", async () => {
    await failingMutation(new ApiError({ status: 422, title: "Invalid", detail: "Bad amount." }));

    expect(toastError).toHaveBeenCalledExactlyOnceWith("Invalid", {
      description: "Bad amount.",
      duration: 12_000,
    });
  });
});

describe("mutation success", () => {
  test("toasts the success message the mutation carries", async () => {
    await succeedingMutation({ silent: true, success: "Saved" });

    expect(toastSuccess).toHaveBeenCalledExactlyOnceWith("Saved");
  });

  test("stays quiet without one", async () => {
    await succeedingMutation();

    expect(toastSuccess).not.toHaveBeenCalled();
  });
});

test("queries retry once, refetch on focus and throw to boundaries only without data", () => {
  expect(queryClient.getDefaultOptions().queries).toEqual({
    refetchOnWindowFocus: true,
    retry: 1,
    throwOnError: throwWithoutData,
  });
  expect(throwWithoutData(undefined, { state: { data: undefined } })).toBe(true);
  expect(throwWithoutData(undefined, { state: { data: [] } })).toBe(false);
});
