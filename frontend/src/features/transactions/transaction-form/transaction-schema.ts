import { z } from "zod";
import { type AccountResponse, Currency, FlowType } from "@/api/generated/model";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { Translate } from "@/lib/i18n";
import { toCents } from "@/lib/money";
import { isPositiveMoney, positiveMoney, requiredValue } from "@/lib/validation";
import type { LineFormValue } from "./line-form-value";
import type { TransactionDraft } from "./transaction-draft";

interface TransactionLineFormValues {
  categoryId: string | null;
  amount: string;
  description: string | null;
}

export interface TransactionFormValues {
  accountId: string;
  categoryId: string | null;
  type: FlowType;
  amount: string;
  currency: Currency;
  date: string;
  description: string | null;
  lines: TransactionLineFormValues[] | null;
  tagIds: string[];
}

interface TransactionFormFields {
  type: FlowType;
  accountId: string;
  categoryId: string;
  amount: string;
  currency: Currency;
  date: string;
  description: string;
  isSplit: boolean;
  lines: LineFormValue[];
  tagIds: string[];
}

type FormatMoney = (value: number, currency: string) => string;

export function transactionSchema(t: Translate, formatMoney: FormatMoney) {
  return z
    .object({
      type: z.enum(FlowType),
      accountId: requiredValue(t),
      categoryId: z.string(),
      amount: positiveMoney(t),
      currency: z.enum(Currency),
      date: requiredValue(t),
      description: z.string(),
      isSplit: z.boolean(),
      tagIds: z.array(z.string()),
      lines: z.array(
        z.object({
          id: z.string(),
          categoryId: z.string(),
          amount: z.string(),
          description: z.string(),
        }),
      ),
    })
    .superRefine((value, ctx) => {
      if (!value.isSplit) {
        return;
      }

      if (value.lines.length === 0 || !value.lines.every((line) => isPositiveMoney(line.amount))) {
        ctx.addIssue({ code: "custom", message: t("validation.positiveMoney"), path: ["lines"] });
        return;
      }

      if (isPositiveMoney(value.amount)) {
        const sum = value.lines.reduce((total, line) => total + toCents(line.amount), 0);
        const total = toCents(value.amount);
        if (sum !== total) {
          ctx.addIssue({
            code: "custom",
            message: t("transactions.splitTotalMismatch", {
              linesTotal: formatMoney(sum / 100, value.currency),
              total: formatMoney(total / 100, value.currency),
            }),
            path: ["lines"],
          });
        }
      }
    });
}

export function defaultFormFields(
  source: TransactionDraft,
  defaultAccount: AccountResponse | undefined,
  today: string,
): TransactionFormFields {
  return {
    type: source.type ?? "expense",
    accountId: source.accountId ?? defaultAccount?.id ?? "",
    categoryId: source.categoryId ?? "",
    amount: source.amount ?? "",
    currency: source.currency ?? defaultAccount?.currency ?? DEFAULT_CURRENCY,
    date: source.date ?? today,
    description: source.description ?? "",
    isSplit: source.isSplit ?? false,
    tagIds: source.tagIds ?? [],
    lines: source.lines?.length
      ? source.lines.map((line, index) => ({
          id: `line-${index}`,
          categoryId: line.categoryId ?? "",
          amount: line.amount ?? "",
          description: line.description ?? "",
        }))
      : [],
  };
}

export function toSubmittedValues(value: TransactionFormFields): TransactionFormValues {
  return {
    accountId: value.accountId,
    categoryId: value.isSplit ? null : value.categoryId || null,
    type: value.type,
    amount: value.amount,
    currency: value.currency,
    date: value.date,
    description: value.description.trim() || null,
    tagIds: value.tagIds,
    lines: value.isSplit
      ? value.lines.map((line) => ({
          categoryId: line.categoryId || null,
          amount: line.amount,
          description: line.description.trim() || null,
        }))
      : null,
  };
}
