import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface Props<T extends string> {
  id?: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

export function SegmentedControl<T extends string>({
  id,
  value,
  onChange,
  options,
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
}: Readonly<Props<T>>) {
  return (
    <RadioGroup
      id={id}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      aria-describedby={ariaDescribedBy}
      onValueChange={(next) => {
        const chosen = options.find((option) => option.value === next);
        if (chosen) {
          onChange(chosen.value);
        }
      }}
      className={cn(
        "inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-input bg-muted/40 p-px dark:bg-input/30",
        className,
      )}
    >
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm whitespace-nowrap text-muted-foreground focus-ring-inset transition-colors hover:text-foreground data-checked:bg-background data-checked:font-medium data-checked:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 dark:data-checked:bg-input/60 pointer-coarse:h-10"
        >
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
