import { Check, type LucideIcon, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button/button";
import { Input } from "@/components/ui/input/input";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover/popover";
import { SAVED_NAME_MAX_LENGTH } from "@/stores/transaction-views";

export interface SavedListItem {
  id: string;
  name: string;
  note?: string;
}

interface Props {
  icon: LucideIcon;
  label: string;
  items: readonly SavedListItem[];
  emptyText: string;
  applyHint: string;
  saveLabel?: string;
  savePlaceholder?: string;
  saveHint?: string;
  canSave?: boolean;
  onSave?: (name: string) => void;
  onApply: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  className?: string;
  defaultOpen?: boolean;
}

export function SavedListMenu({
  icon: Icon,
  label,
  items,
  emptyText,
  applyHint,
  saveLabel,
  savePlaceholder,
  saveHint,
  canSave = false,
  onSave,
  onApply,
  onRename,
  onDelete,
  className,
  defaultOpen = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [newName, setNewName] = useState("");

  function startRenaming(item: SavedListItem) {
    setRenamingId(item.id);
    setDraftName(item.name);
  }

  function confirmRename() {
    if (renamingId && draftName.trim()) {
      onRename(renamingId, draftName);
    }
    setRenamingId(null);
  }

  function save() {
    if (!newName.trim() || !onSave) {
      return;
    }
    onSave(newName);
    setNewName("");
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setRenamingId(null);
      }}
    >
      <PopoverTrigger
        render={<Button type="button" variant="ghost" size="sm" className={className} />}
      >
        <Icon />
        {label}
        {items.length > 0 ? <span className="tabular-nums">· {items.length}</span> : null}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2.5">
        <PopoverTitle className="text-sm">{label}</PopoverTitle>

        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">{emptyText}</p>
        ) : (
          <ul className="border-t border-t-rule">
            {items.map((item) =>
              renamingId === item.id ? (
                <li key={item.id} className="flex items-center gap-1 border-b py-1.5">
                  <Input
                    aria-label={t("transactions.savedName")}
                    value={draftName}
                    maxLength={SAVED_NAME_MAX_LENGTH}
                    className="h-8 min-w-0 flex-1"
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        confirmRename();
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    disabled={!draftName.trim()}
                    aria-label={t("actions.save")}
                    onClick={confirmRename}
                  >
                    <Check />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("actions.cancel")}
                    onClick={() => setRenamingId(null)}
                  >
                    <X />
                  </Button>
                </li>
              ) : (
                <li key={item.id} className="flex items-center gap-1 border-b py-1">
                  <button
                    type="button"
                    className="min-w-0 flex-1 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted focus-visible:bg-muted"
                    aria-label={`${applyHint}: ${item.name}`}
                    onClick={() => {
                      setOpen(false);
                      onApply(item.id);
                    }}
                  >
                    <span className="block truncate font-medium">{item.name}</span>
                    {item.note ? (
                      <span className="block truncate text-xs text-muted-foreground">
                        {item.note}
                      </span>
                    ) : null}
                  </button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t("actions.rename")}: ${item.name}`}
                    onClick={() => startRenaming(item)}
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`${t("actions.delete")}: ${item.name}`}
                    onClick={() => onDelete(item.id)}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ),
            )}
          </ul>
        )}

        {onSave ? (
          <div className="space-y-1.5 border-t border-t-rule pt-2.5">
            <div className="flex items-center gap-2">
              <Input
                aria-label={saveLabel}
                value={newName}
                maxLength={SAVED_NAME_MAX_LENGTH}
                placeholder={savePlaceholder}
                disabled={!canSave}
                className="h-8 min-w-0 flex-1"
                onChange={(event) => setNewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    save();
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={!canSave || !newName.trim()}
                onClick={save}
              >
                {saveLabel}
              </Button>
            </div>
            {!canSave && saveHint ? (
              <p className="text-xs text-muted-foreground">{saveHint}</p>
            ) : null}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
