import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  CategoryResponse,
  Currency,
  ReceiptCandidateResponse,
  ReceiptItemResponse,
  ReceiptReadingResponse,
} from "@/api/generated/model";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { FormError } from "@/components/form-error/form-error";
import { Modal } from "@/components/modal";
import { Button } from "@/components/ui/button/button";
import { Rows } from "@/components/ui/rows/rows";
import { HintTag } from "@/components/ui/tag/tag";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { toCents } from "@/lib/money";
import { nameById, namedOptions } from "@/lib/options";
import {
  type CategoryChoice,
  type ReceiptFill,
  groupItems,
  linesFromReceipt,
  receiptTotals,
  refundCategory,
} from "./receipt-split";

interface Props {
  reading: ReceiptReadingResponse;
  categories: CategoryResponse[];
  amount: string;
  currency: Currency;
  pending: boolean;
  readAgainPending: boolean;
  error?: unknown;
  onApply: (choices: CategoryChoice[]) => void;
  onReadAgain: () => void;
  onSplitCandidate?: (candidate: ReceiptCandidateResponse, choices: CategoryChoice[]) => void;
  onClose: () => void;
}

interface ItemRowProps {
  item: ReceiptItemResponse;
  currency: Currency;
  options: { value: string; label: string }[];
  choice: CategoryChoice;
  onChange: (choice: CategoryChoice) => void;
}

function ItemRow({ item, currency, options, choice, onChange }: Readonly<ItemRowProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const notes = [
    toCents(item.discount) > 0
      ? t("receipts.discount", { amount: money.format(-toCents(item.discount) / 100, currency) })
      : null,
    toCents(item.deposit) > 0
      ? t("receipts.deposit", { amount: money.format(toCents(item.deposit) / 100, currency) })
      : null,
  ].filter((note) => note !== null);

  return (
    <li className="grid gap-2 py-2.5 sm:grid-cols-[minmax(0,1fr)_auto_14rem] sm:items-center sm:gap-4">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium break-words">{item.name}</span>
          {item.remembered && choice === item.categoryId ? (
            <HintTag hint={t("receipts.rememberedHint")} tone="accent">
              {t("receipts.remembered")}
            </HintTag>
          ) : null}
        </p>
        {item.quantity || notes.length > 0 ? (
          <p className="text-xs text-muted-foreground tabular-nums">
            {[item.quantity, ...notes].filter(Boolean).join(" · ")}
          </p>
        ) : null}
      </div>
      <span className="text-sm tabular-nums sm:text-right">
        {money.format(toCents(item.amount) / 100, currency)}
      </span>
      <ComboboxField
        value={choice ?? ""}
        onChange={(next) => onChange(next || null)}
        options={options}
        size="sm"
        aria-label={t("receipts.itemCategory", { name: item.name })}
      />
    </li>
  );
}

export function ReceiptReview({
  reading,
  categories,
  amount,
  currency,
  pending,
  readAgainPending,
  error,
  onApply,
  onReadAgain,
  onSplitCandidate,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const { result } = reading;
  const [choices, setChoices] = useState<CategoryChoice[]>(() =>
    result.items.map((item) => item.categoryId),
  );

  const expenseCategories = categories.filter((category) => category.type === "expense");
  const options = namedOptions(expenseCategories, t("transactions.uncategorized"));
  const names = nameById(expenseCategories);
  const receiptCurrency = result.currency ?? currency;

  function nameOf(categoryId: CategoryChoice) {
    return (categoryId ? names.get(categoryId) : undefined) ?? t("transactions.uncategorized");
  }

  function format(cents: number, code: string) {
    return money.format(cents / 100, code);
  }

  const source = [result.merchant, result.date ? formatDate(result.date) : null]
    .filter(Boolean)
    .join(", ");
  const title = source ? t("receipts.reviewTitle", { source }) : t("receipts.reviewTitleBare");

  const groups = groupItems(result.items, choices);
  const fill: ReceiptFill = result.isReturn
    ? { categoryId: refundCategory(result.items, choices) }
    : linesFromReceipt(result, choices, amount);
  const totals = receiptTotals(result, amount);
  const lineTotal = totals.amountCents ?? totals.printedCents ?? totals.itemsCents;
  const lines =
    "lines" in fill
      ? fill.lines.map(
          (line) =>
            `${nameOf(line.categoryId || null)} ${money.format(Number(line.amount), currency)}`,
        )
      : [nameOf(fill.categoryId || null)];
  const receiptCents = totals.printedCents ?? totals.itemsCents;
  const differences = [
    totals.printedCents !== null && totals.itemsCents !== totals.printedCents
      ? t("receipts.itemsDiffer", {
          items: format(totals.itemsCents, receiptCurrency),
          printed: format(totals.printedCents, receiptCurrency),
        })
      : null,
    totals.amountCents !== null &&
    (totals.amountCents !== receiptCents || receiptCurrency !== currency)
      ? t("receipts.paymentDiffers", {
          receipt: format(receiptCents, receiptCurrency),
          payment: format(totals.amountCents, currency),
        })
      : null,
  ].filter((text) => text !== null);

  function choose(index: number, choice: CategoryChoice) {
    setChoices((current) => current.map((value, at) => (at === index ? choice : value)));
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
      title={title}
      className="sm:max-w-3xl"
    >
      <div className="space-y-5">
        {result.pagesRead < result.pageCount ? (
          <p className="text-sm text-muted-foreground">
            {t("receipts.pagesCut", { read: result.pagesRead, count: result.pageCount })}
          </p>
        ) : null}
        {result.isReturn ? (
          <div className="space-y-1 text-sm">
            <p className="font-medium">{t("receipts.returnReceipt")}</p>
            <p className="text-muted-foreground">
              {reading.refundOf
                ? t("transactions.refundOf", {
                    description: reading.refundOf.description || EMPTY_VALUE,
                    date: formatDate(reading.refundOf.date),
                  })
                : t("receipts.refundOfNone")}
            </p>
          </div>
        ) : null}

        {groups.map((group) => (
          <section key={group.categoryId ?? "none"} aria-label={nameOf(group.categoryId)}>
            <h3 className="text-sm font-semibold">{nameOf(group.categoryId)}</h3>
            <Rows>
              {group.items.flatMap((index) => {
                const item = result.items[index];
                return item
                  ? [
                      <ItemRow
                        key={index}
                        item={item}
                        currency={receiptCurrency}
                        options={options}
                        choice={choices[index] ?? null}
                        onChange={(choice) => choose(index, choice)}
                      />,
                    ]
                  : [];
              })}
            </Rows>
          </section>
        ))}

        {result.adjustments.length > 0 ? (
          <section aria-label={t("receipts.adjustments")}>
            <h3 className="text-sm font-semibold">{t("receipts.adjustments")}</h3>
            <p className="text-xs text-muted-foreground">{t("receipts.adjustmentsHint")}</p>
            <Rows>
              {result.adjustments.map((adjustment) => (
                <li
                  key={`${adjustment.kind}:${adjustment.label}:${adjustment.amount}`}
                  className="flex justify-between gap-4 py-2 text-sm"
                >
                  <span>{adjustment.label || EMPTY_VALUE}</span>
                  <span className="tabular-nums">
                    {money.format(toCents(adjustment.amount) / 100, receiptCurrency)}
                  </span>
                </li>
              ))}
            </Rows>
          </section>
        ) : null}

        {result.unreadLines.length > 0 ? (
          <section aria-label={t("receipts.unread")}>
            <h3 className="text-sm font-semibold">{t("receipts.unread")}</h3>
            <p className="text-xs text-muted-foreground">{t("receipts.unreadHint")}</p>
            <Rows>
              {Array.from(result.unreadLines, (line, index) => (
                <li key={index} className="py-2 font-mono text-sm break-words">
                  {line}
                </li>
              ))}
            </Rows>
          </section>
        ) : null}

        <div className="space-y-1 border-t pt-3 text-sm">
          <p className="font-medium">
            {result.isReturn ? t("receipts.refundLine") : t("receipts.lines")}
          </p>
          <p className="tabular-nums">{[...lines, format(lineTotal, currency)].join(" · ")}</p>
          {differences.map((text) => (
            <p key={text} className="text-muted-foreground">
              {text}
            </p>
          ))}
        </div>

        {onSplitCandidate && reading.candidates.length > 0 ? (
          <section aria-label={t("receipts.candidateTitle")} className="space-y-2">
            <h3 className="text-sm font-semibold">{t("receipts.candidateTitle")}</h3>
            {reading.candidates.map((candidate) => (
              <div key={candidate.id} className="flex flex-wrap items-center gap-3 text-sm">
                <span className="tabular-nums">
                  {t("receipts.candidate", {
                    description: candidate.description ?? EMPTY_VALUE,
                    date: formatDate(candidate.date),
                    amount: money.format(Number(candidate.amount), candidate.currency),
                  })}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={result.isReturn || pending}
                  onClick={() => onSplitCandidate(candidate, choices)}
                >
                  {t("receipts.splitCandidate")}
                </Button>
              </div>
            ))}
          </section>
        ) : null}

        <FormError error={error} />

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <Button type="button" variant="outline" pending={readAgainPending} onClick={onReadAgain}>
            <RefreshCw />
            {t("receipts.readAgain")}
          </Button>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t("actions.cancel")}
            </Button>
            <Button
              type="button"
              pending={pending}
              disabled={readAgainPending}
              onClick={() => onApply(choices)}
            >
              {result.isReturn ? t("receipts.applyRefund") : t("receipts.apply")}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
