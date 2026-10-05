import { expect, test } from "vitest";
import { pageTransitionTypes, pageViewTransition } from "./page-transition";

function resolveTypes(from: string | undefined, to: string, pathChanged = true) {
  return pageTransitionTypes({
    fromLocation: from === undefined ? undefined : { pathname: from },
    toLocation: { pathname: to },
    pathChanged,
  });
}

test("the router option resolves types with the page resolver", () => {
  expect(pageViewTransition).toEqual({ types: pageTransitionTypes });
});

test("page changes inside one shell fade the page and search-only changes do not", () => {
  expect(resolveTypes("/dashboard", "/transactions")).toEqual(["page"]);
  expect(resolveTypes("/login", "/forgot-password")).toEqual(["page"]);
  expect(resolveTypes("/transactions", "/transactions", false)).toBe(false);
});

test("crossing between the sign-in pages and the app, or between the landing pages, fades the whole page", () => {
  expect(resolveTypes("/", "/login")).toEqual(["shell"]);
  expect(resolveTypes("/", "/features")).toEqual(["shell"]);
  expect(resolveTypes("/login", "/dashboard")).toEqual(["shell"]);
  expect(resolveTypes("/dashboard", "/login")).toEqual(["shell"]);
});

test("the initial load does not animate", () => {
  expect(resolveTypes(undefined, "/dashboard")).toBe(false);
});
