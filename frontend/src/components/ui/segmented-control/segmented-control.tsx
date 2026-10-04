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
  value: T | null;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

function followChecked(group: HTMLDivElement) {
  function place() {
    const checked = group.querySelector<HTMLElement>(":scope > [data-checked]");
    if (checked) {
      group.style.setProperty("--segment-left", `${checked.offsetLeft}px`);
      group.style.setProperty("--segment-width", `${checked.offsetWidth}px`);
      group.dataset.placed = "";
    } else {
      delete group.dataset.placed;
    }
  }

  const resize = new ResizeObserver(place);
  function observeSegments() {
    resize.disconnect();
    for (const segment of group.querySelectorAll(":scope > [role=radio]")) {
      resize.observe(segment);
    }
    place();
  }

  const mutation = new MutationObserver(observeSegments);
  mutation.observe(group, { childList: true, subtree: true, attributeFilter: ["data-checked"] });
  observeSegments();
  const frame = requestAnimationFrame(() => {
    group.dataset.ready = "";
  });

  return () => {
    cancelAnimationFrame(frame);
    mutation.disconnect();
    resize.disconnect();
  };
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
      ref={followChecked}
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
        "group/segments relative isolate inline-flex max-w-full gap-0.5 overflow-x-auto rounded-lg border border-input bg-muted/40 p-px dark:bg-input/30",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-px left-(--segment-left) w-(--segment-width) rounded-md bg-background opacity-0 ease-out-expo group-data-placed/segments:opacity-100 group-data-ready/segments:transition-[left,width] group-data-ready/segments:duration-slow dark:bg-input/60"
      />
      {options.map((option) => (
        <Radio.Root
          key={option.value}
          value={option.value}
          className="relative inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm whitespace-nowrap text-muted-foreground focus-ring-inset transition-colors duration-slow ease-out-expo hover:text-foreground data-checked:font-medium data-checked:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 pointer-coarse:h-10"
        >
          {option.label}
        </Radio.Root>
      ))}
    </RadioGroup>
  );
}
