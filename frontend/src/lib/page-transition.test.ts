import { expect, test } from "vitest";
import { pageViewTransition } from "./page-transition";

type TypesResolver = (info: { pathChanged: boolean }) => string[] | false;

function resolveTypes(pathChanged: boolean) {
  if (typeof pageViewTransition !== "object" || typeof pageViewTransition.types !== "function") {
    throw new TypeError("expected a view transition types resolver");
  }
  return (pageViewTransition.types as unknown as TypesResolver)({ pathChanged });
}

test("page changes animate and search-only changes do not", () => {
  expect(resolveTypes(true)).toEqual(["page"]);
  expect(resolveTypes(false)).toBe(false);
});
