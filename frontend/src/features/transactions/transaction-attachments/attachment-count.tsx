import { Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface Props {
  count: number;
  className?: string;
}

export function AttachmentCount({ count, className }: Readonly<Props>) {
  const { t } = useTranslation();

  if (count <= 0) {
    return null;
  }

  const label = t("transactions.attachments.count", { count });

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 text-xs text-muted-foreground tabular-nums",
        className,
      )}
      title={label}
    >
      <Paperclip className="size-3.5" aria-hidden="true" />
      <span aria-hidden="true">{count}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
