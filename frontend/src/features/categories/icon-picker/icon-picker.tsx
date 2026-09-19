import { Tooltip } from "@/components/ui/tooltip";
import { CategoryIcon, categoryIconNames } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (icon: string | null) => void;
}

export function IconPicker({ value, onChange }: Readonly<Props>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {categoryIconNames.map((name) => (
        <Tooltip key={name} content={name.replaceAll("-", " ")}>
          <button
            type="button"
            aria-label={name.replaceAll("-", " ")}
            aria-pressed={value === name}
            onClick={() => onChange(value === name ? null : name)}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:size-11",
              value === name && "border-primary bg-primary/10 text-primary",
            )}
          >
            <CategoryIcon icon={name} />
          </button>
        </Tooltip>
      ))}
    </div>
  );
}
