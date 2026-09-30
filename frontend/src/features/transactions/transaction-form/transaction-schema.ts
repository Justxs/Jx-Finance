import { z } from "zod";
import {
  type AccountResponse,
  type CreateTransactionRequest,
  Currency,
  FlowType,
  type TransactionRefundOfResponse,
} from "@/api/generated/model";
import {
  createTransactionBodyDescriptionMax,
  createTransactionBodyNoteMax,
} from "@/api/schemas/transactions/transactions.zod";
import {
  isSpreadValid,
  spreadIssue,
  spreadMonthsOf,
  spreadShape,
  spreadValues,
} from "@/features/transactions/spread-fields/spread-choice";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { Translate } from "@/lib/i18n";
import { toCents } from "@/lib/money";
import {
  isPositiveMoney,
  normalizeMoney,
  optionalText,
  positiveMoney,
  requiredValue,
} from "@/lib/validation";
import type { LineFormValue } from "./line-form-value";
import type { TransactionDraft } from "./transaction-draft";

export interface TransactionFormValues extends CreateTransactionRequest {
  currency: Currency;
  tagIds: string[];
  refundOfTransactionId: string | null;
}

export type TransactionFormType = FlowType | "refund";

export function categoryTypeOf(type: string): FlowType {
  return type === "income" ? "income" : "expense";
}

interface TransactionFormFields {
  type: TransactionFormType;
  accountId: string;
  categoryId: string;
  amount: string;
  currency: Currency;
  date: string;
  description: string;
  note: string;
  isSplit: boolean;
  lines: LineFormValue[];
  tagIds: string[];
  refundOf: TransactionRefundOfResponse | null;
  spread: string;
  spreadCustom: string;
}

type FormatMoney = (value: number, currency: string) => string;

export function transactionSchema(t: Translate, formatMoney: FormatMoney) {
  return z
    .object({
      type: z.enum([...Object.values(FlowType), "refund"]),
      accountId: requiredValue(t),
      categoryId: z.string(),
      amount: positiveMoney(t),
      currency: z.enum(Currency),
      date: requiredValue(t),
      description: optionalText(t, createTransactionBodyDescriptionMax),
      note: optionalText(t, createTransactionBodyNoteMax),
      isSplit: z.boolean(),
      tagIds: z.array(z.string()),
      refundOf: z.custom<TransactionRefundOfResponse | null>(),
      ...spreadShape(),
      lines: z.array(
        z.object({
          id: z.string(),
          categoryId: z.string(),
          amount: z.string(),
          description: optionalText(t, createTransactionBodyDescriptionMax),
        }),
      ),
    })
    .superRefine((value, ctx) => {
      if (spreads(value) && !isSpreadValid(value)) {
        ctx.addIssue(spreadIssue(t));
      }

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

function spreads(value: Pick<TransactionFormFields, "type" | "isSplit">) {
  return value.type !== "refund" && !value.isSplit;
}

export function defaultFormFields(
  source: TransactionDraft,
  defaultAccount: AccountResponse | undefined,
  today: string,
): TransactionFormFields {
  const amount = source.amount?.trim() ?? "";
  const refund = source.type === "expense" && amount.startsWith("-");
  return {
    type: refund ? "refund" : (source.type ?? "expense"),
    accountId: source.accountId ?? defaultAccount?.id ?? "",
    categoryId: source.categoryId ?? "",
    amount: refund ? amount.slice(1) : amount,
    currency: source.currency ?? defaultAccount?.currency ?? DEFAULT_CURRENCY,
    date: source.date ?? today,
    description: source.description ?? "",
    note: source.note ?? "",
    isSplit: !refund && (source.isSplit ?? false),
    tagIds: source.tagIds ?? [],
    refundOf: refund ? (source.refundOf ?? null) : null,
    ...spreadValues(refund ? null : source.spreadMonths),
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
  const refund = value.type === "refund";
  const split = value.isSplit && !refund;
  return {
    accountId: value.accountId,
    categoryId: split ? null : value.categoryId || null,
    type: categoryTypeOf(value.type),
    amount: refund ? `-${normalizeMoney(value.amount)}` : value.amount,
    currency: value.currency,
    date: value.date,
    description: value.description.trim() || null,
    note: value.note.trim() || null,
    tagIds: value.tagIds,
    refundOfTransactionId: refund ? (value.refundOf?.id ?? null) : null,
    spreadMonths: spreads(value) ? spreadMonthsOf(value) : null,
    lines: split
      ? value.lines.map((line) => ({
          categoryId: line.categoryId || null,
          amount: line.amount,
          description: line.description.trim() || null,
        }))
      : null,
  };
}
