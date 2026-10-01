import { ArrowRightLeft, Group, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  TagResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { SelectField } from "@/components/select-field/select-field";
import { TagPicker } from "@/components/tag-picker/tag-picker";
import { Button } from "@/components/ui/button/button";
import { Hint } from "@/components/ui/field-error";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
import { UNCATEGORIZED_OPTION } from "@/features/transactions/transaction-amount/transaction-row";
import { namedOptions } from "@/lib/options";

interface Props {
  selected: TransactionResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  accounts: AccountResponse[];
  pending: boolean;
  tagPending: boolean;
  movePending: boolean;
  deletePending: boolean;
  onApply: (categoryId: string | null) => void;
  onApplyTags: (tagIds: string[]) => void;
  onMove: (accountId: string) => void;
  onGroup: () => void;
  onDelete: () => void;
  onClear: () => void;
}

export function SelectionToolbar({
  selected,
  categories,
  tags,
  accounts,
  pending,
  tagPending,
  movePending,
  deletePending,
  onApply,
  onApplyTags,
  onMove,
  onGroup,
  onDelete,
  onClear,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState("");
  const [tagChoice, setTagChoice] = useState<string[]>([]);
  const [accountChoice, setAccountChoice] = useState("");
  const accountOptions = namedOptions(accounts);
  const targetAccount = accountOptions.some((option) => option.value === accountChoice)
    ? accountChoice
    : "";

  const types = new Set(selected.map((item) => item.type));
  const mixed = types.size > 1;
  const type = mixed ? undefined : selected[0]?.type;

  const options = namedOptions(
    categories.filter((category) => category.type === type),
    t("transactions.uncategorized"),
    UNCATEGORIZED_OPTION,
  );
  const value = !mixed && options.some((option) => option.value === choice) ? choice : "";
  const groupable = selected.length >= 2 && selected.every((item) => item.enteredByMe);

  return (
    <div
      role="group"
      aria-label={t("transactions.selectionToolbar")}
      className="flex min-h-9 flex-wrap items-center gap-x-3 gap-y-2 text-sm"
    >
      <span className="font-medium whitespace-nowrap tabular-nums" aria-live="polite">
        {t("transactions.selectedCount", { count: selected.length })}
      </span>
      <div className="w-56 max-w-full">
        <ComboboxField
          aria-label={t("transactions.bulkCategory")}
          aria-describedby={mixed ? "tx-selection-hint" : undefined}
          placeholder={t("transactions.bulkCategory")}
          value={value}
          onChange={setChoice}
          options={options}
          disabled={mixed || pending}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        pending={pending}
        disabled={mixed || value === ""}
        onClick={() => onApply(value === UNCATEGORIZED_OPTION ? null : value)}
      >
        {t("transactions.setCategory")}
      </Button>
      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" pending={tagPending} disabled={pending} />
          }
        >
          {t("tags.bulkApply")}
        </PopoverTrigger>
        <PopoverContent align="start" aria-label={t("tags.field")} className="w-72">
          <TagPicker
            tags={tags}
            value={tagChoice}
            onChange={setTagChoice}
            aria-label={t("tags.field")}
            hint={t("tags.bulkReplaceHint")}
          />
          <div className="flex justify-end border-t pt-2">
            <Button
              type="button"
              size="sm"
              disabled={tags.length === 0 || tagPending}
              onClick={() => onApplyTags(tagChoice)}
            >
              {t("tags.bulkApply")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger
          render={
            <Button type="button" variant="outline" pending={movePending} disabled={pending} />
          }
        >
          <ArrowRightLeft />
          {t("transactions.moveToAccount")}
        </PopoverTrigger>
        <PopoverContent align="start" aria-label={t("transactions.moveToAccount")} className="w-72">
          <SelectField
            aria-label={t("transactions.moveAccountField")}
            aria-describedby="tx-move-hint"
            placeholder={t("transactions.moveAccountField")}
            value={targetAccount}
            onChange={setAccountChoice}
            options={accountOptions}
          />
          <Hint id="tx-move-hint">{t("transactions.moveHint")}</Hint>
          <div className="flex justify-end border-t pt-2">
            <Button
              type="button"
              size="sm"
              disabled={targetAccount === "" || movePending}
              onClick={() => onMove(targetAccount)}
            >
              {t("transactions.move")}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      <Button type="button" variant="outline" disabled={pending || !groupable} onClick={onGroup}>
        <Group />
        {t("transactions.groups.group")}
      </Button>
      <Button
        type="button"
        variant="outline-destructive"
        pending={deletePending}
        disabled={pending}
        onClick={onDelete}
      >
        <Trash2 />
        {t("transactions.deleteSelected")}
      </Button>
      <Button type="button" variant="outline" disabled={pending} onClick={onClear}>
        {t("transactions.clearSelection")}
      </Button>
      {mixed ? (
        <p id="tx-selection-hint" className="basis-full text-xs text-muted-foreground">
          {t("transactions.mixedTypesHint")}
        </p>
      ) : null}
    </div>
  );
}
