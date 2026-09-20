import { describe, expect, test } from "vitest";
import { ErrorCode } from "@/api/generated/model";
import en from "@/locales/en/common.json";
import lt from "@/locales/lt/common.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function lookup(tree: unknown, code: string): unknown {
  let node = tree;
  for (const part of code.split(".")) {
    node = isRecord(node) ? node[part] : undefined;
  }
  return node;
}

function leaves(tree: unknown, prefix = ""): string[] {
  if (typeof tree !== "object" || tree === null) {
    return [prefix];
  }
  return Object.entries(tree).flatMap(([key, value]) =>
    leaves(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe.each([
  ["en", en.serverErrors],
  ["lt", lt.serverErrors],
])("%s server error translations", (_locale, translations) => {
  test.each(Object.values(ErrorCode))("%s is translated", (code) => {
    expect(lookup(translations, code)).toEqual(expect.any(String));
  });

  test("has no translation for a code the API no longer publishes", () => {
    const published = new Set<string>(Object.values(ErrorCode));

    expect(leaves(translations).filter((code) => !published.has(code))).toEqual([]);
  });
});
