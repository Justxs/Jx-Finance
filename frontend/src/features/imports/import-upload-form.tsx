import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

interface Props {
  accounts: AccountResponse[];
  accountId: string;
  onAccountChange: (accountId: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPreview: () => void;
  previewPending: boolean;
}

export function ImportUploadForm({
  accounts,
  accountId,
  onAccountChange,
  fileInputRef,
  onPreview,
  previewPending,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="border-b p-6">
      <h2 className="mb-5 font-semibold">{t("imports.title")}</h2>
      <div className="grid gap-4 md:grid-cols-3 md:items-end">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="import-account">
            {t("transactions.account")}
          </label>
          <Select id="import-account" value={accountId} onChange={(e) => onAccountChange(e.target.value)}>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-sm font-medium" htmlFor="import-file">
            {t("imports.file")}
          </label>
          <input
            id="import-file"
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-sm text-muted-foreground"
          />
        </div>
      </div>
      <Button className="mt-4" disabled={previewPending || !accountId} onClick={onPreview}>
        {t("imports.preview")}
      </Button>
    </div>
  );
}
