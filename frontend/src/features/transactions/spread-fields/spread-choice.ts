import { z } from "zod";
import { SpreadDirection } from "@/api/generated/model";
import {
  createTransactionBodySpreadMonthsMax,
  createTransactionBodySpreadMonthsMin,
} from "@/api/schemas/transactions/transactions.zod";
import type { Translate } from "@/lib/i18n";
import { type SelectOption, optionsOf } from "@/lib/options";
import { wholeNumberIn } from "@/lib/validation";

export const SPREAD_CUSTOM = "custom";
export const SPREAD_MIN_MONTHS = createTransactionBodySpreadMonthsMin;
export const SPREAD_MAX_MONTHS = createTransactionBodySpreadMonthsMax;

const PRESETS = [3, 6, 12];

export interface SpreadValues {
  spread: string;
  spreadCustom: string;
  spreadDirection: string;
}

export function spreadShape() {
  return { spread: z.string(), spreadCustom: z.string(), spreadDirection: z.string() };
}

export function spreadOptions(t: Translate): SelectOption[] {
  return [
    { value: "", label: t("transactions.spread.off") },
    ...PRESETS.map((months) => ({
      value: String(months),
      label: t("transactions.spread.months", { months }),
    })),
    { value: SPREAD_CUSTOM, label: t("transactions.spread.custom") },
  ];
}

export function spreadDirectionOptions(t: Translate): SelectOption[] {
  return optionsOf(Object.values(SpreadDirection), (direction) =>
    t(`transactions.spread.${direction}`),
  );
}

export function spreadValues(
  months: number | null | undefined,
  direction: SpreadDirection | null | undefined,
): SpreadValues {
  const spreadDirection = direction ?? "forward";
  if (!months) {
    return { spread: "", spreadCustom: "", spreadDirection };
  }

  return PRESETS.includes(months)
    ? { spread: String(months), spreadCustom: "", spreadDirection }
    : { spread: SPREAD_CUSTOM, spreadCustom: String(months), spreadDirection };
}

export function spreadMonthsOf(values: SpreadValues): number | null {
  if (!values.spread) {
    return null;
  }

  return Number(values.spread === SPREAD_CUSTOM ? values.spreadCustom.trim() : values.spread);
}

export function spreadDirectionOf(values: SpreadValues): SpreadDirection | null {
  if (!values.spread) {
    return null;
  }

  return values.spreadDirection === "backward" ? "backward" : "forward";
}

export function isSpreadValid(values: SpreadValues) {
  return (
    values.spread !== SPREAD_CUSTOM ||
    wholeNumberIn(SPREAD_MIN_MONTHS, SPREAD_MAX_MONTHS)(values.spreadCustom)
  );
}

export function spreadIssue(t: Translate) {
  return {
    code: "custom" as const,
    message: t("validation.wholeNumberBetween", {
      min: SPREAD_MIN_MONTHS,
      max: SPREAD_MAX_MONTHS,
    }),
    path: ["spreadCustom"],
  };
}
