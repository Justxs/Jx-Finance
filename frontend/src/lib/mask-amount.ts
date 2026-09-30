export const AMOUNT_MASK = "•••••";

const maskedPartTypes: ReadonlySet<string> = new Set([
  "integer",
  "group",
  "decimal",
  "fraction",
  "compact",
]);

function isMasked(part: Intl.NumberFormatPart) {
  return maskedPartTypes.has(part.type);
}

function joined(parts: readonly Intl.NumberFormatPart[]) {
  return parts.map((part) => part.value).join("");
}

export function maskParts(parts: readonly Intl.NumberFormatPart[]) {
  const first = parts.findIndex(isMasked);
  if (first === -1) {
    return joined(parts);
  }

  const last = parts.findLastIndex(isMasked);
  return joined(parts.slice(0, first)) + AMOUNT_MASK + joined(parts.slice(last + 1));
}

const digitRun = /\d(?:[\d.,'   ]*\d)?/gu;

export function maskDigits(text: string) {
  return text.replaceAll(digitRun, AMOUNT_MASK);
}
