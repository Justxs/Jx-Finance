import { ArrowRightLeft, Ellipsis, Group, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type {
  AccountResponse,
  CategoryResponse,
  TagResponse,
  TransactionResponse,
} from "@/api/generated/model";
import { ComboboxField } from "@/components/combobox-field/combobox-field";
import { FormActions } from "@/components/form/form-actions/form-actions";
import { Modal } from "@/components/modal";
import { SelectField } from "@/components/select-field/select-field";
import { TagPicker } from "@/components/tag-picker/tag-picker";
import { Button } from "@/components/ui/button/button";
import { Hint } from "@/components/ui/field-error";
import { Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/menu/menu";
import { namedOptions } from "@/lib/options";
import { UNCATEGORIZED_OPTION } from "@/lib/transaction-row";
import { cn } from "@/lib/utils";

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
  className?: string;
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
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [choice, setChoice] = useState("");
  const [tagChoice, setTagChoice] = useState<string[]>([]);
  const [accountChoice, setAccountChoice] = useState("");
  const [dialog, setDialog] = useState<"tags" | "move" | null>(null);
  const accountOptions = namedOptions(accounts);
  const targetAccount = accountOptions.some((option) => option.value === accountChoice)
    ? accountChoice
    : "";

  const idle = selected.length === 0;
  const types = new Set(selected.map((item) => item.type));
  const mixed = types.size > 1;
  const type = mixed ? undefined : selected[0]?.type;

  const options = namedOptions(
    categories.filter((category) => category.type === type),
    t("transactions.uncategorized"),
    UNCATEGORIZED_OPTION,
  );
  const value = !mixed && options.some((option) => option.value === choice) ? choice : "";
  const groupable = selected.length >= 2;
  const busy = pending || tagPending || movePending || deletePending;
  const count = t("transactions.selectedCount", { count: selected.length });

  function closeDialog(open: boolean) {
    if (!open) {
      setDialog(null);
    }
  }

  return (
    <>
      <div
        role="group"
        aria-label={t("transactions.selectionToolbar")}
        aria-hidden={idle || undefined}
        inert={idle}
        data-slot="selection-toolbar"
        className={cn(
          "hidden min-h-9 flex-wrap items-center gap-x-3 gap-y-2 text-sm md:flex",
          idle && "invisible",
          className,
        )}
      >
        <span className="font-medium whitespace-nowrap tabular-nums" aria-live="polite">
          {count}
        </span>
        {mixed ? (
          <p className="line-clamp-2 max-w-88 text-xs text-muted-foreground">
            {t("transactions.mixedTypesHint")}
          </p>
        ) : (
          <>
            <div className="max-w-56 grow basis-36">
              <ComboboxField
                aria-label={t("transactions.bulkCategory")}
                placeholder={t("transactions.bulkCategory")}
                value={value}
                onChange={setChoice}
                options={options}
                disabled={busy}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              pending={pending}
              disabled={value === "" || busy}
              onClick={() => onApply(value === UNCATEGORIZED_OPTION ? null : value)}
            >
              {t("transactions.setCategory")}
            </Button>
          </>
        )}
        <Menu>
          <MenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                pending={tagPending || movePending}
                disabled={busy}
              />
            }
          >
            <Ellipsis />
            {t("transactions.moreBulkActions")}
          </MenuTrigger>
          <MenuContent align="start">
            <MenuItem onClick={() => setDialog("tags")}>
              <Tags />
              {t("tags.bulkApply")}
            </MenuItem>
            <MenuItem onClick={() => setDialog("move")}>
              <ArrowRightLeft />
              {t("transactions.moveToAccount")}
            </MenuItem>
            <MenuItem disabled={!groupable} onClick={onGroup}>
              <Group />
              {t("transactions.groups.group")}
            </MenuItem>
          </MenuContent>
        </Menu>
        <Button
          type="button"
          variant="outline-destructive"
          pending={deletePending}
          disabled={busy}
          onClick={onDelete}
        >
          <Trash2 />
          {t("transactions.deleteSelected")}
        </Button>
        <Button type="button" variant="outline" disabled={busy} onClick={onClear}>
          {t("transactions.clearSelection")}
        </Button>
      </div>
      <Modal
        open={dialog === "tags"}
        onOpenChange={closeDialog}
        title={t("tags.bulkApply")}
        description={count}
        className="sm:max-w-sm"
      >
        <div className="space-y-4">
          <TagPicker
            tags={tags}
            value={tagChoice}
            onChange={setTagChoice}
            aria-label={t("tags.field")}
            hint={t("tags.bulkReplaceHint")}
          />
          <FormActions onCancel={() => setDialog(null)} cancelDisabled={tagPending}>
            <Button
              type="button"
              pending={tagPending}
              disabled={tags.length === 0 || busy}
              onClick={() => onApplyTags(tagChoice)}
            >
              {t("tags.bulkApply")}
            </Button>
          </FormActions>
        </div>
      </Modal>
      <Modal
        open={dialog === "move"}
        onOpenChange={closeDialog}
        title={t("transactions.moveToAccount")}
        description={count}
        className="sm:max-w-sm"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <SelectField
              aria-label={t("transactions.moveAccountField")}
              aria-describedby="tx-move-hint"
              placeholder={t("transactions.moveAccountField")}
              value={targetAccount}
              onChange={setAccountChoice}
              options={accountOptions}
            />
            <Hint id="tx-move-hint">{t("transactions.moveHint")}</Hint>
          </div>
          <FormActions onCancel={() => setDialog(null)} cancelDisabled={movePending}>
            <Button
              type="button"
              pending={movePending}
              disabled={targetAccount === "" || busy}
              onClick={() => onMove(targetAccount)}
            >
              {t("transactions.move")}
            </Button>
          </FormActions>
        </div>
      </Modal>
    </>
  );
}
