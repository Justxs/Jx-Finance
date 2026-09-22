import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { FieldError, Hint } from "@/components/ui/field-error";
import { FileInput } from "@/components/ui/file-input/file-input";
import { Label } from "@/components/ui/label/label";
import { namedOptions } from "@/lib/options";
import { BrokerImportFailure } from "./import-failure";
import { BrokerImportResult } from "./import-result";
import type { BrokerImportMutations } from "./use-broker-import-mutations";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const BROKER_UPLOAD_FILE_INPUT_ID = "broker-upload-file";

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
      <FieldShell
        id="broker-upload-funding"
        label={t("investments.import.fundingAccount")}
        hint={t("investments.import.fundingHint")}
      >
        <SelectField
          id="broker-upload-funding"
          value={funding}
          disabled={mutations.busy}
          aria-describedby="broker-upload-funding-hint"
          onChange={setFundingAccountId}
          options={namedOptions(
            accounts.filter((account) => account.id !== accountId),
            t("investments.import.noFundingAccount"),
          )}
        />
      </FieldShell>

      <div className="space-y-1.5">
        <Label htmlFor={BROKER_UPLOAD_FILE_INPUT_ID}>{t("investments.import.file")}</Label>
        <FileInput
          key={uploadKey}
          id={BROKER_UPLOAD_FILE_INPUT_ID}
          ref={fileInputRef}
          accept=".xml,text/xml,application/xml"
          disabled={mutations.busy}
          onChange={() => setFileError(undefined)}
          placeholder={t("investments.import.chooseFile")}
          aria-invalid={fileError ? true : undefined}
          aria-describedby={
            fileError
              ? `${BROKER_UPLOAD_FILE_INPUT_ID}-hint ${BROKER_UPLOAD_FILE_INPUT_ID}-error`
              : `${BROKER_UPLOAD_FILE_INPUT_ID}-hint`
          }
        />
        <Hint id={`${BROKER_UPLOAD_FILE_INPUT_ID}-hint`}>{t("investments.import.fileHint")}</Hint>
        <FieldError id={`${BROKER_UPLOAD_FILE_INPUT_ID}-error`} message={fileError} />
      </div>

      <div role="status" aria-live="polite">
        {importMutation.isPending ? (
          <p className="text-sm text-muted-foreground">{t("investments.import.uploading")}</p>
        ) : null}
        {!importMutation.isPending && result ? <BrokerImportResult result={result} /> : null}
      </div>
      <BrokerImportFailure error={failure} />

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
