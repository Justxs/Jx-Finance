import { useTranslation } from "react-i18next";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { CategoryIcon, categoryIconNames, isCategoryIconName } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (icon: string | null) => void;
}

const tileClass =
  "flex h-8 items-center justify-center rounded-md border text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:h-11";
const selectedClass = "border-primary bg-primary/10 text-primary";

export function IconPicker({ value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();

  function iconName(name: string) {
    return isCategoryIconName(name) ? t(`categories.icons.${name}`) : name.replaceAll("-", " ");
  }

  return (
    <div role="group" aria-label={t("categories.icon")} className="space-y-2">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {value ? <CategoryIcon icon={value} className="text-foreground" /> : null}
        {value
          ? t("categories.iconSelected", { name: iconName(value) })
          : t("categories.noIconSelected")}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cn(tileClass, "px-2.5 text-xs", value === null && selectedClass)}
        >
          {t("categories.noIcon")}
        </button>
        {categoryIconNames.map((name) => (
          <Tooltip key={name} content={iconName(name)}>
            <button
              type="button"
              aria-label={iconName(name)}
              aria-pressed={value === name}
              onClick={() => onChange(name)}
              className={cn(tileClass, "w-8 pointer-coarse:w-11", value === name && selectedClass)}
            >
              <CategoryIcon icon={name} />
            </button>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
