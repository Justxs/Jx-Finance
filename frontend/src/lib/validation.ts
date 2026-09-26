import { z } from "zod";
import { Scope } from "@/api/generated/model";
import type { Translate, TranslationKey } from "@/lib/i18n";

export function normalizeMoney(value: string): string {
  return value.trim().replace(",", ".");
}

export function isMoney(value: string): boolean {
  return /^-?\d+(\.\d{1,2})?$/.test(normalizeMoney(value));
}

export function isPositiveMoney(value: string): boolean {
  return isMoney(value) && Number(normalizeMoney(value)) > 0;
}

export function isQuantity(value: string): boolean {
  return /^\d+(\.\d{1,8})?$/.test(normalizeMoney(value));
}

export function isPositiveQuantity(value: string): boolean {
  return isQuantity(value) && Number(normalizeMoney(value)) > 0;
}

export function isNonNegativeMoney(value: string): boolean {
  return isMoney(value) && Number(normalizeMoney(value)) >= 0;
}

function blankOr(check: (value: string) => boolean) {
  return (value: string) => value.trim() === "" || check(value);
}

export function isRate(value: string): boolean {
  return blankOr((rate) => /^\d+(\.\d+)?$/.test(normalizeMoney(rate)))(value);
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+$/.test(value);
}

export function isIban(value: string): boolean {
  const compact = value.replaceAll(" ", "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z\d]{11,30}$/.test(compact);
}

export function requiredValue(t: Translate) {
  return z.string().min(1, t("validation.required"));
}

export function requiredMax(t: Translate, max: number) {
  return requiredValue(t).max(max, t("validation.maxLength", { max }));
}

export function optionalText(t: Translate, max: number) {
  return z.string().max(max, t("validation.maxLength", { max }));
}

export function requiredText(t: Translate, max: number) {
  return z
    .string()
    .refine((value) => value.trim().length > 0, t("validation.required"))
    .refine((value) => value.trim().length <= max, t("validation.maxLength", { max }));
}

export function requiredEmail(t: Translate, max?: number) {
  const schema = z
    .string()
    .refine((value) => value.trim().length > 0, t("validation.required"))
    .refine((value) => isEmail(value.trim()), t("validation.email"));
  return max === undefined ? schema : schema.max(max, t("validation.maxLength", { max }));
}

export function password(t: Translate, min: number, max: number) {
  return z
    .string()
    .min(min, t("validation.minLength", { min }))
    .max(max, t("validation.maxLength", { max }));
}

type MoneySign = "any" | "nonNegative" | "positive";

const moneyChecks = {
  any: isMoney,
  nonNegative: isNonNegativeMoney,
  positive: isPositiveMoney,
} as const satisfies Record<MoneySign, (value: string) => boolean>;

function moneyRule(t: Translate, sign: MoneySign, optional: boolean) {
  const check = moneyChecks[sign];
  return z
    .string()
    .refine(
      optional ? blankOr(check) : check,
      t(sign === "positive" ? "validation.positiveMoney" : "validation.money"),
    );
}

export function money(t: Translate) {
  return moneyRule(t, "any", false);
}

export function positiveMoney(t: Translate) {
  return moneyRule(t, "positive", false);
}

export function optionalPositiveMoney(t: Translate) {
  return moneyRule(t, "positive", true);
}

export function optionalNonNegativeMoney(t: Translate) {
  return moneyRule(t, "nonNegative", true);
}

export function quantity(t: Translate, messageKey: TranslationKey) {
  return z.string().refine(isQuantity, t(messageKey));
}

export function optionalQuantity(t: Translate, messageKey: TranslationKey) {
  return z.string().refine(blankOr(isQuantity), t(messageKey));
}

function wholeNumberIn(min: number, max: number) {
  return (value: string) => {
    const trimmed = value.trim();
    return /^\d+$/.test(trimmed) && Number(trimmed) >= min && Number(trimmed) <= max;
  };
}

export function wholeNumberBetween(t: Translate, min: number, max: number) {
  return z
    .string()
    .refine(wholeNumberIn(min, max), t("validation.wholeNumberBetween", { min, max }));
}

export function optionalWholeNumberBetween(t: Translate, min: number, max: number) {
  return z
    .string()
    .refine(blankOr(wholeNumberIn(min, max)), t("validation.wholeNumberBetween", { min, max }));
}

interface SharingValues {
  scope: Scope;
  householdId: string;
}

export function sharingShape() {
  return { scope: z.enum(Scope), householdId: z.string() };
}

export function refineSharing<TSchema extends z.ZodType<SharingValues>>(
  schema: TSchema,
  t: Translate,
) {
  return schema.refine((value) => value.scope !== "shared" || value.householdId !== "", {
    message: t("validation.required"),
    path: ["householdId"],
  });
}

export function sharedHouseholdId(value: SharingValues) {
  return value.scope === "shared" ? value.householdId : null;
}
