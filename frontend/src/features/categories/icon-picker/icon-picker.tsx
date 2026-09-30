import { Radio } from "@base-ui/react/radio";
import { RadioGroup } from "@base-ui/react/radio-group";
import { useTranslation } from "react-i18next";
import { Tooltip } from "@/components/ui/tooltip/tooltip";
import { CategoryIcon, categoryIconNames, isCategoryIconName } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

interface Props {
  value: string | null;
  onChange: (icon: string | null) => void;
  "aria-labelledby": string;
}

const NO_ICON = "";

const tileClass =
  "flex h-8 items-center justify-center rounded-md border text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary/10 data-checked:text-primary pointer-coarse:h-11";

export function IconPicker({ value, onChange, "aria-labelledby": labelledBy }: Readonly<Props>) {
  const { t } = useTranslation();

  function iconName(name: string) {
    return isCategoryIconName(name) ? t(`categories.icons.${name}`) : name.replaceAll("-", " ");
  }

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        {value ? <CategoryIcon icon={value} className="text-foreground" /> : null}
        {value
          ? t("categories.iconSelected", { name: iconName(value) })
          : t("categories.noIconSelected")}
      </p>
      <RadioGroup
        aria-labelledby={labelledBy}
        value={value ?? NO_ICON}
        onValueChange={(next: string) => onChange(next === NO_ICON ? null : next)}
        className="flex flex-wrap gap-1.5"
      >
        <Radio.Root value={NO_ICON} className={cn(tileClass, "px-2.5 text-xs")}>
          {t("categories.noIcon")}
        </Radio.Root>
        {categoryIconNames.map((name) => (
          <Tooltip key={name} content={iconName(name)}>
            <Radio.Root
              value={name}
              aria-label={iconName(name)}
              className={cn(tileClass, "w-8 pointer-coarse:w-11")}
            >
              <CategoryIcon icon={name} />
            </Radio.Root>
          </Tooltip>
        ))}
      </RadioGroup>
    </div>
  );
}
