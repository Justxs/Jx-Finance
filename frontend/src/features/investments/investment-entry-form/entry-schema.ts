import { z } from "zod";
import {
  type AccountResponse,
  type CreateInvestmentTransactionRequest,
  Currency,
  type InvestmentTransactionResponse,
  InvestmentTransactionType,
} from "@/api/generated/model";
import { createInvestmentTransactionBodyDescriptionMax } from "@/api/schemas/investments/investments.zod";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import type { Translate } from "@/lib/i18n";
import {
  isNonNegativeMoney,
  isPositiveMoney,
  isPositiveQuantity,
  isQuantity,
  optionalText,
  requiredValue,
} from "@/lib/validation";
import {
  defaultInvestmentAccount,
  isTrade,
  requiresSecurity,
  usesAmount,
} from "../investment-types";

interface EntryFormValues {
  type: InvestmentTransactionType;
  accountId: string;
  date: string;
  securityId: string;
  quantity: string;
  price: string;
  fee: string;
  amount: string;
  currency: Currency;
  description: string;
}

interface DefaultsInput {
  accounts: readonly AccountResponse[];
  accountId?: string;
  initialType: InvestmentTransactionType;
  editing?: InvestmentTransactionResponse;
  today: string;
}

export function entrySchema(t: Translate) {
  return z
    .object({
      type: z.enum(InvestmentTransactionType),
      accountId: requiredValue(t),
      date: requiredValue(t),
      securityId: z.string(),
      quantity: z.string(),
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
      if (usesAmount(value.type) && !isPositiveMoney(value.amount)) {
        fail("amount", t("validation.positiveMoney"));
      }
    });
}

export function entryDefaults({
  accounts,
  accountId,
  initialType,
  editing,
  today,
}: DefaultsInput): EntryFormValues {
  if (editing) {
    return {
      type: editing.type,
      accountId: editing.accountId,
      date: editing.date,
      securityId: editing.securityId ?? "",
      quantity: usesAmount(editing.type) ? "" : editing.quantity,
      price: isTrade(editing.type) ? editing.price : "",
      fee: isTrade(editing.type) && Number(editing.fee) > 0 ? editing.fee : "",
      amount: usesAmount(editing.type) ? editing.cashAmount.replace(/^[-−]/, "") : "",
      currency: editing.currency,
      description: editing.description ?? "",
    };
  }

  const initialAccount = defaultInvestmentAccount(accounts, accountId);

  return {
    type: initialType,
    accountId: initialAccount?.id ?? "",
    date: today,
    securityId: "",
    quantity: "",
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

  return {
    accountId: value.accountId,
    type: value.type,
    date: value.date,
    securityId,
    quantity: cash ? null : value.quantity,
    price: trade ? value.price : null,
    fee: trade && value.fee.trim() !== "" ? value.fee : null,
    amount: cash ? value.amount : null,
    currency: cash && securityId === null ? value.currency : null,
    description: value.description.trim() || null,
  };
}
