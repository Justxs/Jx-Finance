import { Plus, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { CategoryResponse, Currency, FlowType } from "@/api/generated/model";
import { defineAppFieldGroup } from "@/components/form";
import { Button } from "@/components/ui/button/button";
import { FieldError } from "@/components/ui/field-error";
import { FormGrid } from "@/components/ui/form-grid/form-grid";
import { useMoney } from "@/hooks/use-formatters";
import { fromCents } from "@/lib/money";
import { namedOptions } from "@/lib/options";
import { EXPENSE_TONE } from "@/lib/tone";
import { cn } from "@/lib/utils";
import { emptyLine, type LineFormValue, type SplitBalance, splitBalance } from "./line-form-value";

const splitLinesFieldGroup = defineAppFieldGroup(({ strict }) => ({
  type: strict<FlowType>(),
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

function SplitLineRow({ fields, categories, index, remaining, onRemove }: Readonly<LineRowProps>) {
  const { t } = useTranslation();

  return (
    <FormGrid>
      <fields.Field name={`lines[${index}].categoryId`}>
        {(field) => (
          <field.SelectFieldControl
            id={`tx-line-${index}-category`}
            kind="search"
            aria-label={t("transactions.lineCategory")}
            options={namedOptions(categories, t("transactions.uncategorized"))}
          />
        )}
      </fields.Field>
      <fields.Field name={`lines[${index}].amount`}>
        {(field) => (
          <div className="space-y-1">
            <field.MoneyInputField
              id={`tx-line-${index}-amount`}
              aria-label={t("transactions.lineAmount")}
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
            aria-label={t("transactions.lineDescription")}
            placeholder={t("transactions.lineDescription")}
          />
        )}
      </fields.Field>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={t("transactions.removeLine")}
        onClick={onRemove}
      >
        <X />
      </Button>
    </FormGrid>
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
                        categories={categories.filter((c) => c.type === typeField.value)}
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
