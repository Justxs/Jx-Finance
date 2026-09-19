import type { CreateValidationErrorFn, DeepKeys, ValidationErrorMap } from "@tanstack/react-form";
import { type ApiError, isApiError } from "@/api/client";
import type { ErrorCode } from "@/api/generated/model";
import { i18n } from "@/lib/i18n";

export type ServerErrorDetail = NonNullable<ApiError["errors"]>[number];

interface Submission<TFormData> {
  value: TFormData;
  createValidationError: CreateValidationErrorFn<TFormData>;
}

export type FieldAliases = Readonly<Record<string, string>>;

const placedNames = new WeakMap<object, ReadonlySet<string>>();

export function errorCodeText(code: ErrorCode | null | undefined, reason?: string) {
  if (!code) {
    return undefined;
  }
  const key = ["serverErrors", code].join(".");
  const fallback = reason ?? "";
  return i18n.exists(key) ? i18n.t(key, { reason: fallback, defaultValue: fallback }) : undefined;
}

export function serverErrorText(detail: ServerErrorDetail): string {
  return errorCodeText(detail.code, detail.reason) ?? detail.reason;
}

function pathSegments(name: string): string[] {
  return name
    .replaceAll(/\[(\d+)\]/g, ".$1")
    .split(".")
    .filter((segment) => segment !== "");
}

export function hasFormField(values: unknown, name: string): boolean {
  const segments = pathSegments(name);
  let current = values;

  for (const segment of segments) {
    if (typeof current !== "object" || current === null || !(segment in current)) {
      return false;
    }
    current = (current as Record<string, unknown>)[segment];
  }

  return segments.length > 0;
}

function aliasedName(name: string, aliases: FieldAliases) {
  const [head = "", ...rest] = name.split(/(?=[.[])/);
  return [aliases[head] ?? head, ...rest].join("");
}

export function splitServerErrors(values: unknown, error: unknown, aliases: FieldAliases = {}) {
  const details = isApiError(error) ? (error.errors ?? []) : [];
  const fields: Record<string, string[]> = {};
  const placed: string[] = [];
  const unplaced: ServerErrorDetail[] = [];

  for (const detail of details) {
    const fieldName = aliasedName(detail.name, aliases);
    if (hasFormField(values, fieldName)) {
      (fields[fieldName] ??= []).push(serverErrorText(detail));
      placed.push(detail.name);
    } else {
      unplaced.push(detail);
    }
  }

  return { fields, placed, unplaced };
}

export function serverFieldErrors<TFormData>(
  { value, createValidationError }: Submission<TFormData>,
  error: unknown,
  aliases?: FieldAliases,
) {
  const { fields, placed } = splitServerErrors(value, error, aliases);

  if (placed.length === 0 || typeof error !== "object" || error === null) {
    return undefined;
  }

  placedNames.set(error, new Set(placed));

  const errorMap: ValidationErrorMap<TFormData> = {
    fields: fields as Partial<Record<DeepKeys<TFormData>, string[]>>,
  };

  return createValidationError(errorMap);
}

export async function submitToServer<TFormData>(
  submission: Submission<TFormData>,
  send: () => Promise<unknown> | void,
  aliases?: FieldAliases,
) {
  try {
    await send();
    return undefined;
  } catch (error) {
    return serverFieldErrors(submission, error, aliases);
  }
}

export function unplacedServerErrors(error: unknown) {
  const details = isApiError(error) ? (error.errors ?? []) : [];
  const placed = typeof error === "object" && error !== null ? placedNames.get(error) : undefined;

  return {
    placedAny: placed !== undefined,
    unplaced: placed ? details.filter((detail) => !placed.has(detail.name)) : details,
  };
}
