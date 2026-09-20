import { expect, test } from "vitest";
import { pageTransitionTypes, pageViewTransition } from "./page-transition";

function resolveTypes(pathChanged: boolean, fromLocation: object | undefined) {
  return pageTransitionTypes({ fromLocation, pathChanged });
}

test("the router option resolves types with the page resolver", () => {
  expect(pageViewTransition).toEqual({ types: pageTransitionTypes });
});

test("page changes animate and search-only changes do not", () => {
  expect(resolveTypes(true, {})).toEqual(["page"]);
  expect(resolveTypes(false, {})).toBe(false);
});

test("the initial load does not animate", () => {
  expect(resolveTypes(true, undefined)).toBe(false);
});
