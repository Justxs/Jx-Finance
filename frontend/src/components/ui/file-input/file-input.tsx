import { type LucideIcon, Upload } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { buttonVariants } from "@/components/ui/button/button";
import { cn } from "@/lib/utils";

const pickerClass =
  "cursor-pointer has-focus-visible:border-ring has-focus-visible:ring-3 has-focus-visible:ring-ring/50 has-disabled:pointer-events-none has-disabled:opacity-50";

const zoneClass =
  "relative flex min-h-28 w-full flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input bg-muted/40 px-3 py-3 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground data-dragging:border-primary data-dragging:bg-accent data-dragging:text-accent-foreground";

type Props = Omit<ComponentProps<"input">, "type" | "className"> & {
  placeholder: string;
  dropPlaceholder?: string;
  variant?: "zone" | "button";
  icon?: LucideIcon;
  className?: string;
};

export function FileInput({
  id,
  placeholder,
  dropPlaceholder,
  variant = "zone",
  icon: Icon = Upload,
  onChange,
  className,
  ...props
}: Readonly<Props>) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const text = (dragging ? dropPlaceholder : null) ?? fileName ?? placeholder;

  return (
    <label
      htmlFor={id}
      data-dragging={dragging || undefined}
      className={cn(
        pickerClass,
        variant === "button" ? buttonVariants({ variant: "outline", size: "sm" }) : zoneClass,
        className,
      )}
    >
      {variant === "button" ? (
        <>
          <Icon />
          {text}
        </>
      ) : (
        <>
          <Icon className="size-5 shrink-0" />
          <span className="max-w-full truncate px-4 font-medium">{text}</span>
        </>
      )}
      <input
        id={id}
        type="file"
        className={
          variant === "button" ? "sr-only" : "absolute inset-0 size-full cursor-pointer opacity-0"
        }
        onDragEnter={() => setDragging(true)}
        onDragLeave={() => setDragging(false)}
        onDrop={() => setDragging(false)}
        onChange={(event) => {
          onChange?.(event);
          setFileName(event.target.files?.[0]?.name ?? null);
        }}
        {...props}
      />
    </label>
  );
}
