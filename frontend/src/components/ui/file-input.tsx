import { Upload } from "lucide-react";
import { type ComponentProps, useState } from "react";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"input">, "type" | "className"> & {
  placeholder: string;
  className?: string;
};

export function FileInput({ id, placeholder, onChange, className, ...props }: Readonly<Props>) {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <label
      htmlFor={id}
      className={cn(
        "flex h-28 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-input bg-muted/40 px-3 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:bg-accent hover:text-accent-foreground",
        className,
      )}
    >
      <Upload className="size-5 shrink-0" />
      <span className="max-w-full truncate px-4 font-medium">{fileName ?? placeholder}</span>
      <input
        id={id}
        type="file"
        className="sr-only"
        onChange={(e) => {
          setFileName(e.target.files?.[0]?.name ?? null);
          onChange?.(e);
        }}
        {...props}
      />
    </label>
  );
}
