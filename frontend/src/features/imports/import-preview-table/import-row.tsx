import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, CategoryResponse, TagResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { TableCell, TableRow } from "@/components/ui/table/table";
import { Tag } from "@/components/ui/tag/tag";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { EMPTY_VALUE, useIsoDate, useMoney } from "@/hooks/use-formatters";
import { namedOptions } from "@/lib/options";
import { cn } from "@/lib/utils";
import { ImportTagPicker } from "./import-tag-picker";
import { ImportTransferPicker } from "./import-transfer-picker";
import type { PreviewRowState } from "./preview-rows";

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

  const rowCategories = categories.filter((category) => category.type === row.type);
  const name = row.payee || row.description || EMPTY_VALUE;
  const rowName = [formatDate(row.date), row.payee || row.description].filter(Boolean).join(" · ");
  const showTransfer = transferOpen || row.looksLikeTransfer || Boolean(row.transferAccountId);
  const hasFlags =
    row.isDuplicate || row.looksLikeTransfer || (row.categorySuggested && !row.transferAccountId);

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
        row.type === "income" ? "text-income" : "text-foreground",
      )}
    >
      {row.type === "income" ? "+" : "−"}
      {money.format(Number(row.amount), row.currency)}
    </span>
  );

  const category = (
    <SelectField
      aria-label={t("imports.categoryFor", { row: rowName })}
      disabled={Boolean(row.transferAccountId)}
      value={row.categoryId}
      onChange={(categoryId) => onRowChange(index, { categoryId, categorySuggested: false })}
      options={namedOptions(rowCategories, t("transactions.uncategorized"))}
    />
  );

  const tagPicker = (
    <ImportTagPicker
      tags={tags}
      value={row.tagIds}
      label={t("imports.tagsFor", { row: rowName })}
      disabled={Boolean(row.transferAccountId)}
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
    <button
      type="button"
      onClick={() => setTransferOpen(true)}
      aria-label={t("imports.markTransferFor", { row: rowName })}
      className="inline-flex min-h-6 items-center rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:min-h-11"
    >
      {t("imports.markTransfer")}
    </button>
  );

  const flags = hasFlags ? (
    <div className="flex flex-wrap gap-1">
      {row.isDuplicate ? <Tag>{t("imports.duplicate")}</Tag> : null}
      {filledByRule ? (
        <Tooltip content={t("imports.ruleFilledHint", { rule: row.ruleName ?? "" })}>
          <span className="inline-flex">
            <Tag tone="accent">
              {t("imports.ruleFilled")}
              <span className="sr-only">
                . {t("imports.ruleFilledHint", { rule: row.ruleName ?? "" })}
              </span>
            </Tag>
          </span>
        </Tooltip>
      ) : null}
      {recalled ? (
        <Tooltip content={t("imports.suggestedHint")}>
          <span className="inline-flex">
            <Tag>
              {t("imports.suggested")}
              <span className="sr-only">. {t("imports.suggestedHint")}</span>
            </Tag>
          </span>
        </Tooltip>
      ) : null}
      {row.looksLikeTransfer ? <Tag tone="accent">{t("imports.looksLikeTransfer")}</Tag> : null}
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
      </li>
    );
  }

  return (
    <TableRow>
      <TableCell>{checkbox}</TableCell>
      <TableCell className="text-muted-foreground tabular-nums">{formatDate(row.date)}</TableCell>
      <TableCell className="whitespace-normal">
        <span
          className="line-clamp-2 min-w-40 font-medium wrap-break-word"
          title={row.payee || row.description || undefined}
        >
          {name}
        </span>
      </TableCell>
      <TableCell className="text-right">{amount}</TableCell>
      <TableCell>{category}</TableCell>
      <TableCell>{tagPicker}</TableCell>
      <TableCell>{transfer}</TableCell>
      <TableCell>{flags}</TableCell>
    </TableRow>
  );
}
