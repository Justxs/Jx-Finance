import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { FileInput } from "@/components/ui/file-input";
import { Label } from "@/components/ui/label";
import { BrokerImportResult } from "./import-result";
import type { BrokerImportMutations } from "./use-broker-import-mutations";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

interface Props {
  accounts: readonly AccountResponse[];
  accountId: string;
  mutations: BrokerImportMutations;
}

export function UploadPanel({ accounts, accountId, mutations }: Readonly<Props>) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fundingAccountId, setFundingAccountId] = useState("");
  const [fileError, setFileError] = useState<string | undefined>(undefined);
  const [uploadKey, setUploadKey] = useState(0);

  const importMutation = mutations.importReport;
  const ownsImport = importMutation.variables?.data.accountId === accountId;
  const result = ownsImport ? importMutation.data : undefined;
  const failure = ownsImport ? importMutation.error : null;

  const funding = fundingAccountId === accountId ? "" : fundingAccountId;

  function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setFileError(t("investments.import.fileRequired"));
      return;
    }
    if (file.size === 0) {
      setFileError(t("investments.import.fileEmpty"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setFileError(t("investments.import.fileTooLarge"));
      return;
    }
    setFileError(undefined);
    importMutation.mutate(
      { data: { file, accountId, fundingAccountId: funding || null } },
      { onSuccess: () => setUploadKey((key) => key + 1) },
    );
  }

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleImport();
      }}
      className="space-y-4"
    >
      <div className="space-y-1.5">
        <Label htmlFor="broker-upload-funding">{t("investments.import.fundingAccount")}</Label>
        <SelectField
          id="broker-upload-funding"
          value={funding}
          disabled={mutations.busy}
          aria-describedby="broker-upload-funding-hint"
          onChange={setFundingAccountId}
          options={[
            { value: "", label: t("investments.import.noFundingAccount") },
            ...accounts
              .filter((account) => account.id !== accountId)
              .map((account) => ({ value: account.id, label: account.name })),
          ]}
        />
        <p id="broker-upload-funding-hint" className="text-xs text-muted-foreground">
          {t("investments.import.fundingHint")}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="broker-upload-file">{t("investments.import.file")}</Label>
        <FileInput
          key={uploadKey}
          id="broker-upload-file"
          ref={fileInputRef}
          accept=".xml,text/xml,application/xml"
          disabled={mutations.busy}
          onChange={() => setFileError(undefined)}
          placeholder={t("investments.import.chooseFile")}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={
            fileError
              ? "broker-upload-file-hint broker-upload-file-error"
              : "broker-upload-file-hint"
          }
        />
        <p id="broker-upload-file-hint" className="text-xs text-muted-foreground">
          {t("investments.import.fileHint")}
        </p>
        <FieldError id="broker-upload-file-error" message={fileError} />
      </div>

      <div role="status" aria-live="polite">
        {importMutation.isPending ? (
          <p className="text-sm text-muted-foreground">{t("investments.import.uploading")}</p>
        ) : null}
        {!importMutation.isPending && result ? <BrokerImportResult result={result} /> : null}
      </div>
      {failure ? (
        <p className="text-sm wrap-break-word text-expense">
          {failure.detail ?? failure.title ?? t("errors.generic")}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          pending={importMutation.isPending}
          disabled={!accountId || mutations.busy}
        >
          {t("investments.import.submit")}
        </Button>
      </div>
    </form>
  );
}
