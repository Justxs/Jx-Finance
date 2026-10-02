import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { TableCell, TableRow } from "@/components/ui/table/table";
import { HintTag, Tag } from "@/components/ui/tag/tag";
import { confidencePercent } from "@/features/transactions/category-suggestion/confidence";
import { useUnusualSentence } from "@/features/transactions/unusual-amount/use-unusual-sentence";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { namedOptions } from "@/lib/options";
import { INCOME_TONE } from "@/lib/tone";
import { cn, metaLine } from "@/lib/utils";
import { ImportSpreadPicker } from "./import-spread-picker";
import { ImportTagPicker } from "./import-tag-picker";
import { ImportTransferPicker } from "./import-transfer-picker";
import { type PreviewRowState, categoryType, takesCategory } from "./preview-rows";

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
  const name = row.payee || row.description || EMPTY_VALUE;
  const rowName = metaLine(formatDate(row.date), row.payee || row.description);
  const editable = takesCategory(row);
  const showTransfer =
    transferOpen ||
    row.looksLikeTransfer ||
    Boolean(row.transferAccountId) ||
    Boolean(row.matchedTransaction) ||
    Boolean(row.refundCandidate) ||
    row.asRefund;
  const filledByRule = Boolean(row.ruleName) && editable;
  const learned = row.learnedConfidence !== null && editable;
  const recalled = row.categorySuggested && !row.ruleName && !learned && editable;
  const unusual = !row.isDuplicate && !linked && row.unusual ? unusualSentence(row.unusual) : null;
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
    Boolean(unusual);

  const checkbox = (
    <Checkbox
      aria-label={t("imports.selectRow", { row: rowName })}
      checked={row.selected}
      onCheckedChange={(checked) => onRowChange(index, { selected: checked })}
    />
  );

  const amount = (
    <span
      className={cn(
        "font-semibold whitespace-nowrap tabular-nums",
        row.type === "income" && !row.asRefund ? INCOME_TONE : "text-foreground",
      )}
    >
      {money.formatSigned(Number(row.amount), row.type === "income" ? "+" : "−", row.currency)}
    </span>
  );

  const category = (
    <ComboboxField
      aria-label={t("imports.categoryFor", { row: rowName })}
      disabled={!editable}
      value={linked ? (row.matchedTransaction?.categoryId ?? "") : row.categoryId}
      onChange={(categoryId) =>
        onRowChange(index, { categoryId, categorySuggested: false, learnedConfidence: null })
      }
      options={namedOptions(rowCategories, t("transactions.uncategorized"))}
    />
  );

  const tagPicker = (
    <ImportTagPicker
      tags={tags}
      value={linked ? [] : row.tagIds}
      label={t("imports.tagsFor", { row: rowName })}
      disabled={!editable}
      onChange={(tagIds) => onRowChange(index, { tagIds })}
    />
  );

  const transfer = showTransfer ? (
    <ImportTransferPicker
      row={row}
      accounts={accounts}
      accountId={accountId}
      onChange={(patch) => onRowChange(index, patch)}
    />
  ) : (
    <Button
      type="button"
      variant="link-muted"
      size="inline"
      className="min-h-6"
      onClick={() => setTransferOpen(true)}
      aria-label={t("imports.markTransferFor", { row: rowName })}
    >
      {t("imports.markTransfer")}
    </Button>
  );

  const spread = editable ? (
    <ImportSpreadPicker
      id={`import-spread-${index}`}
      label={t("imports.spreadFor", { row: rowName })}
      spreadMonths={row.spreadMonths}
      spreadDirection={row.spreadDirection}
      onChange={(next) => onRowChange(index, next)}
    />
  ) : null;

  const flags = hasFlags ? (
    <div className="flex flex-wrap gap-1">
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
    </div>
  ) : null;

  if (variant === "list") {
    return (
      <li className="space-y-2 py-2.5 text-sm">
        <div className="flex items-start gap-3">
          <div className="pt-0.5">{checkbox}</div>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-medium wrap-break-word">{name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">{formatDate(row.date)}</p>
          </div>
          <div className="shrink-0 text-right">{amount}</div>
        </div>
        {flags}
        {category}
        {tagPicker}
        {transfer}
        {spread}
      </li>
    );
  }

  return (
    <TableRow>
      <TableCell>{checkbox}</TableCell>
      <TableCell className="text-muted-foreground tabular-nums">{formatDate(row.date)}</TableCell>
      <TableCell>
        <span
          className="block truncate font-medium"
          title={row.payee || row.description || undefined}
        >
          {name}
        </span>
      </TableCell>
      <TableCell className="text-right">{amount}</TableCell>
      <TableCell>{category}</TableCell>
      <TableCell>{tagPicker}</TableCell>
      <TableCell className="whitespace-normal">
        <div className="flex flex-col items-start gap-1">
          {transfer}
          {spread}
        </div>
      </TableCell>
      <TableCell>{flags}</TableCell>
    </TableRow>
  );
}
