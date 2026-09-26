import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { CheckboxList } from "@/components/checkbox-list/checkbox-list";
import { Button } from "@/components/ui/button/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";

interface Props {
  accounts: readonly AccountResponse[];
  value: readonly string[];
  onChange: (next: string[]) => void;
}

export function TaxAccountPicker({ accounts, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const label =
    value.length === 0
      ? t("investments.tax.allAccounts")
      : t("investments.tax.someAccounts", { count: value.length });

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("investments.tax.accounts")}
        render={<Button type="button" variant="outline" size="sm" />}
      >
        {label}
        <ChevronDown aria-hidden="true" className="text-muted-foreground" />
      </PopoverTrigger>
      <PopoverContent align="end" aria-label={t("investments.tax.accounts")} className="w-72">
        <p className="mb-2 text-xs text-muted-foreground">{t("investments.tax.accountsHint")}</p>
        <CheckboxList
          items={accounts}
          value={value}
          onChange={onChange}
          aria-label={t("investments.tax.accounts")}
          className="max-h-60"
        />
      </PopoverContent>
    </Popover>
  );
}
