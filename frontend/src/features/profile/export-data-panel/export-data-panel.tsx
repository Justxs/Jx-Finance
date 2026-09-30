import { Download } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getExportMyDataUrl, useImportMyData } from "@/api/generated";
import type { ImportMyDataResponse } from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { Button, buttonVariants } from "@/components/ui/button/button";
import { Checkbox } from "@/components/ui/checkbox/checkbox";
import { FileInput } from "@/components/ui/file-input/file-input";
import { TitledSection } from "@/components/ui/section/section";
import { useFileField } from "@/hooks/use-file-field";
import { silentMutation } from "@/lib/mutations";

const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;

export const IMPORT_FILE_INPUT_ID = "data-import-file";

const uploadProblemKeys = {
  required: "profile.dataImport.fileRequired",
  empty: "profile.dataImport.fileEmpty",
  tooLarge: "profile.dataImport.fileTooLarge",
} as const;

export function ExportDataPanel() {
  const { t } = useTranslation();
  const [attachments, setAttachments] = useState(false);

  return (
    <TitledSection
      title={t("profile.dataExport.title")}
      description={t("profile.dataExport.description")}
      bodyGap="md"
    >
      <p className="max-w-prose text-sm text-muted-foreground">
        {t("profile.dataExport.excluded")}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <a
          href={getExportMyDataUrl(attachments ? { attachments } : {})}
          className={buttonVariants({ variant: "outline" })}
        >
          <Download />
          {t("profile.dataExport.download")}
        </a>
        <label className="flex items-center gap-2.5 text-sm">
          <Checkbox checked={attachments} onCheckedChange={setAttachments} />
          <span>{t("profile.dataExport.attachments")}</span>
        </label>
      </div>
      <ImportDataForm />
    </TitledSection>
  );
}

function ImportDataForm() {
  const { t } = useTranslation();
  const fileField = useFileField(IMPORT_FILE_INPUT_ID, MAX_FILE_BYTES, uploadProblemKeys);
  const importMutation = useImportMyData({
    mutation: { ...silentMutation, onSuccess: fileField.reset },
  });

  function handleImport() {
    const file = fileField.take();
    if (file) {
      importMutation.mutate({ data: { file } });
    }
  }

  return (
    <form
      noValidate
      className="mt-8 max-w-xl space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        handleImport();
      }}
    >
      <h3 className="text-sm font-semibold">{t("profile.dataImport.title")}</h3>
      <p className="text-sm text-muted-foreground">{t("profile.dataImport.description")}</p>
      <FieldShell
        id={IMPORT_FILE_INPUT_ID}
        label={t("profile.dataImport.file")}
        hint={t("profile.dataImport.fileHint")}
        error={fileField.error}
      >
        <FileInput
          key={fileField.key}
          {...fileField.inputProps}
          accept=".zip,application/zip"
          disabled={importMutation.isPending}
          onChange={() => {
            fileField.clearError();
            importMutation.reset();
          }}
          placeholder={t("profile.dataImport.chooseFile")}
        />
      </FieldShell>
      <FormError error={importMutation.error} />
      {importMutation.data ? <ImportResult result={importMutation.data} /> : null}
      <Button type="submit" variant="outline" pending={importMutation.isPending}>
        {t("profile.dataImport.submit")}
      </Button>
    </form>
  );
}

function ImportResult({ result }: Readonly<{ result: ImportMyDataResponse }>) {
  const { t } = useTranslation();

  return (
    <div role="status" className="space-y-1 text-sm">
      <p className="font-medium">
        {t("profile.dataImport.done", { rows: result.rows, files: result.attachments })}
      </p>
      {result.removed > 0 ? (
        <p className="text-muted-foreground">
          {t("profile.dataImport.removed", { size: result.removed })}
        </p>
      ) : null}
    </div>
  );
}
