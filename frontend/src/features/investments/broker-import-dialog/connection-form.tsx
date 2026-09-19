import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type {
  AccountResponse,
  BrokerConnectionResponse,
  SaveBrokerConnectionRequest,
} from "@/api/generated/model";
import { useAppForm } from "@/components/form";
import { submitToServer } from "@/lib/form-server-errors";

interface FormValues {
  queryId: string;
  token: string;
  fundingAccountId: string;
  isEnabled: boolean;
}

interface Props {
  accounts: readonly AccountResponse[];
  accountId: string;
  connection?: BrokerConnectionResponse;
  pending: boolean;
  disabled?: boolean;
  onSubmit: (values: SaveBrokerConnectionRequest) => Promise<unknown> | void;
  secondaryActions?: ReactNode;
}

function trimmed(value: string) {
  return value.trim();
}

export function ConnectionForm({
  accounts,
  accountId,
  connection,
  pending,
  disabled = false,
  onSubmit,
  secondaryActions,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const stored = connection !== undefined;

  const schema = z.object({
    queryId: z.string().regex(/^\d{1,20}$/, t("investments.connection.queryIdError")),
    token: z
      .string()
      .refine(
        (value) => (stored && value === "") || /^\d{6,64}$/.test(value),
        t("investments.connection.tokenError"),
      ),
    fundingAccountId: z.string(),
    isEnabled: z.boolean(),
  });

  const defaultValues: FormValues = {
    queryId: connection?.queryId ?? "",
    token: "",
    fundingAccountId: connection?.fundingAccountId ?? "",
    isEnabled: connection?.isEnabled ?? true,
  };

  const form = useAppForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: (submission) => {
      const { value } = submission;

      return submitToServer(submission, () =>
        onSubmit({
          queryId: value.queryId,
          token: value.token === "" ? null : value.token,
          fundingAccountId: value.fundingAccountId || null,
          isEnabled: value.isEnabled,
        }),
      );
    },
  });

  return (
    <form.AppForm>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
        noValidate
        autoComplete="off"
        className="form-grid"
      >
        <form.Field name="queryId">
          {(field) => (
            <field.TextField
              id="broker-query-id"
              label={t("investments.connection.queryId")}
              inputMode="numeric"
              autoComplete="off"
              parse={trimmed}
            />
          )}
        </form.Field>

        <form.Field name="token">
          {(field) => (
            <field.TextField
              id="broker-token"
              label={t("investments.connection.token")}
              hint={t("investments.connection.tokenHint")}
              type="password"
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
              data-form-type="other"
              placeholder={stored ? t("investments.connection.tokenStored") : undefined}
              parse={trimmed}
            />
          )}
        </form.Field>

        <form.Field name="fundingAccountId">
          {(field) => (
            <field.SelectFieldControl
              id="broker-funding"
              label={t("investments.import.fundingAccount")}
              hint={t("investments.import.fundingHint")}
              className="col-span-full"
              options={[
                { value: "", label: t("investments.import.noFundingAccount") },
                ...accounts
                  .filter((account) => account.id !== accountId)
                  .map((account) => ({ value: account.id, label: account.name })),
              ]}
            />
          )}
        </form.Field>

        <form.Field name="isEnabled">
          {(field) => (
            <field.CheckboxField
              id="broker-enabled"
              label={t("investments.connection.syncDaily")}
              hint={t("investments.connection.syncDailyHint")}
              className="col-span-full"
            />
          )}
        </form.Field>

        <div className="col-span-full flex flex-wrap items-center justify-end gap-2 pt-2">
          {secondaryActions}
          <form.SubmitButton pending={pending} disabled={disabled}>
            {t("actions.save")}
          </form.SubmitButton>
        </div>
      </form>
    </form.AppForm>
  );
}
