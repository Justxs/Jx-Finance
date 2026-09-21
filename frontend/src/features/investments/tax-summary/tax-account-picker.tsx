import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover/popover";

interface Props {
  accounts: readonly AccountResponse[];
  value: readonly string[];
  onChange: (next: string[]) => void;
}

export function TaxAccountPicker({ accounts, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();
  const chosen = new Set(value);
  const label =
    chosen.size === 0
      ? t("investments.tax.allAccounts")
      : t("investments.tax.someAccounts", { count: chosen.size });

  function toggle(accountId: string, selected: boolean) {
    onChange(selected ? [...value, accountId] : value.filter((id) => id !== accountId));
  }

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
        <div
          role="group"
          aria-label={t("investments.tax.accounts")}
          className="max-h-60 space-y-1.5 overflow-y-auto"
        >
          {accounts.map((account) => (
            <label key={account.id} className="flex items-center gap-2.5 text-sm">
              <Checkbox
                checked={chosen.has(account.id)}
                onCheckedChange={(next) => toggle(account.id, next)}
              />
              <span className="min-w-0 wrap-break-word">{account.name}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
