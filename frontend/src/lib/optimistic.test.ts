import { QueryClient } from "@tanstack/react-query";
import { expect, test } from "vitest";
import {
  optimisticPagedRemoval,
  optimisticRemoval,
  optimisticUpdate,
  withoutPagedItem,
} from "./optimistic";

interface Row {
  id: string;
  name: string;
}

const listKey = ["/api/rows", { page: 1 }] as const;
const rows: Row[] = [
  { id: "a", name: "Rent" },
  { id: "b", name: "Power" },
];

function prepend(previous: Row[], added: Row) {
  return [added, ...previous];
}

test("the change is applied to the cached list before the request settles", async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(listKey, rows);
  const optimistic = optimisticUpdate({ queryClient, queryKey: listKey, apply: prepend });

  const context = await optimistic.onMutate({ id: "c", name: "Water" });

  expect(queryClient.getQueryData<Row[]>(listKey)?.map((row) => row.id)).toEqual(["c", "a", "b"]);
  expect(context.previous).toBe(rows);
});

test("a failed request restores the list it replaced", async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(listKey, rows);
  const optimistic = optimisticUpdate({ queryClient, queryKey: listKey, apply: prepend });
  const added = { id: "c", name: "Water" };

  const context = await optimistic.onMutate(added);
  optimistic.onError(new Error("rejected"), added, context);

  expect(queryClient.getQueryData(listKey)).toEqual(rows);
});

test("an empty cache is left empty and a failure has nothing to restore", async () => {
  const queryClient = new QueryClient();
  const optimistic = optimisticUpdate({ queryClient, queryKey: listKey, apply: prepend });
  const added = { id: "c", name: "Water" };

  const context = await optimistic.onMutate(added);
  optimistic.onError(new Error("rejected"), added, context);
  optimistic.onError(new Error("rejected"), added, undefined);

  expect(context.previous).toBeUndefined();
  expect(queryClient.getQueryData(listKey)).toBeUndefined();
});

test("only the exact key is rewritten while the wider root is cancelled", async () => {
  const queryClient = new QueryClient();
  const otherKey = ["/api/rows", { page: 2 }] as const;
  queryClient.setQueryData(listKey, rows);
  queryClient.setQueryData(otherKey, rows);
  let cancelled = false;
  const inFlight = queryClient.fetchQuery({
    queryKey: ["/api/rows", { page: 3 }],
    queryFn: ({ signal }) =>
      new Promise<Row[]>((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          cancelled = true;
          reject(new Error("aborted"));
        });
      }),
  });
  inFlight.catch(() => undefined);
  const optimistic = optimisticUpdate({
    queryClient,
    queryKey: listKey,
    cancelKey: ["/api/rows"],
    apply: prepend,
  });

  await optimistic.onMutate({ id: "c", name: "Water" });

  expect(cancelled).toBe(true);
  expect(queryClient.getQueryData(otherKey)).toBe(rows);
});

test("removing a row drops it from a plain list", async () => {
  const queryClient = new QueryClient();
  queryClient.setQueryData(listKey, rows);

  await optimisticRemoval<Row>(queryClient, listKey).onMutate({ id: "a" });

  expect(queryClient.getQueryData(listKey)).toEqual([{ id: "b", name: "Power" }]);
});

test("removing a row from a page lowers the total by the rows removed", async () => {
  const queryClient = new QueryClient();
  const page = { items: rows, page: 1, pageSize: 2, total: 5 };
  queryClient.setQueryData(listKey, page);

  await optimisticPagedRemoval<typeof page>(queryClient, listKey).onMutate({ id: "b" });

  expect(queryClient.getQueryData(listKey)).toEqual({
    items: [{ id: "a", name: "Rent" }],
    page: 1,
    pageSize: 2,
    total: 4,
  });
  expect(withoutPagedItem(page, { id: "missing" }).total).toBe(5);
});
