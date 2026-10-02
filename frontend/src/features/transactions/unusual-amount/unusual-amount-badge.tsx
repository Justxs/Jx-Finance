import { TrendingUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useDismissUnusualAmount, useRestoreUnusualAmount } from "@/api/generated";
import type { UnusualAmountResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover/popover";
import { useFeature } from "@/hooks/use-settings";
import { useUnusualSentence } from "./use-unusual-sentence";

interface Props {
  transactionId: string;
  unusual: UnusualAmountResponse | null;
  dismissed: boolean;
  className?: string;
}

export function UnusualAmountBadge({
  transactionId,
  unusual,
  dismissed,
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const enabled = useFeature("unusualAmounts");
  const sentence = useUnusualSentence();
  const [open, setOpen] = useState(false);
  const dismiss = useDismissUnusualAmount();
  const restore = useRestoreUnusualAmount();

  if (!enabled || !unusual) {
    return null;
  }

  const text = sentence(unusual);
  const label = dismissed ? `${text} ${t("transactions.unusual.dismissedNote")}` : text;

  function markNotUnusual() {
    dismiss.mutate(
      { id: transactionId },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(t("transactions.unusual.dismissed"), {
            action: {
              label: t("trash.undo"),
              onClick: () => restore.mutate({ id: transactionId }),
            },
          });
        },
      },
    );
  }

  function markUnusualAgain() {
    restore.mutate(
      { id: transactionId },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success(t("transactions.unusual.restored"));
        },
      },
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant={dismissed ? "link-muted" : "link"}
            size="inline"
            aria-label={label}
            tooltip={label}
            className={className}
          />
        }
      >
        <TrendingUp className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        <PopoverTitle>{text}</PopoverTitle>
        {dismissed ? (
          <p className="text-xs text-muted-foreground">{t("transactions.unusual.dismissedNote")}</p>
        ) : null}
        <div className="flex justify-end border-t pt-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            pending={dismissed ? restore.isPending : dismiss.isPending}
            onClick={dismissed ? markUnusualAgain : markNotUnusual}
          >
            {dismissed
              ? t("transactions.unusual.markAgain")
              : t("transactions.unusual.markNotUnusual")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
