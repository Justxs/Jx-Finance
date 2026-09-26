import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { EmptyText } from "@/components/ui/empty-text/empty-text";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  name: string;
}

interface Props {
  id?: string;
  items: readonly Item[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  "aria-label": string;
  "aria-describedby"?: string;
  emptyText?: string;
  className?: string;
}

export function CheckboxList({
  id,
  items,
  value,
  onChange,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
  emptyText,
  className,
}: Readonly<Props>) {
  const chosen = new Set(value);

  function toggle(itemId: string, selected: boolean) {
    onChange(selected ? [...value, itemId] : value.filter((chosenId) => chosenId !== itemId));
  }

  return (
    <div
      role="group"
      id={id}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={cn("space-y-1.5 overflow-y-auto", className)}
    >
      {items.length === 0 && emptyText ? (
        <EmptyText size="sm">{emptyText}</EmptyText>
      ) : (
        items.map((item) => (
          <label key={item.id} className="flex items-center gap-2.5 text-sm">
            <Checkbox
              checked={chosen.has(item.id)}
              onCheckedChange={(next) => toggle(item.id, next)}
            />
            <span className="min-w-0 wrap-break-word">{item.name}</span>
          </label>
        ))
      )}
    </div>
  );
}
