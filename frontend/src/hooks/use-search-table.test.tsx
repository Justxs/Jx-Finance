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

test("sorts ascending first and flips the active column", () => {
  const fresh = setup({});
  fresh.table.sortProps("name").onSort("name");
  expect(fresh.patch).toHaveBeenCalledWith({ sort: "name", direction: "asc" });

  const sorted = setup({ sort: "name", direction: "asc" });
  sorted.table.sortProps("name").onSort("name");
  expect(sorted.patch).toHaveBeenCalledWith({ sort: "name", direction: "desc" });

  sorted.table.sortProps("balance").onSort("balance");
  expect(sorted.patch).toHaveBeenLastCalledWith({ sort: "balance", direction: "asc" });
});

test("hands column headers their sort props", () => {
  const { table, patch } = setup({ sort: "balance", direction: "desc" });

  const props = table.sortProps("name");
  expect(props).toMatchObject({ sortKey: "name", activeSort: "balance", direction: "desc" });

  props.onSort("name");
  expect(patch).toHaveBeenCalledWith({ sort: "name", direction: "asc" });
});
