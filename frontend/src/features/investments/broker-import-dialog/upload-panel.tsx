import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccountResponse } from "@/api/generated/model";
import { FormError } from "@/components/form-error/form-error";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { SelectField } from "@/components/select-field/select-field";
import { Button } from "@/components/ui/button/button";
import { FileInput } from "@/components/ui/file-input/file-input";
import { useFileField } from "@/hooks/use-file-field";
import { namedOptions } from "@/lib/options";
import { BrokerImportResult } from "./import-result";
import type { BrokerImportMutations } from "./use-broker-import-mutations";

const MAX_FILE_BYTES = 20 * 1024 * 1024;

const uploadProblemKeys = {
  required: "investments.import.fileRequired",
  empty: "investments.import.fileEmpty",
  tooLarge: "investments.import.fileTooLarge",
} as const;

export const BROKER_UPLOAD_FILE_INPUT_ID = "broker-upload-file";

interface Props {
  accounts: readonly AccountResponse[];
  accountId: string;
  mutations: BrokerImportMutations;
}

export function UploadPanel({ accounts, accountId, mutations }: Readonly<Props>) {
  const { t } = useTranslation();
  const [fundingAccountId, setFundingAccountId] = useState("");
  const fileField = useFileField(BROKER_UPLOAD_FILE_INPUT_ID, MAX_FILE_BYTES, uploadProblemKeys);

  const importMutation = mutations.importReport;
  const ownsImport = importMutation.variables?.data.accountId === accountId;
  const result = ownsImport ? importMutation.data : undefined;
  const failure = ownsImport ? importMutation.error : null;

  const funding = fundingAccountId === accountId ? "" : fundingAccountId;

  function handleImport() {
    const file = fileField.take();
    if (file) {
      importMutation.mutate(
        { data: { file, accountId, fundingAccountId: funding || null } },
        { onSuccess: fileField.reset },
      );
    }
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

      <FieldShell
        id={BROKER_UPLOAD_FILE_INPUT_ID}
        label={t("investments.import.file")}
        hint={t("investments.import.fileHint")}
        error={fileField.error}
      >
        <FileInput
          key={fileField.key}
          {...fileField.inputProps}
          accept=".xml,text/xml,application/xml"
          disabled={mutations.busy}
          onChange={fileField.clearError}
          placeholder={t("investments.import.chooseFile")}
        />
      </FieldShell>

      <div role="status" aria-live="polite">
        {importMutation.isPending ? (
          <p className="text-sm text-muted-foreground">{t("investments.import.uploading")}</p>
        ) : null}
        {!importMutation.isPending && result ? <BrokerImportResult result={result} /> : null}
      </div>
      <FormError error={failure} />

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
