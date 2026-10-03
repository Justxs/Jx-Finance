import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  getDebtsSuspenseQueryOptions,
  useCreateRecurringBill,
  useHouseholdsSuspense,
  useUpdateRecurringBill,
} from "@/api/generated";
import {
  RecurringBillCadence,
  RecurringBillKind,
  type RecurringBillResponse,
  RecurringBillShape,
  type Scope,
} from "@/api/generated/model";
import {
  updateRecurringBillBodyMatchKeyMax,
  updateRecurringBillBodyNameMax,
  updateRecurringBillBodyRemindDaysBeforeMax,
  updateRecurringBillBodyRemindDaysBeforeMin,
} from "@/api/schemas/recurring-bills/recurring-bills.zod";
import { useServerForm } from "@/components/form";
import {
  isSpreadValid,
  spreadDirectionOf,
  spreadIssue,
  spreadMonthsOf,
  spreadShape,
  spreadValues,
} from "@/components/spread-fields/spread-choice";
import { useFeature, useToday } from "@/hooks/use-settings";
import type { Translate } from "@/lib/i18n";
import { silentMutation, upsert } from "@/lib/mutations";
import {
  isPositiveMoney,
  optionalText,
  refineSharing,
  requiredText,
  requiredValue,
  sharingPayload,
  sharingShape,
  wholeNumberBetween,
} from "@/lib/validation";
import { useSharingDefaults } from "@/stores/active-household-store";

interface FormValues {
  name: string;
  shape: RecurringBillShape;
  kind: RecurringBillKind;
  amount: string;
  categoryId: string;
  accountId: string;
  toAccountId: string;
  cadence: RecurringBillCadence;
  nextDueDate: string;
  remindDaysBefore: string;
  isActive: boolean;
  matchKey: string;
  debtId: string;
  scope: Scope;
  householdId: string;
  spread: string;
  spreadCustom: string;
  spreadDirection: string;
}

export type RecurringBillDraft = Partial<Omit<RecurringBillResponse, "id">>;

function billSchema(t: Translate) {
  const schema = z
    .object({
      name: requiredText(t, updateRecurringBillBodyNameMax),
      shape: z.enum(RecurringBillShape),
      kind: z.enum(RecurringBillKind),
      amount: z.string(),
      categoryId: z.string(),
      accountId: z.string(),
      toAccountId: z.string(),
      cadence: z.enum(RecurringBillCadence),
      nextDueDate: requiredValue(t),
      remindDaysBefore: wholeNumberBetween(
        t,
        updateRecurringBillBodyRemindDaysBeforeMin,
        updateRecurringBillBodyRemindDaysBeforeMax,
      ),
      isActive: z.boolean(),
      matchKey: optionalText(t, updateRecurringBillBodyMatchKeyMax),
      debtId: z.string(),
      ...sharingShape(),
      ...spreadShape(),
    })
    .superRefine((value, ctx) => {
      if (value.kind === "fixed" && !isPositiveMoney(value.amount)) {
        ctx.addIssue({ code: "custom", message: t("validation.positiveMoney"), path: ["amount"] });
      }
      if (value.shape !== "transfer") {
        if (!isSpreadValid(value)) {
          ctx.addIssue(spreadIssue(t));
        }
        return;
      }
      if (!value.accountId) {
        ctx.addIssue({ code: "custom", message: t("validation.required"), path: ["accountId"] });
      }
      if (!value.toAccountId) {
        ctx.addIssue({ code: "custom", message: t("validation.required"), path: ["toAccountId"] });
      } else if (value.toAccountId === value.accountId) {
        ctx.addIssue({
          code: "custom",
          message: t("transfers.sameAccountError"),
          path: ["toAccountId"],
        });
      }
    });
  return refineSharing(schema, t);
}

function billRequest(value: FormValues) {
  const isTransfer = value.shape === "transfer";
  return {
    name: value.name.trim(),
    shape: value.shape,
    kind: value.kind,
    amount: value.kind === "fixed" ? value.amount : null,
    categoryId: isTransfer ? null : value.categoryId || null,
    accountId: value.accountId || null,
    toAccountId: isTransfer ? value.toAccountId : null,
    cadence: value.cadence,
    nextDueDate: value.nextDueDate,
    remindDaysBefore: Number(value.remindDaysBefore),
    matchKey: value.matchKey.trim() || null,
    debtId: value.shape === "expense" ? value.debtId || null : null,
    spreadMonths: isTransfer ? null : spreadMonthsOf(value),
    spreadDirection: isTransfer ? null : spreadDirectionOf(value),
    ...sharingPayload(value),
  };
}

interface Options {
  initial?: RecurringBillResponse;
  draft?: RecurringBillDraft;
  onClose: () => void;
}

export function useRecurringBillForm({ initial, draft, onClose }: Readonly<Options>) {
  const { t } = useTranslation();
  const today = useToday();
  const netWorth = useFeature("netWorth");
  const debtsQuery = useQuery({ ...getDebtsSuspenseQueryOptions(), enabled: netWorth });
  const debts = debtsQuery.data ?? [];
  const sharing = useSharingDefaults(useHouseholdsSuspense().data, initial);

  const { create, update, pending, error } = upsert(
    useCreateRecurringBill({ mutation: { ...silentMutation, onSuccess: onClose } }),
    useUpdateRecurringBill({ mutation: { ...silentMutation, onSuccess: onClose } }),
  );

  const seed: RecurringBillDraft = initial ?? draft ?? {};
  const defaultValues: FormValues = {
    name: seed.name ?? "",
    shape: seed.shape ?? "expense",
    kind: seed.kind ?? "fixed",
    amount: seed.amount ?? "",
    categoryId: seed.categoryId ?? "",
    accountId: seed.accountId ?? "",
    toAccountId: seed.toAccountId ?? "",
    cadence: seed.cadence ?? "monthly",
    nextDueDate: seed.nextDueDate ?? today,
    remindDaysBefore: String(seed.remindDaysBefore ?? 3),
    isActive: seed.isActive ?? true,
    matchKey: seed.matchKey ?? "",
    debtId:
      netWorth && debtsQuery.isSuccess && !debts.some((debt) => debt.id === seed.debtId)
        ? ""
        : (seed.debtId ?? ""),
    ...sharing,
    ...spreadValues(seed.spreadMonths, seed.spreadDirection),
  };

  const form = useServerForm({
    defaultValues,
    schema: billSchema(t),
    submit: (value) => {
      const data = billRequest(value);
      return initial
        ? update({ id: initial.id, data: { ...data, isActive: value.isActive } })
        : create({ data });
    },
  });

  return {
    form,
    pending,
    error,
    payableDebts: debts.filter((debt) => debt.tracksPayments || debt.id === seed.debtId),
  };
}

export type RecurringBillFormApi = ReturnType<typeof useRecurringBillForm>["form"];
