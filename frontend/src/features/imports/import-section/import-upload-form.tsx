import { type RefObject, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { FieldError, Hint } from "@/components/ui/field-error";
import { FileInput } from "@/components/ui/file-input/file-input";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Label } from "@/components/ui/label/label";
import { SectionTitle } from "@/components/ui/section/section";
import { namedOptions } from "@/lib/options";

export const IMPORT_FILE_INPUT_ID = "import-file";

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
  const [fileName, setFileName] = useState("");
  const [expanded, setExpanded] = useState(false);
  const collapsed = secondary && !expanded;
  const accountName = accounts.find((account) => account.id === accountId)?.name;

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onPreview();
      }}
    >
      <SectionTitle className="mb-4">{t("imports.fileSection")}</SectionTitle>
      {collapsed ? (
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span className="min-w-0 font-medium wrap-break-word">{fileName}</span>
          <span className="text-muted-foreground">{accountName}</span>
          <Button
            type="button"
            variant="link"
            size="inline"
            disabled={locked}
            onClick={() => setExpanded(true)}
          >
            {t("imports.changeFile")}
          </Button>
        </p>
      ) : null}
      <FormGrid className={collapsed ? "hidden" : undefined}>
        <div className="space-y-1.5">
          <Label htmlFor="import-account">{t("transactions.account")}</Label>
          <SelectField
            id="import-account"
            value={accountId}
            disabled={locked}
            onChange={onAccountChange}
            options={namedOptions(accounts)}
          />
        </div>
        <div className="col-span-full space-y-1.5">
          <Label htmlFor={IMPORT_FILE_INPUT_ID}>{t("imports.file")}</Label>
          <FileInput
            id={IMPORT_FILE_INPUT_ID}
            ref={fileInputRef}
            accept=".csv,text/csv"
            disabled={locked}
            onChange={(event) => {
              setFileName(event.target.files?.[0]?.name ?? "");
              onFileChange();
            }}
            placeholder={t("imports.chooseFile")}
            aria-invalid={fileError ? true : undefined}
            aria-describedby={
              fileError
                ? `${IMPORT_FILE_INPUT_ID}-hint ${IMPORT_FILE_INPUT_ID}-error`
                : `${IMPORT_FILE_INPUT_ID}-hint`
            }
          />
          <Hint id={`${IMPORT_FILE_INPUT_ID}-hint`}>{t("imports.fileHint")}</Hint>
          <FieldError id={`${IMPORT_FILE_INPUT_ID}-error`} message={fileError} />
        </div>
      </FormGrid>
      <div className={collapsed ? "hidden" : "mt-4 flex justify-end"}>
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
