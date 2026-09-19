import { useForm } from "@tanstack/react-form";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type {
  AccountResponse,
  BrokerConnectionResponse,
  SaveBrokerConnectionRequest,
} from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  onSubmit: (values: SaveBrokerConnectionRequest) => void;
  secondaryActions?: ReactNode;
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

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      onSubmit({
        queryId: value.queryId,
        token: value.token === "" ? null : value.token,
        fundingAccountId: value.fundingAccountId || null,
        isEnabled: value.isEnabled,
      });
    },
  });

  return (
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
          <div className="space-y-1.5">
            <Label htmlFor="broker-query-id">{t("investments.connection.queryId")}</Label>
            <Input
              id="broker-query-id"
              inputMode="numeric"
              autoComplete="off"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "broker-query-id-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value.trim())}
            />
            <FieldError id="broker-query-id-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="token">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="broker-token">{t("investments.connection.token")}</Label>
            <Input
              id="broker-token"
              type="password"
              autoComplete="new-password"
              data-1p-ignore
              data-lpignore="true"
              data-bwignore
              data-form-type="other"
              placeholder={stored ? t("investments.connection.tokenStored") : undefined}
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={
                field.errors.length > 0 ? "broker-token-error" : "broker-token-hint"
              }
              onBlur={field.handleBlur}
              onChange={(event) => field.handleChange(event.target.value.trim())}
            />
            <p id="broker-token-hint" className="text-xs text-muted-foreground">
              {t("investments.connection.tokenHint")}
            </p>
            <FieldError id="broker-token-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="fundingAccountId">
        {(field) => (
          <div className="col-span-full space-y-1.5">
            <Label htmlFor="broker-funding">{t("investments.import.fundingAccount")}</Label>
            <SelectField
              id="broker-funding"
              value={field.value}
              aria-describedby="broker-funding-hint"
              onBlur={field.handleBlur}
              onChange={field.handleChange}
              options={[
                { value: "", label: t("investments.import.noFundingAccount") },
                ...accounts
                  .filter((account) => account.id !== accountId)
                  .map((account) => ({ value: account.id, label: account.name })),
              ]}
            />
            <p id="broker-funding-hint" className="text-xs text-muted-foreground">
              {t("investments.import.fundingHint")}
            </p>
          </div>
        )}
      </form.Field>

      <form.Field name="isEnabled">
        {(field) => (
          <div className="col-span-full">
            <label className="flex items-center gap-3 text-sm font-medium">
              <Checkbox
                checked={field.value}
                aria-describedby="broker-enabled-hint"
                onCheckedChange={(next) => field.handleChange(next)}
              />
              {t("investments.connection.syncDaily")}
            </label>
            <p id="broker-enabled-hint" className="mt-0.5 pl-7 text-xs text-muted-foreground">
              {t("investments.connection.syncDailyHint")}
            </p>
          </div>
        )}
      </form.Field>

      <div className="col-span-full flex flex-wrap items-center justify-end gap-2 pt-2">
        {secondaryActions}
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={pending} disabled={!canSubmit || disabled}>
              {t("actions.save")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
