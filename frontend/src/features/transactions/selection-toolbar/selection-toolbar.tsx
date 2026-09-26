import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, TagResponse, TransactionResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
import { TagPicker } from "@/features/tags/tag-picker/tag-picker";
import { namedOptions } from "@/lib/options";

const UNCATEGORIZED = "none";

interface Props {
  selected: TransactionResponse[];
  categories: CategoryResponse[];
  tags: TagResponse[];
  pending: boolean;
  tagPending: boolean;
  onApply: (categoryId: string | null) => void;
  onApplyTags: (tagIds: string[]) => void;
  onClear: () => void;
}

export function SelectionToolbar({
  selected,
  categories,
  tags,
  pending,
  tagPending,
  onApply,
  onApplyTags,
  onClear,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState("");
  const [tagChoice, setTagChoice] = useState<string[]>([]);

  const types = new Set(selected.map((item) => item.type));
  const mixed = types.size > 1;
  const type = mixed ? undefined : selected[0]?.type;

  const options = namedOptions(
    categories.filter((category) => category.type === type),
    t("transactions.uncategorized"),
    UNCATEGORIZED,
  );
  const value = !mixed && options.some((option) => option.value === choice) ? choice : "";

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
        <SelectField
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
        onClick={() => onApply(value === UNCATEGORIZED ? null : value)}
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
      <Button type="button" variant="ghost" disabled={pending} onClick={onClear}>
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
