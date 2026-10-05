import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, Currency } from "@/api/generated/model";
import { defineAppFieldGroup } from "@/components/form";
import { Button } from "@/components/ui/button/button";
import { FieldError } from "@/components/ui/field-error";
import { useMoney } from "@/hooks/use-formatters";
import { fromCents } from "@/lib/money";
import { namedOptions } from "@/lib/options";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { emptyLine, type LineFormValue, type SplitBalance, splitBalance } from "./line-form-value";
import { type TransactionFormType, categoryTypeOf } from "./transaction-schema";

const splitLinesFieldGroup = defineAppFieldGroup(({ strict }) => ({
  type: strict<TransactionFormType>(),
  amount: strict<string>(),
  currency: strict<Currency>(),
  isSplit: strict<boolean>(),
  lines: strict<LineFormValue[]>(),
}));

type SplitLinesFields = typeof splitLinesFieldGroup.fields;

interface Props {
  fields: SplitLinesFields;
  categories: CategoryResponse[];
}

interface LineRowProps {
  fields: SplitLinesFields;
  categories: CategoryResponse[];
  index: number;
  remaining: { value: string; label: string } | null;
  onRemove: () => void;
}

interface SummaryProps {
  balance: SplitBalance;
  currency: Currency;
}

function SplitSummary({ balance, currency }: Readonly<SummaryProps>) {
  const { t } = useTranslation();
  const money = useMoney();
  const { totalCents, assignedCents, remainingCents } = balance;

  let status = t("transactions.splitBalanced");
  if (remainingCents > 0) {
    status = t("transactions.splitRemaining", {
      amount: money.format(remainingCents / 100, currency),
    });
  } else if (remainingCents < 0) {
    status = t("transactions.splitOver", { amount: money.format(-remainingCents / 100, currency) });
  }

  return (
    <p className="flex flex-wrap gap-x-2 text-sm text-muted-foreground tabular-nums">
      <span>
        {t("transactions.splitSummary", {
          total: money.format(totalCents / 100, currency),
          assigned: money.format(assignedCents / 100, currency),
        })}
      </span>
      <span className={cn("font-medium", remainingCents < 0 ? EXPENSE_TONE : "text-foreground")}>
        {status}
      </span>
    </p>
  );
}

const lineGridClass =
  "grid grid-cols-[minmax(0,1fr)_7rem_auto] items-start gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_8rem_minmax(0,1fr)_auto] [&>*]:min-w-0";

function SplitLineHeader() {
  const { t } = useTranslation();

  return (
    <div aria-hidden="true" className={cn(lineGridClass, "text-sm leading-5 font-medium")}>
      <span>{t("transactions.lineCategory")}</span>
      <span>{t("transactions.lineAmount")}</span>
      <span className="hidden sm:block">{t("transactions.lineDescription")}</span>
      <span className="w-9 pointer-coarse:w-11" />
    </div>
  );
}

function SplitLineRow({ fields, categories, index, remaining, onRemove }: Readonly<LineRowProps>) {
  const { t } = useTranslation();
  const number = index + 1;

  return (
    <div className={lineGridClass}>
      <fields.Field name={`lines[${index}].categoryId`}>
        {(field) => (
          <field.SelectFieldControl
            id={`tx-line-${index}-category`}
            kind="search"
            aria-label={t("transactions.lineField", {
              field: t("transactions.lineCategory"),
              number,
            })}
            options={namedOptions(categories, t("transactions.uncategorized"))}
          />
        )}
      </fields.Field>
      <fields.Field name={`lines[${index}].amount`}>
        {(field) => (
          <div className="space-y-1">
            <field.MoneyInputField
              id={`tx-line-${index}-amount`}
              aria-label={t("transactions.lineField", {
                field: t("transactions.lineAmount"),
                number,
              })}
            />
            {remaining && field.value.trim() === "" ? (
              <Button
                type="button"
                variant="link"
                size="inline"
                onClick={() => field.handleChange(remaining.value)}
              >
                {remaining.label}
              </Button>
            ) : null}
          </div>
        )}
      </fields.Field>
      <fields.Field name={`lines[${index}].description`}>
        {(field) => (
          <field.TextField
            id={`tx-line-${index}-description`}
            className="col-span-2 sm:col-span-1"
            aria-label={t("transactions.lineField", {
              field: t("transactions.lineDescription"),
              number,
            })}
            placeholder={t("transactions.lineDescription")}
          />
        )}
      </fields.Field>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("transactions.removeLine", { number })}
        className="col-start-3 row-start-1 sm:col-start-4"
        onClick={onRemove}
      >
        <X />
      </Button>
    </div>
  );
}

interface ListProps extends Props {
  amount: string;
  currency: Currency;
}

function SplitLineList({ fields, categories, amount, currency }: Readonly<ListProps>) {
  const { t } = useTranslation();
  const money = useMoney();

  return (
    <fields.ArrayField name="lines">
      {(linesField) => (
        <fields.Field name="lines">
          {(valuesField) => {
            const balance = splitBalance(amount, valuesField.value);
            const remaining =
              balance && balance.remainingCents > 0
                ? {
                    value: fromCents(balance.remainingCents),
                    label: t("transactions.useRemaining", {
                      amount: money.format(balance.remainingCents / 100, currency),
                    }),
                  }
                : null;

            return (
              <div className="col-span-full space-y-3">
                {balance ? <SplitSummary balance={balance} currency={currency} /> : null}
                <FieldError message={valuesField.errors[0]?.message} />
                {valuesField.value.length > 0 ? <SplitLineHeader /> : null}
                {valuesField.value.map((line, index) => (
                  <SplitLineRow
                    key={line.id}
                    fields={fields}
                    categories={categories}
                    index={index}
                    remaining={remaining}
                    onRemove={() => linesField.removeValue(index)}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => linesField.pushValue(emptyLine())}
                >
                  <Plus />
                  {t("transactions.addLine")}
                </Button>
              </div>
            );
          }}
        </fields.Field>
      )}
    </fields.ArrayField>
  );
}

function SplitLinesGroup({ fields, categories }: Readonly<Props>) {
  return (
    <fields.Field name="isSplit">
      {(splitField) =>
        splitField.value ? (
          <fields.Field name="type">
            {(typeField) => (
              <fields.Field name="amount">
                {(amountField) => (
                  <fields.Field name="currency">
                    {(currencyField) => (
                      <SplitLineList
                        fields={fields}
                        categories={categories.filter(
                          (c) => c.type === categoryTypeOf(typeField.value),
                        )}
                        amount={amountField.value}
                        currency={currencyField.value}
                      />
                    )}
                  </fields.Field>
                )}
              </fields.Field>
            )}
          </fields.Field>
        ) : null
      }
    </fields.Field>
  );
}

export const SplitLinesEditor = splitLinesFieldGroup.bindComponent(SplitLinesGroup, "fields");
