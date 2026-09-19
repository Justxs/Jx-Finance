import { expect, test } from "vitest";
import { pageViewTransition } from "./page-transition";

type TypesResolver = (info: { fromLocation?: object; pathChanged: boolean }) => string[] | false;

function resolveTypes(pathChanged: boolean, fromLocation: object | undefined) {
  if (typeof pageViewTransition !== "object" || typeof pageViewTransition.types !== "function") {
    throw new TypeError("expected a view transition types resolver");
  }
  return (pageViewTransition.types as unknown as TypesResolver)({ fromLocation, pathChanged });
}

test("page changes animate and search-only changes do not", () => {
  expect(resolveTypes(true, {})).toEqual(["page"]);
  expect(resolveTypes(false, {})).toBe(false);
});

test("the initial load does not animate", () => {
  expect(resolveTypes(true, undefined)).toBe(false);
});
