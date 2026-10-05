import { useTranslation } from "react-i18next";
import { FieldShell } from "@/components/form/field-shell/field-shell";
import { FormActions } from "@/components/form/form-actions/form-actions";
import { Button } from "@/components/ui/button/button";
import { FileInput } from "@/components/ui/file-input/file-input";
import { RuledLine } from "@/components/ui/ruled-line/ruled-line";
import { ScrollRegion } from "@/components/ui/table/table";
import { useFileField } from "@/hooks/use-file-field";
import { BrokerImportStatus } from "./import-result";
import type { BrokerImportMutations } from "./use-broker-import-mutations";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

const uploadProblemKeys = {
  required: "investments.import.fileRequired",
  empty: "investments.import.fileEmpty",
  tooLarge: "investments.import.tradeCsv.tooLarge",
} as const;

export const TRADE_CSV_FILE_INPUT_ID = "trade-csv-file";

const SAMPLE = [
  "Date,Type,Symbol,Quantity,Price,Amount,Fee,Currency",
  "2026-03-02,buy,VWCE,10,110.50,,1.00,EUR",
  "2026-06-20,dividend,VWCE,,,3.20,,EUR",
];

interface Props {
  accountId: string;
  mutations: BrokerImportMutations;
}

export function TradeCsvPanel({ accountId, mutations }: Readonly<Props>) {
  const { t } = useTranslation();
  const fileField = useFileField(TRADE_CSV_FILE_INPUT_ID, MAX_FILE_BYTES, uploadProblemKeys);
  const importMutation = mutations.importTradeCsv;
  const ownsImport = importMutation.variables?.data.accountId === accountId;

  function handleImport() {
    const file = fileField.take();
    if (file) {
      importMutation.mutate({ data: { file, accountId } }, { onSuccess: fileField.reset });
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
      <p className="text-sm text-muted-foreground">{t("investments.import.tradeCsv.intro")}</p>
      <RuledLine>
        <ScrollRegion aria-label={t("investments.import.tradeCsv.sample")}>
          <pre className="font-mono text-xs">{SAMPLE.join("\n")}</pre>
        </ScrollRegion>
      </RuledLine>
      <FieldShell
        id={TRADE_CSV_FILE_INPUT_ID}
        label={t("investments.import.file")}
        hint={t("investments.import.tradeCsv.fileHint")}
        error={fileField.error}
      >
        <FileInput
          key={fileField.key}
          {...fileField.inputProps}
          accept=".csv,.txt,text/csv"
          disabled={mutations.busy}
          onChange={fileField.clearError}
          placeholder={t("investments.import.chooseFile")}
        />
      </FieldShell>

      <BrokerImportStatus
        pending={importMutation.isPending}
        pendingText={t("investments.import.uploading")}
        result={ownsImport ? importMutation.data : undefined}
        error={ownsImport ? importMutation.error : null}
      />

      <FormActions>
        <Button
          type="submit"
          pending={importMutation.isPending}
          disabled={!accountId || mutations.busy}
        >
          {t("investments.import.submit")}
        </Button>
      </FormActions>
    </form>
  );
}
