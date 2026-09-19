import { expect, test } from "vitest";
import en from "@/locales/en/common.json";
import lt from "@/locales/lt/common.json";

const pluralSuffix = /_(zero|one|two|few|many|other)$/;

function leafKeys(node: unknown, prefix = ""): string[] {
  if (typeof node !== "object" || node === null) {
    return [prefix.replace(pluralSuffix, "")];
  }
  return Object.entries(node).flatMap(([key, value]) =>
    leafKeys(value, prefix === "" ? key : `${prefix}.${key}`),
  );
}

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

test("English and Lithuanian define the same translation keys", () => {
  const english = new Set(leafKeys(en));
  const lithuanian = new Set(leafKeys(lt));

  expect([...english].filter((key) => !lithuanian.has(key))).toEqual([]);
  expect([...lithuanian].filter((key) => !english.has(key))).toEqual([]);
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
