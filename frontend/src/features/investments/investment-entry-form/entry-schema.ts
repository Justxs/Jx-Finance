import { z } from "zod";
import {
  type AccountResponse,
  type CreateInvestmentTransactionRequest,
  Currency,
  type InvestmentTransactionResponse,
  InvestmentTransactionType,
} from "@/api/generated/model";
import { createInvestmentTransactionBodyDescriptionMax } from "@/api/schemas/investments/investments.zod";
import {
  defaultInvestmentAccount,
  isTrade,
  movesHolding,
  receivesShares,
  requiresRelatedSecurity,
  requiresSecurity,
  takesCostShare,
  usesAmount,
} from "@/features/investments/investment-types";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { Translate } from "@/lib/i18n";
import {
  isNonNegativeMoney,
  isPositiveMoney,
  isPositiveQuantity,
  isQuantity,
  normalizeMoney,
  optionalText,
  requiredValue,
} from "@/lib/validation";

interface EntryFormValues {
  type: InvestmentTransactionType;
  accountId: string;
  date: string;
  securityId: string;
  relatedSecurityId: string;
  quantity: string;
  relatedQuantity: string;
  costShare: string;
  price: string;
  fee: string;
  amount: string;
  currency: Currency;
  description: string;
}

interface DefaultsInput {
  accounts: readonly AccountResponse[];
  accountId?: string;
  editing?: InvestmentTransactionResponse;
  today: string;
}

const MAX_COST_SHARE = 100;

function isCostShare(value: string): boolean {
  const normalized = normalizeMoney(value);
  return /^\d+(\.\d{1,6})?$/.test(normalized) && Number(normalized) <= MAX_COST_SHARE;
}

function usesCash(type: InvestmentTransactionType, cashAmount: string): boolean {
  return usesAmount(type) || (type === "merger" && Number(cashAmount) !== 0);
}

export function entrySchema(t: Translate) {
  return z
    .object({
      type: z.enum(InvestmentTransactionType),
      accountId: requiredValue(t),
      date: requiredValue(t),
      securityId: z.string(),
      relatedSecurityId: z.string(),
      quantity: z.string(),
      relatedQuantity: z.string(),
      costShare: z.string(),
      price: z.string(),
      fee: z.string(),
      amount: z.string(),
      currency: z.enum(Currency),
      description: optionalText(t, createInvestmentTransactionBodyDescriptionMax),
    })
    .superRefine((value, context) => {
      function fail(path: keyof EntryFormValues, message: string) {
        context.addIssue({ code: "custom", path: [path], message });
      }

      if (requiresSecurity(value.type) && value.securityId === "") {
        fail("securityId", t("investments.validation.security"));
      }
      if (isTrade(value.type)) {
        if (!isPositiveQuantity(value.quantity)) {
          fail("quantity", t("investments.validation.quantity"));
        }
        if (!isQuantity(value.price)) {
          fail("price", t("investments.validation.price"));
        }
        if (value.fee.trim() !== "" && !isNonNegativeMoney(value.fee)) {
          fail("fee", t("validation.money"));
        }
      }
      if (value.type === "split" && !isPositiveQuantity(value.quantity)) {
        fail("quantity", t("investments.validation.ratio"));
      }
      if (movesHolding(value.type)) {
        if (value.relatedSecurityId === "" && requiresRelatedSecurity(value.type)) {
          fail("relatedSecurityId", t("investments.validation.relatedSecurity"));
        } else if (value.relatedSecurityId !== "" && value.relatedSecurityId === value.securityId) {
          fail("relatedSecurityId", t("investments.validation.sameSecurity"));
        }
        if (!isPositiveQuantity(value.quantity)) {
          fail("quantity", t("investments.validation.quantity"));
        }
      }
      if (
        receivesShares(value.type) &&
        value.relatedSecurityId !== "" &&
        !isPositiveQuantity(value.relatedQuantity)
      ) {
        fail("relatedQuantity", t("investments.validation.quantity"));
      }
      if (value.type === "merger") {
        if (value.relatedSecurityId === "" && value.amount.trim() === "") {
          fail("amount", t("investments.validation.mergerCash"));
        } else if (value.amount.trim() !== "" && !isPositiveMoney(value.amount)) {
          fail("amount", t("validation.positiveMoney"));
        }
      }
      if (
        takesCostShare(value.type, value.relatedSecurityId, value.amount) &&
        !isCostShare(value.costShare)
      ) {
        fail("costShare", t("investments.validation.costShare"));
      }
      if (usesAmount(value.type) && !isPositiveMoney(value.amount)) {
        fail("amount", t("validation.positiveMoney"));
      }
    });
}

export function entryDefaults({
  accounts,
  accountId,
  editing,
  today,
}: DefaultsInput): EntryFormValues {
  if (editing) {
    return {
      type: editing.type,
      accountId: editing.accountId,
      date: editing.date,
      securityId: editing.securityId ?? "",
      relatedSecurityId: editing.relatedSecurityId ?? "",
      quantity: usesAmount(editing.type) ? "" : editing.quantity,
      relatedQuantity: receivesShares(editing.type) ? editing.relatedQuantity : "",
      costShare: editing.costShare ?? "",
      price: isTrade(editing.type) ? editing.price : "",
      fee: isTrade(editing.type) && Number(editing.fee) > 0 ? editing.fee : "",
      amount: usesCash(editing.type, editing.cashAmount)
        ? editing.cashAmount.replace(/^[-−]/, "")
        : "",
      currency: editing.currency,
      description: editing.description ?? "",
    };
  }

  const initialAccount = defaultInvestmentAccount(accounts, accountId);

  return {
    type: "buy",
    accountId: initialAccount?.id ?? "",
    date: today,
    securityId: "",
    relatedSecurityId: "",
    quantity: "",
    relatedQuantity: "",
    costShare: "",
    price: "",
    fee: "",
    amount: "",
    currency: initialAccount?.currency ?? DEFAULT_CURRENCY,
    description: "",
  };
}

export function toRequest(value: EntryFormValues): CreateInvestmentTransactionRequest {
  const trade = isTrade(value.type);
  const cash = usesAmount(value.type);
  const securityId = value.securityId || null;
  const relatedSecurityId = movesHolding(value.type) ? value.relatedSecurityId || null : null;
  const merger = value.type === "merger";

  return {
    accountId: value.accountId,
    type: value.type,
    date: value.date,
    securityId,
    relatedSecurityId,
    quantity: cash ? null : value.quantity,
    relatedQuantity: receivesShares(value.type) && relatedSecurityId ? value.relatedQuantity : null,
    costShare: takesCostShare(value.type, relatedSecurityId, value.amount) ? value.costShare : null,
    price: trade ? value.price : null,
    fee: trade && value.fee.trim() !== "" ? value.fee : null,
    amount: cash || (merger && value.amount.trim() !== "") ? value.amount : null,
    currency: cash && securityId === null ? value.currency : null,
    description: value.description.trim() || null,
  };
}
