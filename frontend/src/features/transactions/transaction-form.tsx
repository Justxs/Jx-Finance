import { useForm } from "@tanstack/react-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type {
  AccountResponse,
  CategoryResponse,
  FlowType,
  TransactionResponse,
} from "@/api/generated/model";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { isPositiveMoney } from "@/lib/validation";
import { SplitLinesEditor } from "./split-lines-editor";

export interface TransactionLineFormValues {
  categoryId: string | null;
  amount: string;
  description: string | null;
}

export interface TransactionFormValues {
  accountId: string;
  categoryId: string | null;
  type: FlowType;
  amount: string;
  date: string;
  description: string | null;
  lines: TransactionLineFormValues[] | null;
}

export interface LineFormValue {
  categoryId: string;
  amount: string;
  description: string;
}

export interface FormValues {
  type: FlowType;
  accountId: string;
  categoryId: string;
  amount: string;
  date: string;
  description: string;
  isSplit: boolean;
  lines: LineFormValue[];
}

interface Props {
  accounts: AccountResponse[];
  categories: CategoryResponse[];
  initial?: TransactionResponse;
  pending: boolean;
  onSubmit: (values: TransactionFormValues) => void;
  onCancel?: () => void;
}

export function todayIsoDate() {
  return new Date().toLocaleDateString("en-CA");
}

export function emptyLine(): LineFormValue {
  return { categoryId: "", amount: "", description: "" };
}

export function TransactionForm({
  accounts,
  categories,
  initial,
  pending,
  onSubmit,
  onCancel,
}: Readonly<Props>) {
  const { t } = useTranslation();

  const schema = z
    .object({
      type: z.enum(["income", "expense"]),
      accountId: z.string().min(1, t("validation.required")),
      categoryId: z.string(),
      amount: z.string().refine(isPositiveMoney, t("validation.positiveMoney")),
      date: z.string().min(1, t("validation.required")),
      description: z.string(),
      isSplit: z.boolean(),
      lines: z.array(
        z.object({ categoryId: z.string(), amount: z.string(), description: z.string() }),
      ),
    })
    .superRefine((value, ctx) => {
      if (!value.isSplit) {
        return;
      }

      if (value.lines.length === 0 || !value.lines.every((line) => isPositiveMoney(line.amount))) {
        ctx.addIssue({ code: "custom", message: t("validation.positiveMoney"), path: ["lines"] });
        return;
      }

      if (isPositiveMoney(value.amount)) {
        const sum = value.lines.reduce((total, line) => total + Number(line.amount), 0);
        const total = Number(value.amount);
        if (Math.round((sum - total) * 100) !== 0) {
          ctx.addIssue({
            code: "custom",
            message: t("transactions.splitTotalMismatch", {
              linesTotal: sum.toFixed(2),
              total: value.amount,
            }),
            path: ["lines"],
          });
        }
      }
    });

  const defaultValues: FormValues = {
    type: initial?.type ?? "expense",
    accountId: initial?.accountId ?? accounts[0]?.id ?? "",
    categoryId: initial?.categoryId ?? "",
    amount: initial?.amount ?? "",
    date: initial?.date ?? todayIsoDate(),
    description: initial?.description ?? "",
    isSplit: initial?.isSplit ?? false,
    lines: initial?.lines?.length
      ? initial.lines.map((line) => ({
          categoryId: line.categoryId ?? "",
          amount: line.amount ?? "",
          description: line.description ?? "",
        }))
      : [],
  };

  const form = useForm({
    defaultValues,
    validators: { onChange: schema },
    onSubmit: ({ value }) => {
      onSubmit({
        accountId: value.accountId,
        categoryId: value.isSplit ? null : value.categoryId || null,
        type: value.type,
        amount: value.amount,
        date: value.date,
        description: value.description.trim() || null,
        lines: value.isSplit
          ? value.lines.map((line) => ({
              categoryId: line.categoryId || null,
              amount: line.amount,
              description: line.description.trim() || null,
            }))
          : null,
      });
      if (!initial) {
        form.reset();
      }
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
      className="grid gap-4 md:grid-cols-6 md:items-start"
    >
      <form.Field name="type">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="tx-type">{t("transactions.type")}</Label>
            <Select
              id="tx-type"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => {
                const next = e.target.value as FlowType;
                field.handleChange(next);
                const categoryId = form.getFieldValue("categoryId");
                if (categoryId && !categories.some((c) => c.id === categoryId && c.type === next)) {
                  form.setFieldValue("categoryId", "");
                }
              }}
            >
              <option value="expense">{t("transactions.expense")}</option>
              <option value="income">{t("transactions.income")}</option>
            </Select>
          </div>
        )}
      </form.Field>

      <form.Field name="accountId">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="tx-account">{t("transactions.account")}</Label>
            <Select
              id="tx-account"
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

      <form.Subscribe selector={(state) => state.values.isSplit}>
        {(isSplit) =>
          isSplit ? (
            <div className="space-y-1.5">
              <Label>{t("transactions.category")}</Label>
              <p className="pt-2 text-xs text-muted-foreground">
                {t("transactions.splitTransaction")}
              </p>
            </div>
          ) : (
            <form.Field name="type">
              {(typeField) => (
                <form.Field name="categoryId">
                  {(field) => {
                    const typeCategories = categories.filter(
                      (c) => c.type === typeField.state.value,
                    );
                    return (
                      <div className="space-y-1.5">
                        <Label htmlFor="tx-category">{t("transactions.category")}</Label>
                        <Select
                          id="tx-category"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                        >
                          <option value="">{t("transactions.uncategorized")}</option>
                          {typeCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    );
                  }}
                </form.Field>
              )}
            </form.Field>
          )
        }
      </form.Subscribe>

      <form.Field name="amount">
        {(field) => (
          <div className="space-y-1.5">
            <Label htmlFor="tx-amount">{t("transactions.amount")}</Label>
            <Input
              id="tx-amount"
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
            <Label htmlFor="tx-date">{t("transactions.date")}</Label>
            <Input
              id="tx-date"
              type="date"
              value={field.state.value}
              aria-invalid={field.state.meta.errors.length > 0}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
            <FieldError message={field.state.meta.errors[0]?.message} />
          </div>
        )}
      </form.Field>

      <div className="flex gap-2 pt-6">
        <form.Subscribe selector={(state) => state.canSubmit}>
          {(canSubmit) => (
            <Button type="submit" disabled={pending || !canSubmit} className="flex-1">
              {initial ? t("actions.save") : t("actions.add")}
            </Button>
          )}
        </form.Subscribe>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("actions.cancel")}
          </Button>
        ) : null}
      </div>

      <form.Field name="description">
        {(field) => (
          <div className="space-y-1.5 md:col-span-6">
            <Label htmlFor="tx-description">{t("transactions.description")}</Label>
            <Input
              id="tx-description"
              placeholder={t("transactions.descriptionPlaceholder")}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
            />
          </div>
        )}
      </form.Field>

      <form.Field name="isSplit">
        {(splitField) => (
          <div className="md:col-span-6">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="size-4 rounded border-input accent-primary"
                checked={splitField.state.value}
                onChange={(e) => {
                  const next = e.target.checked;
                  splitField.handleChange(next);
                  if (next && form.getFieldValue("lines").length === 0) {
                    form.setFieldValue("lines", [emptyLine()]);
                  }
                }}
              />
              {t("transactions.splitTransaction")}
            </label>
          </div>
        )}
      </form.Field>

      <SplitLinesEditor form={form} categories={categories} />
    </form>
  );
}
