import { expect, test } from "vitest";
import { cn } from "./utils";

test("joins truthy class values", () => {
  expect(cn("a", false, null, undefined, ["b", { c: true, d: false }])).toBe("a b c");
});

test("later tailwind utilities win over conflicting earlier ones", () => {
  expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  expect(cn("text-muted-foreground", "text-foreground")).toBe("text-foreground");
});
