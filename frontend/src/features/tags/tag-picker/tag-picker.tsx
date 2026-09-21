import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { TagResponse } from "@/api/generated/model";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Input } from "@/components/ui/input/input";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  tags: TagResponse[];
  value: string[];
  onChange: (next: string[]) => void;
  "aria-label"?: string;
  "aria-describedby"?: string;
  className?: string;
  searchFrom?: number;
}

const SEARCH_FROM = 8;

export function TagPicker({
  id,
  tags,
  value,
  onChange,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  className,
  searchFrom = SEARCH_FROM,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const chosen = new Set(value);
  const showSearch = tags.length >= searchFrom;
  const needle = query.trim().toLocaleLowerCase("lt");
  const shown = needle
    ? tags.filter((tag) => tag.name.toLocaleLowerCase("lt").includes(needle))
    : tags;

  function toggle(tagId: string, selected: boolean) {
    onChange(selected ? [...value, tagId] : value.filter((chosenId) => chosenId !== tagId));
  }

  if (tags.length === 0) {
    return <EmptyText size="sm">{t("tags.empty")}</EmptyText>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showSearch ? (
        <Input
          id={id}
          type="search"
          aria-label={t("tags.searchPlaceholder")}
          placeholder={t("tags.searchPlaceholder")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      ) : null}
      <div
        role="group"
        id={showSearch ? undefined : id}
        aria-label={ariaLabel ?? t("tags.field")}
        aria-describedby={ariaDescribedBy}
        className="max-h-44 space-y-1.5 overflow-y-auto"
      >
        {shown.length === 0 ? (
          <EmptyText size="sm">{t("tags.noMatches")}</EmptyText>
        ) : (
          shown.map((tag) => (
            <label key={tag.id} className="flex items-center gap-2.5 text-sm">
              <Checkbox
                checked={chosen.has(tag.id)}
                onCheckedChange={(next) => toggle(tag.id, next)}
              />
              <span className="min-w-0 wrap-break-word">{tag.name}</span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
