import { renderHook } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useSearchTable } from "./use-search-table";

interface Search {
  search?: string;
  sort?: "name" | "balance";
  direction?: "asc" | "desc";
}

function setup(search: Search) {
  const patch = vi.fn();
  const { result } = renderHook(() => useSearchTable(search, patch));
  return { table: result.current, patch };
}

test("passes filter patches through", () => {
  const { table, patch } = setup({});

  table.setFilter({ search: "rent" });

  expect(patch).toHaveBeenCalledWith({ search: "rent" });
});

test("sorts ascending first and flips the active column", () => {
  const fresh = setup({});
  fresh.table.toggleSort("name");
  expect(fresh.patch).toHaveBeenCalledWith({ sort: "name", direction: "asc" });

  const sorted = setup({ sort: "name", direction: "asc" });
  sorted.table.toggleSort("name");
  expect(sorted.patch).toHaveBeenCalledWith({ sort: "name", direction: "desc" });

  sorted.table.toggleSort("balance");
  expect(sorted.patch).toHaveBeenLastCalledWith({ sort: "balance", direction: "asc" });
});

test("hands column headers their sort props", () => {
  const { table, patch } = setup({ sort: "balance", direction: "desc" });

  const props = table.sortProps("name");
  expect(props).toMatchObject({ sortKey: "name", activeSort: "balance", direction: "desc" });

  props.onSort("name");
  expect(patch).toHaveBeenCalledWith({ sort: "name", direction: "asc" });
});
