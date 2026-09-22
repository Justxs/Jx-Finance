import { useTranslation } from "react-i18next";
import type { TagResponse } from "@/api/generated/model";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
import { TagChips } from "@/features/tags/tag-chips/tag-chips";
import { TagPicker } from "@/features/tags/tag-picker/tag-picker";
import { byId } from "@/lib/options";

interface Props {
  tags: TagResponse[];
  value: string[];
  label: string;
  disabled: boolean;
  onChange: (next: string[]) => void;
}

export function ImportTagPicker({ tags, value, label, disabled, onChange }: Readonly<Props>) {
  const { t } = useTranslation();

  if (tags.length === 0) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        render={
          <button
            type="button"
            aria-label={label}
            className="inline-flex min-h-6 max-w-full items-center gap-1 rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 pointer-coarse:min-h-11"
          />
        }
      >
        {value.length === 0 ? (
          t("imports.chooseTags")
        ) : (
          <TagChips tagIds={value} tagById={byId(tags)} />
        )}
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} className="w-64">
        <TagPicker tags={tags} value={value} onChange={onChange} aria-label={label} />
      </PopoverContent>
    </Popover>
  );
}
