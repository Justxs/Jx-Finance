import { z } from "zod";
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

export function isRate(value: string): boolean {
  return value.trim() === "" || /^\d+(\.\d+)?$/.test(normalizeMoney(value));
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

export function optionalText(t: Translate, max: number) {
  return z.string().max(max, t("validation.maxLength", { max }));
}

export function requiredText(t: Translate, max: number) {
  return z
    .string()
    .refine((value) => value.trim().length > 0, t("validation.required"))
    .refine((value) => value.trim().length <= max, t("validation.maxLength", { max }));
}

export function requiredEmail(t: Translate) {
  return z
    .string()
    .refine((value) => value.trim().length > 0, t("validation.required"))
    .refine((value) => isEmail(value.trim()), t("validation.email"));
}

export function password(t: Translate, min: number, max: number) {
  return z
    .string()
    .min(min, t("validation.minLength", { min }))
    .max(max, t("validation.maxLength", { max }));
}

export function money(t: Translate) {
  return z.string().refine(isMoney, t("validation.money"));
}

export function positiveMoney(t: Translate) {
  return z.string().refine(isPositiveMoney, t("validation.positiveMoney"));
}

export function optionalPositiveMoney(t: Translate) {
  return z
    .string()
    .refine(
      (value) => value.trim() === "" || isPositiveMoney(value),
      t("validation.positiveMoney"),
    );
}

export function optionalNonNegativeMoney(t: Translate) {
  return z
    .string()
    .refine((value) => value.trim() === "" || isNonNegativeMoney(value), t("validation.money"));
}

export function quantity(t: Translate, messageKey: TranslationKey) {
  return z.string().refine(isQuantity, t(messageKey));
}

export function wholeNumberBetween(t: Translate, min: number, max: number) {
  return z
    .string()
    .refine(
      (value) => /^\d+$/.test(value.trim()) && Number(value) >= min && Number(value) <= max,
      t("validation.wholeNumberBetween", { min, max }),
    );
}

interface SharingValues {
  scope: "personal" | "shared";
  householdId: string;
}

export function sharingShape() {
  return { scope: z.enum(["personal", "shared"]), householdId: z.string() };
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
