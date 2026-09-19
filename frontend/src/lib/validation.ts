import type { TFunction } from "i18next";
import { z } from "zod";

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

export function requiredValue(t: TFunction) {
  return z.string().min(1, t("validation.required"));
}

export function optionalText(t: TFunction, max: number) {
  return z.string().max(max, t("validation.maxLength", { max }));
}

export function requiredText(t: TFunction, max: number) {
  return z
    .string()
    .refine((value) => value.trim().length > 0, t("validation.required"))
    .refine((value) => value.trim().length <= max, t("validation.maxLength", { max }));
}

export function requiredEmail(t: TFunction) {
  return z
    .string()
    .refine((value) => value.trim().length > 0, t("validation.required"))
    .refine((value) => isEmail(value.trim()), t("validation.email"));
}

export function password(t: TFunction, min: number, max: number) {
  return z
    .string()
    .min(min, t("validation.minLength", { min }))
    .max(max, t("validation.maxLength", { max }));
}

export function money(t: TFunction) {
  return z.string().refine(isMoney, t("validation.money"));
}

export function positiveMoney(t: TFunction) {
  return z.string().refine(isPositiveMoney, t("validation.positiveMoney"));
}

export function optionalPositiveMoney(t: TFunction) {
  return z
    .string()
    .refine(
      (value) => value.trim() === "" || isPositiveMoney(value),
      t("validation.positiveMoney"),
    );
}

export function nonNegativeMoney(t: TFunction) {
  return z.string().refine(isNonNegativeMoney, t("validation.money"));
}

export function optionalNonNegativeMoney(t: TFunction) {
  return z
    .string()
    .refine((value) => value.trim() === "" || isNonNegativeMoney(value), t("validation.money"));
}

export function quantity(t: TFunction, messageKey: string) {
  return z.string().refine(isQuantity, t(messageKey));
}

export function positiveQuantity(t: TFunction, messageKey: string) {
  return z.string().refine(isPositiveQuantity, t(messageKey));
}
