import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useUploadBackup } from "@/api/generated";
import { FormError } from "@/components/form-error/form-error";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { Button } from "@/components/ui/button/button";
import { FileInput } from "@/components/ui/file-input/file-input";
import { useFileField } from "@/hooks/use-file-field";
import { silent } from "@/lib/mutations";

const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;

const uploadProblemKeys = {
  required: "backup.fileRequired",
  empty: "backup.fileEmpty",
  tooLarge: "backup.fileTooLarge",
} as const;

export function BackupUploadForm() {
  const { t } = useTranslation();
  const fileField = useFileField("backup-file", MAX_FILE_BYTES, uploadProblemKeys);

  const uploadMutation = useUploadBackup(
    silent({
      onSuccess: () => {
        toast.success(t("backup.uploaded"));
        fileField.reset();
      },
    }),
  );

  function handleUpload() {
    const file = fileField.take();
    if (file) {
      uploadMutation.mutate({ data: { file } });
    }
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
      <FieldShell id="backup-file" label={t("backup.file")} error={fileField.error}>
        <FileInput
          key={fileField.key}
          {...fileField.inputProps}
          accept=".zip,.gz,.json,application/zip,application/gzip,application/json"
          disabled={uploadMutation.isPending}
          onChange={() => {
            fileField.clearError();
            uploadMutation.reset();
          }}
          placeholder={t("backup.chooseFile")}
        />
      </FieldShell>
      <FormError error={uploadMutation.error} />
      <Button type="submit" variant="outline" pending={uploadMutation.isPending}>
        {t("backup.upload")}
      </Button>
    </form>
  );
}
