import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { TagChips } from "@/components/tag-chips/tag-chips";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { TableCell, TableRow } from "@/components/ui/table/table";
import { HintTag, Tag } from "@/components/ui/tag/tag";
import { confidencePercent } from "@/features/transactions/category-suggestion/confidence";
import { useUnusualSentence } from "@/features/transactions/unusual-amount/use-unusual-sentence";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { byId, namedOptions } from "@/lib/options";
import { INCOME_TONE } from "@/lib/tone";
import { cn, metaLine } from "@/lib/utils";
import { ImportRowOptions } from "./import-row-options";
import { ImportTransferPicker } from "./import-transfer-picker";
import { type PreviewRowState, categoryType, takesCategory } from "./preview-rows";

export function importAmount(money: ReturnType<typeof useMoney>, row: PreviewRowState) {
  return money.formatSigned(Number(row.amount), row.type === "income" ? "+" : "−", row.currency);
}

function amountTone(row: PreviewRowState) {
  if (row.isDuplicate) {
    return "text-muted-foreground";
  }
  return row.type === "income" && !row.asRefund ? INCOME_TONE : "text-foreground";
}

interface Props {
  row: PreviewRowState;
  index: number;
  variant: "table" | "list";
  accountId: string;
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  onRowChange: (index: number, patch: Partial<PreviewRowState>) => void;
}

export function ImportRow({
  row,
  index,
  variant,
  accountId,
  accounts,
  categories,
  tags,
  onRowChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const money = useMoney();
  const formatDate = useIsoDate();
  const [transferOpen, setTransferOpen] = useState(false);
  const unusualSentence = useUnusualSentence();

  const linked = Boolean(row.existingTransactionId);
  const rowCategories = linked
    ? categories
    : categories.filter((category) => category.type === categoryType(row));
  const name = row.payee || row.description;
  const purpose = row.payee && row.description !== row.payee ? row.description : null;
  const rowName = metaLine(formatDate(row.date), name);
  const editable = takesCategory(row) && !row.isDuplicate;
  const showTransfer =
    !row.isDuplicate &&
    (transferOpen ||
      row.looksLikeTransfer ||
      Boolean(row.transferAccountId) ||
      Boolean(row.matchedTransaction) ||
      Boolean(row.refundCandidate) ||
      row.asRefund);
  const filledByRule = Boolean(row.ruleName) && editable;
  const learned = row.learnedConfidence !== null && editable;
  const recalled = row.categorySuggested && !row.ruleName && !learned && editable;
  const unusual = !row.isDuplicate && !linked && row.unusual ? unusualSentence(row.unusual) : null;
  const tagIds = editable ? row.tagIds : [];
  const spreadChip =
    editable && row.spreadMonths
      ? t("transactions.spread.chip", { months: row.spreadMonths })
      : null;
  const matchedHint = row.matchedTransaction
    ? t("imports.matchedHint", {
        date: formatDate(row.matchedTransaction.date),
        description: row.matchedTransaction.description || EMPTY_VALUE,
      })
    : "";
  const hasFlags =
    linked ||
    row.isDuplicate ||
    row.isReversal ||
    row.asRefund ||
    row.looksLikeTransfer ||
    filledByRule ||
    learned ||
    recalled ||
    Boolean(unusual) ||
    tagIds.length > 0 ||
    Boolean(spreadChip);

  function change(patch: Partial<PreviewRowState>) {
    onRowChange(index, patch);
  }

  const checkbox = (
    <Checkbox
      aria-label={t("imports.selectRow", { row: rowName })}
      checked={row.selected}
      disabled={row.isDuplicate}
      onCheckedChange={(checked) => change({ selected: checked })}
    />
  );

  const amount = (
    <span className={cn("font-semibold whitespace-nowrap tabular-nums", amountTone(row))}>
      {importAmount(money, row)}
    </span>
  );

  const text = (
    <>
      <span
        className={cn(
          "block wrap-break-word",
          variant === "list" ? "line-clamp-2" : "truncate",
          !row.isDuplicate && "font-medium",
        )}
        title={variant === "table" && name ? name : undefined}
      >
        {name || EMPTY_VALUE}
      </span>
      {purpose ? (
        <span className="block truncate text-xs text-muted-foreground" title={purpose}>
          {purpose}
        </span>
      ) : null}
    </>
  );

  const flags = hasFlags ? (
    <div className="flex flex-wrap items-center gap-1">
      {row.isDuplicate ? <Tag>{t("imports.duplicate")}</Tag> : null}
      {linked ? (
        <HintTag tone="accent" hint={matchedHint}>
          {t("imports.matched")}
        </HintTag>
      ) : null}
      {row.isReversal ? <Tag>{t("imports.reversal")}</Tag> : null}
      {row.asRefund ? <Tag tone="accent">{t("imports.refund")}</Tag> : null}
      {filledByRule ? (
        <HintTag tone="accent" hint={t("imports.ruleFilledHint", { rule: row.ruleName ?? "" })}>
          {t("imports.ruleFilled")}
        </HintTag>
      ) : null}
      {learned ? (
        <HintTag
          tone="accent"
          hint={t("imports.learnedHint", { percent: confidencePercent(row.learnedConfidence) })}
        >
          {t("imports.learned")}
        </HintTag>
      ) : null}
      {recalled ? (
        <HintTag hint={t("imports.suggestedHint")}>{t("imports.suggested")}</HintTag>
      ) : null}
      {row.looksLikeTransfer ? <Tag tone="accent">{t("imports.looksLikeTransfer")}</Tag> : null}
      {unusual ? <HintTag hint={unusual}>{t("imports.unusual")}</HintTag> : null}
      <TagChips tagIds={tagIds} tagById={byId(tags)} />
      {spreadChip ? <Tag>{spreadChip}</Tag> : null}
    </div>
  ) : null;

  const recording = (
    <div className="space-y-2">
      {showTransfer ? (
        <ImportTransferPicker
          row={row}
          label={t("imports.recordAsFor", { row: rowName })}
          accounts={accounts}
          accountId={accountId}
          onChange={change}
        />
      ) : null}
      {row.transferAccountId ? null : (
        <ComboboxField
          aria-label={t("imports.categoryFor", { row: rowName })}
          disabled={!editable}
          value={linked ? (row.matchedTransaction?.categoryId ?? "") : row.categoryId}
          onChange={(categoryId) =>
            change({ categoryId, categorySuggested: false, learnedConfidence: null })
          }
          options={namedOptions(rowCategories, t("transactions.uncategorized"))}
        />
      )}
    </div>
  );

  const options = (
    <ImportRowOptions
      row={row}
      rowName={rowName}
      tags={tags}
      editable={editable}
      canMarkTransfer={!showTransfer && !row.isDuplicate}
      onMarkTransfer={() => setTransferOpen(true)}
      onChange={change}
    />
  );

  if (variant === "list") {
    return (
      <li className={cn("space-y-2 py-2.5 text-sm", row.isDuplicate && "text-muted-foreground")}>
        <div className="flex items-start gap-3">
          <div className="pt-0.5">{checkbox}</div>
          <div className="min-w-0 flex-1">
            {text}
            <span className="block text-xs text-muted-foreground tabular-nums">
              {formatDate(row.date)}
            </span>
          </div>
          <div className="shrink-0 text-right">{amount}</div>
        </div>
        {flags}
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">{recording}</div>
          {options}
        </div>
      </li>
    );
  }

  return (
    <TableRow className={row.isDuplicate ? "text-muted-foreground" : undefined}>
      <TableCell>{checkbox}</TableCell>
      <TableCell className="text-muted-foreground tabular-nums">{formatDate(row.date)}</TableCell>
      <TableCell className="whitespace-normal">
        <div className="min-w-0 space-y-1">
          <div>{text}</div>
          {flags}
        </div>
      </TableCell>
      <TableCell className="text-right">{amount}</TableCell>
      <TableCell className="whitespace-normal">{recording}</TableCell>
      <TableCell className="pl-0">{options}</TableCell>
    </TableRow>
  );
}
