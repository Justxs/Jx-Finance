import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUploadBackup } from "@/api/generated";
import { FormError } from "@/components/form-error/form-error";
import { FieldShell, shellAria } from "@/components/form/field-shell/field-shell";
import { Button } from "@/components/ui/button/button";
import { FileInput } from "@/components/ui/file-input/file-input";
import type { TranslationKey } from "@/lib/i18n";
import { silent } from "@/lib/mutations";
import { type UploadProblem, validateUpload } from "@/lib/upload-file";

const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;

const uploadProblemKeys = {
  required: "backup.fileRequired",
  empty: "backup.fileEmpty",
  tooLarge: "backup.fileTooLarge",
} as const satisfies Record<UploadProblem, TranslationKey>;

export function BackupUploadForm() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [uploadKey, setUploadKey] = useState(0);

  const uploadMutation = useUploadBackup(
    silent({
      onSuccess: () => {
        toast.success(t("backup.uploaded"));
        setUploadKey((key) => key + 1);
      },
    }),
  );

  function handleUpload() {
    const file = fileInputRef.current?.files?.[0];
    const problem = validateUpload(file, MAX_FILE_BYTES);
    if (!file || problem) {
      setFileError(t(uploadProblemKeys[problem ?? "required"]));
      return;
    }
    setFileError(undefined);
    uploadMutation.mutate({ data: { file } });
  }

  return (
    <form
      noValidate
      className="max-w-xl space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        handleUpload();
      }}
    >
      <h3 className="text-sm font-semibold">{t("backup.uploadTitle")}</h3>
      <p id="backup-file-hint" className="text-sm text-muted-foreground">
        {t("backup.uploadHint")}
      </p>
      <FieldShell id="backup-file" label={t("backup.file")} error={fileError}>
        <FileInput
          key={uploadKey}
          id="backup-file"
          ref={fileInputRef}
          accept=".zip,.gz,.json,application/zip,application/gzip,application/json"
          disabled={uploadMutation.isPending}
          onChange={() => {
            setFileError(undefined);
            uploadMutation.reset();
          }}
          placeholder={t("backup.chooseFile")}
          {...shellAria({ id: "backup-file", hint: true, error: fileError })}
        />
      </FieldShell>
      <FormError error={uploadMutation.error} />
      <Button type="submit" variant="outline" pending={uploadMutation.isPending}>
        {t("backup.upload")}
      </Button>
    </form>
  );
}
