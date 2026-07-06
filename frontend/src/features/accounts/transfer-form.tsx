import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { AccountResponse } from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { isPositiveMoney } from "@/lib/validation";
import { todayIsoDate } from "@/features/transactions/transaction-form";

export interface TransferFormValues {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  date: string;
  description: string | null;
}

interface FormValues {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  date: string;
  description: string;
}

interface Props {
  accounts: AccountResponse[];
  pending: boolean;
  onSubmit: (values: TransferFormValues) => void;
  onCancel?: () => void;
}

export function TransferForm({ accounts, pending, onSubmit, onCancel }: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z
    .object({
      fromAccountId: z.string().min(1, t("validation.required")),
      toAccountId: z.string().min(1, t("validation.required")),
      amount: z.string().refine(isPositiveMoney, t("validation.positiveMoney")),
      date: z.string().min(1, t("validation.required")),
      description: z.string(),
    })
    .refine((value) => value.fromAccountId !== value.toAccountId, {
      message: t("transfers.sameAccountError"),
      path: ["toAccountId"],
    });

  const defaultValues: FormValues = {
    fromAccountId: accounts[0]?.id ?? "",
    toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? "",
    amount: "",
    date: todayIsoDate(),
    description: "",
  };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({
        fromAccountId: value.fromAccountId,
        toAccountId: value.toAccountId,
        amount: value.amount,
        date: value.date,
        description: value.description.trim() || null,
      });
      form.reset();
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
      className="grid gap-4 md:grid-cols-5 md:items-start"
    >
      <form.Field name="fromAccountId">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-from">{t("transfers.from")}</Label>
            <Select
              id="transfer-from"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </form.Field>

      <form.Field name="toAccountId">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-to">{t("transfers.to")}</Label>
            <Select
              id="transfer-to"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </Select>
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="amount">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-amount">{t("transactions.amount")}</Label>
            <Input
              id="transfer-amount"
              inputMode="decimal"
              placeholder="0.00"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="date">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="transfer-date">{t("transactions.date")}</Label>
            <Input
              id="transfer-date"
              type="date"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <div className="flex items-end gap-2 md:mt-6">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        ) : null}
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={pending || !canSubmit}>
              {t("transfers.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>

      <form.Field name="description">
        {(field) => (
          <div className="space-y-1.5 md:col-span-5">
            <Label htmlFor="transfer-description">{t("transactions.description")}</Label>
            <Input
              id="transfer-description"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>
    </form>
  );
}
