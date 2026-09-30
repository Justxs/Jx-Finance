import { type RefObject, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse, StatementFormat } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { FileInput } from "@/components/ui/file-input/file-input";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { Section, SectionTitle } from "@/components/ui/section/section";
import { ButtonSkeleton, Skeleton, TextSkeleton } from "@/components/ui/skeleton/skeleton";
import { shellAria } from "@/lib/field-aria";
import { namedOptions } from "@/lib/options";

export const IMPORT_FILE_INPUT_ID = "import-file";

export const importFormats: Record<StatementFormat, { accept: string; maxBytes: number }> = {
  swedbankCsv: { accept: ".csv,text/csv", maxBytes: 5 * 1024 * 1024 },
  camt053: { accept: ".xml,application/xml,text/xml", maxBytes: 20 * 1024 * 1024 },
  genericCsv: { accept: ".csv,.txt,text/csv", maxBytes: 5 * 1024 * 1024 },
};
interface Props {
  accounts: AccountResponse[];
  accountId: string;
  onAccountChange: (accountId: string) => void;
  format: StatementFormat;
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
  format,
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
        <FieldShell id="import-account" label={t("transactions.account")}>
          <SelectField
            id="import-account"
            value={accountId}
            disabled={locked}
            onChange={onAccountChange}
            options={namedOptions(accounts)}
          />
        </FieldShell>
        <FieldShell
          id={IMPORT_FILE_INPUT_ID}
          label={t("imports.file")}
          hint={t(`imports.formats.${format}.hint`)}
          error={fileError}
          className="col-span-full"
        >
          <FileInput
            id={IMPORT_FILE_INPUT_ID}
            ref={fileInputRef}
            accept={importFormats[format].accept}
            disabled={locked}
            onChange={(event) => {
              setFileName(event.target.files?.[0]?.name ?? "");
              onFileChange();
            }}
            placeholder={t("imports.chooseFile")}
            {...shellAria({ id: IMPORT_FILE_INPUT_ID, hint: true, error: fileError })}
          />
        </FieldShell>
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

export function ImportUploadFormSkeleton() {
  return (
    <Section aria-hidden="true">
      <TextSkeleton size="title" width="w-40" className="mb-4" />
      <FormGrid>
        <div className="space-y-1.5">
          <TextSkeleton size="label" />
          <Skeleton className="h-9 rounded-lg pointer-coarse:h-11" />
        </div>
        <div className="col-span-full space-y-1.5">
          <TextSkeleton size="label" />
          <Skeleton className="h-28 rounded-lg" />
          <TextSkeleton size="xs" width="w-2/3" />
        </div>
      </FormGrid>
      <div className="mt-4 flex justify-end">
        <ButtonSkeleton />
      </div>
    </Section>
  );
}
