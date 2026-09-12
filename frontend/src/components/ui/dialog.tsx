import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const CLOSE_MS = 140;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const [mounted, setMounted] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setMounted(true);
    }
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }

    if (open) {
      if (!dialog.open) {
        dialog.showModal();
      }
      return;
    }

    if (!dialog.open) {
      return;
    }

    const timer = setTimeout(() => {
      dialog.close();
      setMounted(false);
    }, CLOSE_MS);
    return () => clearTimeout(timer);
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-state={open ? "open" : "closed"}
      onClose={() => onOpenChange(false)}
      onCancel={(e) => {
        e.preventDefault();
        onOpenChange(false);
      }}
      onClick={(e) => {
        if (e.target === ref.current) {
          onOpenChange(false);
        }
      }}
      className={cn(
        "fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-hidden rounded-md border bg-card p-0 text-card-foreground shadow-lg backdrop:bg-black/40",
        className,
      )}
    >
      {mounted ? (
        <div className="flex max-h-[calc(100dvh-2rem)] flex-col">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-4 sm:px-6">
            <div className="min-w-0 wrap-break-word">
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-muted-foreground">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label={t("actions.close")}
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6">
            {children}
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
