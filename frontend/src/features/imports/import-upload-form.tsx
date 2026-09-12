import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FileInput } from "@/components/ui/file-input";
import { Select } from "@/components/ui/select";

interface Props {
  accounts: AccountResponse[];
  accountId: string;
  onAccountChange: (accountId: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPreview: () => void;
  onFileChange: () => void;
  previewPending: boolean;
}

export function ImportUploadForm({
  accounts,
  accountId,
  onAccountChange,
  fileInputRef,
  onPreview,
  onFileChange,
  previewPending,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <div className="border-b p-6">
      <h2 className="mb-5 font-semibold">{t("imports.title")}</h2>
      <div className="form-grid">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="import-account">
            {t("transactions.account")}
          </label>
          <Select
            id="import-account"
            value={accountId}
            disabled={previewPending}
            onChange={(e) => onAccountChange(e.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5 col-span-full">
          <label className="text-sm font-medium" htmlFor="import-file">
            {t("imports.file")}
          </label>
          <FileInput
            id="import-file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            disabled={previewPending}
            onChange={onFileChange}
            placeholder={t("imports.chooseFile")}
          />
        </div>
      </div>
      <Button className="mt-4" pending={previewPending} disabled={!accountId} onClick={onPreview}>
        {t("imports.preview")}
      </Button>
    </div>
  );
}
