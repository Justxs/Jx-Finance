import { expect, test } from "vitest";
import en from "@/locales/en/common.json";
import lt from "@/locales/lt/common.json";

const pluralSuffix = /_(zero|one|two|few|many|other)$/;

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{\{\s*([\w.]+)/g)].map((match) => match[1] ?? "").toSorted();
}

function leafTexts(node: unknown, prefix = "", result = new Map<string, string>()) {
  if (typeof node === "string") {
    result.set(prefix, node);
    return result;
  }
  for (const [key, value] of Object.entries(node ?? {})) {
    leafTexts(value, prefix === "" ? key : `${prefix}.${key}`, result);
  }
  return result;
}

test("every Lithuanian plural defines each Lithuanian plural form", () => {
  const forms = new Intl.PluralRules("lt").resolvedOptions().pluralCategories;
  const plurals = new Map<string, Set<string>>();
  for (const key of leafTexts(lt).keys()) {
    const match = pluralSuffix.exec(key);
    if (match) {
      const base = key.slice(0, match.index);
      plurals.set(base, (plurals.get(base) ?? new Set()).add(match[1] ?? ""));
    }
  }
  const incomplete = [...plurals]
    .filter(([, defined]) => forms.some((form) => !defined.has(form)))
    .map(([base]) => base);

  expect(incomplete).toEqual([]);
});

test("a Lithuanian text uses the same placeholders as its English text", () => {
  const lithuanian = leafTexts(lt);
  const mismatched = [...leafTexts(en)]
    .filter(([key]) => lithuanian.has(key))
    .filter(
      ([key, text]) => placeholders(text).join() !== placeholders(lithuanian.get(key) ?? "").join(),
    )
    .map(([key]) => key);

  expect(mismatched).toEqual([]);
});
