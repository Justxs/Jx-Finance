import { useTranslation } from "react-i18next";
import type { TagResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
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
          <Button
            type="button"
            variant="link-muted"
            size="inline"
            aria-label={label}
            className="min-h-6 max-w-full"
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
