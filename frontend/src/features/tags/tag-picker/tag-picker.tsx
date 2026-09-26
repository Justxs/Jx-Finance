import { type ReactNode, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TagResponse } from "@/api/generated/model";
import { CheckboxList } from "@/components/checkbox-list/checkbox-list";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { Hint } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input/input";
import { cn } from "@/lib/utils";

interface Props {
  id?: string;
  tags: TagResponse[];
  value: string[];
  onChange: (next: string[]) => void;
  "aria-label"?: string;
  hint?: ReactNode;
  className?: string;
}

const SEARCH_FROM = 8;

export function TagPicker({
  id,
  tags,
  value,
  onChange,
  "aria-label": ariaLabel,
  hint,
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const hintId = useId();
  const [query, setQuery] = useState("");

  const showSearch = tags.length >= SEARCH_FROM;
  const needle = query.trim().toLocaleLowerCase("lt");
  const shown = needle
    ? tags.filter((tag) => tag.name.toLocaleLowerCase("lt").includes(needle))
    : tags;

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
      <CheckboxList
        id={showSearch ? undefined : id}
        items={shown}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel ?? t("tags.field")}
        aria-describedby={hint ? hintId : undefined}
        emptyText={t("tags.noMatches")}
        className="max-h-44"
      />
      {hint ? <Hint id={hintId}>{hint}</Hint> : null}
    </div>
  );
}
