import { EllipsisVertical } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TagResponse } from "@/api/generated/model";
import { TagPicker } from "@/components/tag-picker/tag-picker";
import { Button } from "@/components/ui/button/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";
import { ImportSpreadFields } from "./import-spread-fields";
import type { PreviewRowState } from "./preview-rows";

interface Props {
  row: PreviewRowState;
  rowName: string;
  tags: TagResponse[];
  editable: boolean;
  canMarkTransfer: boolean;
  onMarkTransfer: () => void;
  onChange: (patch: Partial<PreviewRowState>) => void;
}

export function ImportRowOptions({
  row,
  rowName,
  tags,
  editable,
  canMarkTransfer,
  onMarkTransfer,
  onChange,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const id = useId();
  const [open, setOpen] = useState(false);
  const withTags = editable && tags.length > 0;

  if (!editable && !canMarkTransfer) {
    return null;
  }

  function markTransfer() {
    setOpen(false);
    onMarkTransfer();
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            tooltip={t("imports.more")}
            aria-label={t("imports.moreFor", { row: rowName })}
          />
        }
      >
        <EllipsisVertical />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        aria-label={t("imports.moreFor", { row: rowName })}
        className="w-64 space-y-3"
      >
        {withTags ? (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{t("imports.chooseTags")}</p>
            <TagPicker
              tags={tags}
              value={row.tagIds}
              onChange={(tagIds) => onChange({ tagIds })}
              aria-label={t("imports.tagsFor", { row: rowName })}
            />
          </div>
        ) : null}
        {editable ? (
          <ImportSpreadFields
            id={`import-spread-${id}`}
            spreadMonths={row.spreadMonths}
            spreadDirection={row.spreadDirection}
            onChange={onChange}
          />
        ) : null}
        {canMarkTransfer ? (
          <Button type="button" variant="outline" size="sm" onClick={markTransfer}>
            {t("imports.markTransfer")}
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
