import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { FileInput } from "@/components/ui/file-input";

interface Props {
  accounts: AccountResponse[];
  accountId: string;
  onAccountChange: (accountId: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  onPreview: () => void;
  onFileChange: () => void;
  previewPending: boolean;
  disabled?: boolean;
  fileError?: string;
  secondary?: boolean;
}

export function ImportUploadForm({
  accounts,
  accountId,
  onAccountChange,
  fileInputRef,
  onPreview,
  onFileChange,
  previewPending,
  disabled = false,
  fileError,
  secondary = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const locked = previewPending || disabled;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onPreview();
      }}
    >
      <h2 className="section-title mb-4">{t("imports.fileSection")}</h2>
      <div className="form-grid">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="import-account">
            {t("transactions.account")}
          </label>
          <SelectField
            id="import-account"
            value={accountId}
            disabled={locked}
            onChange={onAccountChange}
            options={accounts.map((account) => ({ value: account.id, label: account.name }))}
          />
        </div>
        <div className="col-span-full space-y-1.5">
          <label className="text-sm font-medium" htmlFor="import-file">
            {t("imports.file")}
          </label>
          <FileInput
            id="import-file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            disabled={locked}
            onChange={onFileChange}
            placeholder={t("imports.chooseFile")}
            aria-invalid={fileError ? true : undefined}
            aria-describedby={fileError ? "import-file-hint import-file-error" : "import-file-hint"}
          />
          <p id="import-file-hint" className="text-xs text-muted-foreground">
            {t("imports.fileHint")}
          </p>
          <FieldError id="import-file-error" message={fileError} />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <Button
          type="submit"
          variant={secondary ? "outline" : "default"}
          pending={previewPending}
          disabled={!accountId || disabled}
        >
          {t("imports.preview")}
        </Button>
      </div>
    </form>
  );
}
