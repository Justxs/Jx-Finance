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
        <button
          key={name}
          type="button"
          title={name}
          onClick={() => onChange(value === name ? null : name)}
          className={cn(
            "flex size-8 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
            value === name && "border-primary bg-primary/10 text-primary",
          )}
        >
          <CategoryIcon icon={name} />
        </button>
      ))}
    </div>
  );
}
