import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { useCreateRecurringBillEndpoint } from "@/api/generated";
import type {
  AccountResponse,
  CategoryResponse,
  RecurringBillCadence,
  RecurringBillKind,
} from "@/api/generated/model";
import { SelectField } from "@/components/select-field";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToday } from "@/hooks/use-settings";
import { isPositiveMoney } from "@/lib/validation";

interface FormValues {
  name: string;
  kind: RecurringBillKind;
  amount: string;
  categoryId: string;
  accountId: string;
  cadence: RecurringBillCadence;
  nextDueDate: string;
  remindDaysBefore: string;
}

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  onCreated: () => void;
  onCancel: () => void;
}

export function CreateRecurringBillForm({
  accounts,
  categories,
  onCreated,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const today = useToday();
  const expenseCategories = categories.filter((c) => c.type === "expense");

  const schema = z
    .object({
      name: z
        .string()
        .refine((value) => value.trim().length > 0, t("validation.required"))
        .refine((value) => value.trim().length <= 100, t("validation.maxLength", { max: 100 })),
      kind: z.enum(["fixed", "variable"]),
      amount: z.string(),
      categoryId: z.string(),
      accountId: z.string(),
      cadence: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
      nextDueDate: z.string().min(1, t("validation.required")),
      remindDaysBefore: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 0),
    })
    .superRefine((value, ctx) => {
      if (value.kind === "fixed" && !isPositiveMoney(value.amount)) {
        ctx.addIssue({ code: "custom", message: t("validation.positiveMoney"), path: ["amount"] });
      }
    });

  const createMutation = useCreateRecurringBillEndpoint({ mutation: { onSuccess: onCreated } });

  const defaultValues: FormValues = {
    name: "",
    kind: "fixed",
    amount: "",
    categoryId: "",
    accountId: "",
    cadence: "monthly",
    nextDueDate: today,
    remindDaysBefore: "3",
  };

  const form = useForm({
    defaultValues,
    validators: [{ run: schema, triggers: ["change"] }],
    onSubmit: ({ value }) => {
      createMutation.mutate({
        data: {
          name: value.name.trim(),
          kind: value.kind,
          amount: value.kind === "fixed" ? value.amount : null,
          categoryId: value.categoryId || null,
          accountId: value.accountId || null,
          cadence: value.cadence,
          nextDueDate: value.nextDueDate,
          remindDaysBefore: Number(value.remindDaysBefore),
        },
      });
    },
  });

  if (accounts.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("recurringBills.needAccount")}</p>;
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
      noValidate
      className="form-grid"
    >
      <form.Field name="name">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="bill-name">{t("recurringBills.name")}</Label>
            <Input
              id="bill-name"
              placeholder={t("recurringBills.namePlaceholder")}
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "bill-name-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="bill-name-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="kind">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="bill-kind">{t("recurringBills.kind")}</Label>
            <SelectField
              id="bill-kind"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={(value) => field.handleChange(value)}
              options={[
                { value: "fixed", label: t("recurringBills.kinds.fixed") },
                { value: "variable", label: t("recurringBills.kinds.variable") },
              ]}
            />
          </div>
        )}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.kind}>
        {(kind) => (
          <form.Field name="amount">
            {(field) =>
              kind === "fixed" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="bill-amount">{t("recurringBills.amount")}</Label>
                  <Input
                    id="bill-amount"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={field.value}
                    aria-invalid={field.errors.length > 0}
                    aria-describedby={field.errors.length > 0 ? "bill-amount-error" : undefined}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <FieldError id="bill-amount-error" message={field.errors[0]?.message} />
                </div>
              ) : (
                <p className="pt-6 text-xs text-muted-foreground">
                  {t("recurringBills.variableAmountHint")}
                </p>
              )
            }
          </form.Field>
        )}
      </form.Subscribe>

      <form.Field name="cadence">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="bill-cadence">{t("recurringBills.cadence")}</Label>
            <SelectField
              id="bill-cadence"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={(value) => field.handleChange(value)}
              options={[
                { value: "weekly", label: t("recurringBills.cadences.weekly") },
                { value: "monthly", label: t("recurringBills.cadences.monthly") },
                { value: "quarterly", label: t("recurringBills.cadences.quarterly") },
                { value: "yearly", label: t("recurringBills.cadences.yearly") },
              ]}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="categoryId">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="bill-category">{t("recurringBills.category")}</Label>
            <SelectField
              id="bill-category"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={(value) => field.handleChange(value)}
              options={[
                { value: "", label: t("recurringBills.noCategory") },
                ...expenseCategories.map((category) => ({
                  value: category.id,
                  label: category.name,
                })),
              ]}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="accountId">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="bill-account">{t("recurringBills.account")}</Label>
            <SelectField
              id="bill-account"
              value={field.value}
              onBlur={field.handleBlur}
              onChange={(value) => field.handleChange(value)}
              options={[
                { value: "", label: t("recurringBills.noAccount") },
                ...accounts.map((account) => ({ value: account.id, label: account.name })),
              ]}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="nextDueDate">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="bill-due-date">{t("recurringBills.nextDueDate")}</Label>
            <DatePicker
              id="bill-due-date"
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "bill-due-date-error" : undefined}
              onBlur={field.handleBlur}
              onChange={field.handleChange}
            />
            <FieldError id="bill-due-date-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <form.Field name="remindDaysBefore">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="bill-remind">{t("recurringBills.remindDaysBefore")}</Label>
            <Input
              id="bill-remind"
              type="number"
              min={0}
              value={field.value}
              aria-invalid={field.errors.length > 0}
              aria-describedby={field.errors.length > 0 ? "bill-remind-error" : undefined}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError id="bill-remind-error" message={field.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <div className="col-span-full flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("actions.cancel")}
        </Button>
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" pending={createMutation.isPending} disabled={!canSubmit}>
              {t("recurringBills.add")}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
