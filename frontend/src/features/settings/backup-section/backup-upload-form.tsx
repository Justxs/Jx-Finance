import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUploadBackup } from "@/api/generated";
import { FormError } from "@/components/form-error/form-error";
import { Button } from "@/components/ui/button/button";
import { FieldError } from "@/components/ui/field-error";
import { FileInput } from "@/components/ui/file-input/file-input";
import { silent } from "@/lib/mutations";

const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;

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
    if (!file) {
      setFileError(t("backup.fileRequired"));
      return;
    }
    if (file.size === 0) {
      setFileError(t("backup.fileEmpty"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(t("backup.fileTooLarge"));
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
      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="backup-file">
          {t("backup.file")}
        </label>
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
          aria-invalid={fileError ? true : undefined}
          aria-describedby={fileError ? "backup-file-hint backup-file-error" : "backup-file-hint"}
        />
        <FieldError id="backup-file-error" message={fileError} />
      </div>
      <FormError error={uploadMutation.error} />
      <Button type="submit" variant="outline" pending={uploadMutation.isPending}>
        {t("backup.upload")}
      </Button>
    </form>
  );
}
